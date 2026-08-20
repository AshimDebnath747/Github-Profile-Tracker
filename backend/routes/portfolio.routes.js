import express from "express";
import {
    generatePortfolio,
    getPublicPortfolio,
    getPortfolio,
    updatePortfolio
} from "../controllers/portfolio.controller.js";

import { authenticate } from "../middlewares/auth.middleware.js";

const router = express.Router();

router.post("/generate", authenticate, generatePortfolio);
router.get("/:slug", getPublicPortfolio);

router.patch(
    "/",
    authenticate,
    updatePortfolio
);

router.get(
    "/",
    authenticate,
    getPortfolio
);

export default router;