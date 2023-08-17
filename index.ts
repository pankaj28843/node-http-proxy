import dotenv from "dotenv";
import fs from "fs";
import http from "http";
import httpProxy from "http-proxy";
import https from "https";
import jwt from "jsonwebtoken";
import selfsigned from "selfsigned";

// Load environment variables from .env file
dotenv.config();

const TARGET_URL = process.env.TARGET_URL || "https://example.com";
const LOCAL_PORT = parseInt(process.env.LOCAL_PORT || "3333", 10);
const ENABLE_PROXY_SSL = process.env.ENABLE_PROXY_SSL === "true";
const AUTHORIZATION_HEADER_FILE = process.env.AUTHORIZATION_HEADER_FILE || null;
const DEBUG = process.env.DEBUG === "true";

const getJwtExpiry = (token: string): Date => {
  const expiryDate = new Date(0);
  const decoded = jwt.decode(token, { complete: true });
  if (!decoded) {
    return expiryDate;
  }
  const expiryInSeconds = (decoded.payload as jwt.JwtPayload).exp || 0;
  expiryDate.setUTCSeconds(expiryInSeconds);
  return expiryDate;
};

// time based cache for authorization header
let authorizationHeaderCache: string | null = null;
let authorizationHeaderCacheExpiry: Date = new Date(0);

const getAuthorizationHeader = (): string | null => {
  // check if cache is valid
  if (authorizationHeaderCache && authorizationHeaderCacheExpiry > new Date()) {
    return authorizationHeaderCache;
  }

  if (!AUTHORIZATION_HEADER_FILE) {
    return null;
  }

  // Read authorization header from file
  // extract the header from line which is: `proxy_set_header Authorization "Bearer $token";`
  const file: string = fs.readFileSync(AUTHORIZATION_HEADER_FILE, "utf8");
  const lines = file.split("\n");
  const line = lines.find((line) => line.includes("proxy_set_header"));
  if (!line) {
    return null;
  }
  const authorizationHeader = line.split('"')[1];
  const token = authorizationHeader.split(" ")[1].trim();
  if (!token) {
    return null;
  }

  // check if token is expired
  const expiryDate = getJwtExpiry(token);
  if (expiryDate < new Date()) {
    return null;
  }

  // update cache
  authorizationHeaderCache = authorizationHeader;
  authorizationHeaderCacheExpiry = expiryDate;

  return authorizationHeader;
};

// Create a proxy server
const proxy = httpProxy.createProxyServer({
  target: TARGET_URL,
  changeOrigin: true,
  secure: false,
  headers: {
    host: new URL(TARGET_URL).host,
    origin: new URL(TARGET_URL).origin,
  },
});

proxy.on("error", function (err, req, res) {
  console.log(err);
});

proxy.on("proxyReq", function (proxyReq, req, res, options) {
  console.log(`[${new Date().toISOString()}] ${req.method} ${req.url}`);
  if (DEBUG) {
    const contentType = proxyReq.getHeader("Content-Type");

    if (contentType === "application/json") {
      (async () => {
        const chunks: any[] = [];
        for await (const chunk of req) {
          chunks.push(chunk);
        }

        const body = Buffer.concat(chunks).toString().trim();
        if (body) {
          console.log(body);
        }
      })();
    }
  }
  const authorizationHeader = getAuthorizationHeader();
  if (authorizationHeader) {
    proxyReq.setHeader("Authorization", authorizationHeader);
  }
});

proxy.on("proxyRes", function (proxyRes, req, res) {
  if (req.method === "OPTIONS") {
    res.writeHead(204, {
      "Access-Control-Allow-Origin": "*",
      "Access-Control-Allow-Credentials": "true",
      "Access-Control-Allow-Headers":
        "Authorization,Accept,Origin,DNT,X-CustomHeader,Keep-Alive,User-Agent,X-Requested-With,If-Modified-Since,Cache-Control,Content-Type,Content-Range,Range",
      "Access-Control-Allow-Methods": "GET,POST,OPTIONS,PUT,DELETE,PATCH",
      "Access-Control-Max-Age": 1728000,
      "Content-Type": "text/plain charset=UTF-8",
      "Content-Length": 0,
    });
  } else {
    res.setHeader("Access-Control-Allow-Origin", "*");
    res.setHeader("Access-Control-Allow-Credentials", "true");
    res.setHeader(
      "Access-Control-Allow-Headers",
      "Authorization,Accept,Origin,DNT,X-CustomHeader,Keep-Alive,User-Agent,X-Requested-With,If-Modified-Since,Cache-Control,Content-Type,Content-Range,Range"
    );
    res.setHeader(
      "Access-Control-Allow-Methods",
      "GET,POST,OPTIONS,PUT,DELETE,PATCH"
    );
  }
});

const createHTTPServer = () => {
  if (ENABLE_PROXY_SSL) {
    const pems = selfsigned.generate(
      [{ name: "commonName", value: "localhost" }],
      {
        days: 365,
      }
    );

    const sslOptions = {
      key: pems.private,
      cert: pems.cert,
    };

    return https.createServer({ ...sslOptions }, (req, res) =>
      proxy.web(req, res)
    );
  } else {
    return http.createServer((req, res) => proxy.web(req, res));
  }
};

// Create an HTTP server and attach the proxy server to it
const server = createHTTPServer();

server.listen(LOCAL_PORT, () => {
  console.log(
    `Proxy server listening on port ${LOCAL_PORT}, diverting traffic to ${TARGET_URL}`
  );
});
