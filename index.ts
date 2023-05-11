// Import required libraries
import http from "http";
import httpProxy from "http-proxy";
import dotenv from "dotenv";

// Load environment variables from .env file
dotenv.config();

const TARGET_URL =
  process.env.TARGET_URL || "https://andi.dev.maersk-digital.net";
const LOCAL_PORT = parseInt(process.env.LOCAL_PORT || "3333", 10);

// Create a proxy server
const proxy = httpProxy.createProxyServer({
  target: TARGET_URL,
  changeOrigin: true,
  secure: false,
});

// Create an HTTP server and attach the proxy server to it
const server = http.createServer((req, res) => {
  proxy.web(req, res);
});

server.listen(LOCAL_PORT, () => {
  console.log(
    `Proxy server listening on port ${LOCAL_PORT}, diverting traffic to ${TARGET_URL}`
  );
});
