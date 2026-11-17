
import express from "express";
import dotenv from "dotenv";
import { createProxyMiddleware } from "http-proxy-middleware";

dotenv.config();

const app = express();
const PORT = process.env.PORT || 10000;

const BACKEND_URL = process.env.APP_URL;
const FRONTEND_URL = process.env.FRONTEND_URL;

if (!BACKEND_URL || !FRONTEND_URL) {
    throw new Error("Missing APP_URL or FRONTEND_URL");
}

app.get("/health", (req, res) => {
    res.json({ status: "Proxy is running" });
});

// Forward API requests to backend
app.use(
    "/api",
    createProxyMiddleware({
        target: BACKEND_URL,
        changeOrigin: true,
        pathRewrite: (path) => `/api${path}`,
        on: {
            proxyReq: (proxyReq, req) => {
                console.log("API:", req.originalUrl);
            },
            error: (err, req, res) => {
                console.error("Backend proxy error:", err.message);
                if (!res.headersSent) {
                    res.status(502).json({ message: "Backend unavailable" });
                }
            }
        }
    })
);

// Forward everything else to frontend
app.use(
    "/",
    createProxyMiddleware({
        target: FRONTEND_URL,
        changeOrigin: true,
        on: {
            proxyReq: (proxyReq, req) => {
                console.log("Frontend:", req.originalUrl);
            },
            error: (err, req, res) => {
                console.error("Frontend proxy error:", err.message);
                if (!res.headersSent) {
                    res.status(502).send("Frontend unavailable");
                }
            }
        }
    })
);

app.listen(PORT, "0.0.0.0", () => {
    console.log(`Proxy running on port ${PORT}`);
});
