import express from "express";
import {
    githubLogin,
    githubCallback,
    getCurrentUser,
    logout,

} from "../controllers/auth.controller.js";

import { authenticate } from "../middlewares/auth.middleware.js";

const router = express.Router();

/**
 * Redirect user to GitHub OAuth
 * GET /api/auth/github
 */
router.get("/github", githubLogin);

/**
 * GitHub redirects here after authorization
 * GET /api/auth/github/callback
 */
router.get("/github/callback", githubCallback);

/**
 * Get logged-in user's profile
 * GET /api/auth/me
 */
router.get("/me", authenticate, getCurrentUser);

/**
 * Logout
 * POST /api/auth/logout
 */
router.post("/logout", authenticate, logout);

export default router;
