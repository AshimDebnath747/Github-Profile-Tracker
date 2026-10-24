import { generatePortfolioService, getPublicPortfolioService, updatePortfolioService, getPortfolioService, roastPortfolioService, chatPortfolioService } from "../services/portfolio.service.js";

export const generatePortfolio = async (req, res, next) => {
    try {
        const result = await generatePortfolioService(req.user.id);

        return res.status(200).json(result);
    } catch (error) {
        next(error);
    }
};

export const getPublicPortfolio = async (req, res, next) => {
    try {
        const { slug } = req.params;

        const result = await getPublicPortfolioService(slug);

        return res.status(200).json(result);
    } catch (error) {
        next(error);
    }
};

export const updatePortfolio = async (req, res) => {
    try {
        const portfolio = await updatePortfolioService(
            req.user.id,
            req.body
        );

        res.json({
            success: true,
            message: "Portfolio updated successfully.",
            portfolio,
        });
    } catch (err) {
        res.status(500).json({
            success: false,
            message: err.message,
        });
    }
};

export const getPortfolio = async (req, res) => {
    try {
        const portfolio = await getPortfolioService(req.user.id);

        res.json({
            success: true,
            portfolio,
        });
    } catch (err) {
        res.status(500).json({
            success: false,
            message: err.message,
        });
    }
};

export const roastPortfolio = async (req, res) => {
    try {
        const result = await roastPortfolioService(req.user.id);

        res.status(200).json({
            success: true,
            ...result,
        });
    } catch (error) {
        res.status(500).json({
            success: false,
            message: error.message,
        });
    }
};

export const chatPortfolio = async (req, res, next) => {
    try {
        const { question } = req.body;

        if (!question) {
            return res.status(400).json({
                success: false,
                message: "Question is required."
            });
        }

        const result = await chatPortfolioService(
            req.user.id,
            question
        );

        res.json(result);
    } catch (err) {
        next(err);
    }
};