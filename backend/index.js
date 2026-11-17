import express from "express";
import dotenv from "dotenv";
import cors from "cors";
import cookieParser from "cookie-parser";

// Routes
import authRoutes from "./routes/auth.routes.js";
// import studentRoutes from "./routes/student.routes.js";
import githubRoutes from "./routes/github.routes.js";
import portfolioRoutes from "./routes/portfolio.routes.js";
import dashboardRouter from "./routes/dashboard.routes.js";
import { createProxyMiddleware } from "http-proxy-middleware";
// import jobsRoutes from "./routes/jobs.routes.js";

// Load environment variables
dotenv.config();



const app = express();
const PORT = process.env.PORT || 5000;


/* ----------------------------- Middlewares ----------------------------- */
const BACKEND_URL = process.env.APP_URL;
const FRONTEND_URL = process.env.FRONTEND_URL;
app.set("trust proxy", 1);
app.use(
    cors({
        origin: process.env.FRONTEND_URL,
        credentials: true,
    })
);
app.use(
    "/api",
    createProxyMiddleware({
        target: BACKEND_URL,
        changeOrigin: true,
        pathRewrite: (path) => `/api${path}`,
        on: {
            proxyReq: (proxyReq, req) => {
                console.log("API:", req.originalUrl, "->", BACKEND_URL);
            },
            error: (err, req, res) => {
                console.error("API proxy error:", err.message);
                if (!res.headersSent) {
                    res.status(502).json({ message: "Backend proxy failed" });
                }
            },
        },
    })
);

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


// Everything else goes to React frontend
app.use(
    "/",
    createProxyMiddleware({
        target: FRONTEND_URL,
        changeOrigin: true,
    })
);
app.use(express.json());
app.use(express.urlencoded({ extended: true }));
app.use(cookieParser());

/* ------------------------------ Health Check ------------------------------ */

app.get("/", (req, res) => {
    res.json({
        success: true,
        message: "Campus Portfolio Verifier API",
        version: "1.0.0",
    });
});

/* -------------------------------- Routes -------------------------------- */

app.use("/api/auth", authRoutes);
// app.use("/api/student", studentRoutes);
app.use("/api/github", githubRoutes);
app.use("/api/portfolio", portfolioRoutes);
app.use("/api/dashboard", dashboardRouter);
// app.use("/api/jobs", jobsRoutes);

/* ---------------------------- 404 Middleware ---------------------------- */

app.use((req, res) => {
    res.status(404).json({
        success: false,
        message: "Route not found",
    });
});

/* -------------------------- Global Error Handler ------------------------- */

app.use((err, req, res, next) => {
    console.error(err);

    res.status(err.status || 500).json({
        success: false,
        message: err.message || "Internal Server Error",
    });
});

/* ------------------------------ Start Server ----------------------------- */

app.listen(PORT, () => {
    console.log(`🚀 Server running on http://localhost:${PORT}`);
});