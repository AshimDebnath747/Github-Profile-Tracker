// controllers/dashboard.controller.js

import { getDashboardService, getSkillTimelineService, getDeveloperDNAService } from "../services/dashboard.service.js";

export const getDashboard = async (req, res) => {
    try {
        const dashboard = await getDashboardService(req.user.id);

        return res.status(200).json({
            success: true,
            dashboard,
        });
    } catch (error) {
        console.error(error);

        return res.status(500).json({
            success: false,
            message: error.message,
        });
    }
};

export const getSkillTimeline = async (req, res) => {
    try {
        const timeline = await getSkillTimelineService(req.user.id);

        return res.status(200).json({
            success: true,
            timeline,
        });
    } catch (error) {
        console.error(error);

        return res.status(500).json({
            success: false,
            message: error.message,
        });
    }
};

export const getDeveloperDNA = async (req, res) => {
    try {
        const result = await getDeveloperDNAService(req.user.id);

        res.status(200).json({
            success: true,
            dna: result,
        });
    } catch (error) {
        res.status(500).json({
            success: false,
            message: error.message,
        });
    }
};