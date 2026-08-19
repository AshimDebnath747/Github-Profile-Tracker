import express from "express";
import {
    syncRepositories,
    getRepositories,
    toggleRepository,
    analyzeRepository
} from "../controllers/github.controller.js";

import { authenticate } from "../middlewares/auth.middleware.js";

const router = express.Router();

router.post("/repos/sync", authenticate, syncRepositories);
router.get("/repos", authenticate, getRepositories);
router.post("/repos/:id/toggle", authenticate, toggleRepository);
router.post("/repos/:id/analyze", authenticate, analyzeRepository);

export default router;