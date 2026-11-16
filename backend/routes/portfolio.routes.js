import express from "express";
import {
    generatePortfolio,
    getPublicPortfolio,
    getPortfolio,
    updatePortfolio,
    roastPortfolio,
    roastPublicPortfolio,
    analyzePublicPortfolioRepository
} from "../controllers/portfolio.controller.js";

import { authenticate } from "../middlewares/auth.middleware.js";

const router = express.Router();

router.post("/generate", authenticate, generatePortfolio);
router.get("/roast", authenticate, roastPortfolio)
router.post("/:slug/repositories/:id/analyze", analyzePublicPortfolioRepository);
router.post("/:slug/roast", roastPublicPortfolio);
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
router.get("/:slug", getPublicPortfolio);
export default router;
