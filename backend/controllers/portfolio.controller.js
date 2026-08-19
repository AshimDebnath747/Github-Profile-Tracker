import { generatePortfolioService, getPublicPortfolioService } from "../services/portfolio.service.js";

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