# Proxy Server

This is a Node.js application that creates a proxy server to divert traffic to a target URL. It uses the following dependencies:

- dotenv
- http
- http-proxy
- https
- selfsigned

## Installation

1. Clone the repository.
2. Run `npm install` to install the dependencies.
3. Create a `.env` file in the root directory and add the following environment variables:

```env
TARGET_URL=https://example.com
LOCAL_PORT=3333
ENABLE_PROXY_SSL=false
```

4. Run `npm start` to start the server.

## Usage

The server listens on the port specified in the `LOCAL_PORT` environment variable. When a request is received, it diverts the traffic to the URL specified in the `TARGET_URL` environment variable.

If `ENABLE_PROXY_SSL` is set to `true`, the server will use a self-signed SSL certificate.

## License

This project is licensed under the MIT License. See the `LICENSE` file for details.
