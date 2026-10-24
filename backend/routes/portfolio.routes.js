import express from "express";
import {
    generatePortfolio,
    getPublicPortfolio,
    getPortfolio,
    updatePortfolio,
    roastPortfolio,
    chatPortfolio
} from "../controllers/portfolio.controller.js";

import { authenticate } from "../middlewares/auth.middleware.js";

const router = express.Router();

router.post("/generate", authenticate, generatePortfolio);
router.post("/chat", authenticate, chatPortfolio);
router.get("/roast", authenticate, roastPortfolio)
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