import express from "express";
import {
    generatePortfolio,
    getPublicPortfolio
} from "../controllers/portfolio.controller.js";

import { authenticate } from "../middlewares/auth.middleware.js";

const router = express.Router();

router.post("/generate", authenticate, generatePortfolio);
router.get("/:slug", getPublicPortfolio);

export default router;