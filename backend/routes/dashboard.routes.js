import express from "express";
import { authenticate } from "../middlewares/auth.middleware.js";
import { getDashboard, getSkillTimeline, getDeveloperDNA } from "../controllers/dashboard.controller.js";

const router = express.Router();

router.get("/", authenticate, getDashboard);
router.get("/skill-timeline", authenticate, getSkillTimeline)
router.get(
    "/developer-dna",
    authenticate,
    getDeveloperDNA
);
export default router;