
import express from "express";
import dotenv from "dotenv";
import { createProxyMiddleware } from "http-proxy-middleware";

dotenv.config();

const app = express();
const PORT = process.env.PORT || 10000;

const BACKEND_URL = process.env.APP_URL;
const FRONTEND_URL = process.env.FRONTEND_URL;

if (!BACKEND_URL || !FRONTEND_URL) {
    throw new Error("APP_URL and FRONTEND_URL must be configured");
}

app.set("trust proxy", 1);

// Health check
app.get("/health", (req, res) => {
    res.json({ status: "Proxy is running" });
});

// API requests -> Backend
app.use(
    "/api",
    createProxyMiddleware({
        target: BACKEND_URL,
        changeOrigin: true,

        // Express strips /api when middleware is mounted at /api.
        pathRewrite: (path) => `/api${path}`,

        on: {
            proxyReq: (proxyReq, req) => {
                console.log("API:", req.originalUrl, "->", BACKEND_URL);
            },
            error: (err, req, res) => {
                console.error("API proxy error:", err.message);

                if (!res.headersSent) {
                    res.status(502).json({
                        success: false,
                        message: "Backend proxy failed",
                    });
                }
            },
        },
    })
);

// All other requests -> React frontend
app.use(
    "/",
    createProxyMiddleware({
        target: FRONTEND_URL,
        changeOrigin: true,
        on: {
            proxyReq: (proxyReq, req) => {
                console.log("Frontend:", req.originalUrl, "->", FRONTEND_URL);
            },
            error: (err, req, res) => {
                console.error("Frontend proxy error:", err.message);

                if (!res.headersSent) {
                    res.status(502).send("Frontend proxy failed");
                }
            },
        },
    })
);

app.listen(PORT, "0.0.0.0", () => {
    console.log(`Proxy running on port ${PORT}`);
});
