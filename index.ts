import dotenv from "dotenv";
import http from "http";
import httpProxy from "http-proxy";
import https from "https";
import selfsigned from "selfsigned";

// Load environment variables from .env file
dotenv.config();

const TARGET_URL = process.env.TARGET_URL || "https://example.com";
const LOCAL_PORT = parseInt(process.env.LOCAL_PORT || "3333", 10);
const ENABLE_PROXY_SSL = process.env.ENABLE_PROXY_SSL === "true";

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
