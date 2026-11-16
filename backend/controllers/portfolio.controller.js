import { generatePortfolioService, getPublicPortfolioService, updatePortfolioService, getPortfolioService, roastPortfolioService, roastPublicPortfolioService } from "../services/portfolio.service.js";
import { analyzePublicPortfolioRepositoryService } from "../services/github.service.js";

const publicRoastCache = new Map();
const publicRoastAttempts = new Map();
const ROAST_CACHE_MS = 30 * 60 * 1000;
const ROAST_WINDOW_MS = 60 * 60 * 1000;
const ROAST_LIMIT_PER_IP = 8;
const publicAnalysisCache = new Map();
const publicAnalysisAttempts = new Map();
const ANALYSIS_CACHE_MS = 15 * 60 * 1000;
const ANALYSIS_WINDOW_MS = 60 * 60 * 1000;
const ANALYSIS_LIMIT_PER_REPOSITORY = 6;

const prunePublicRoastState = (now) => {
    for (const [slug, entry] of publicRoastCache) {
        if (now - entry.createdAt >= ROAST_CACHE_MS) publicRoastCache.delete(slug);
    }
    for (const [ip, attempts] of publicRoastAttempts) {
        const recent = attempts.filter(timestamp => now - timestamp < ROAST_WINDOW_MS);
        if (recent.length) publicRoastAttempts.set(ip, recent);
        else publicRoastAttempts.delete(ip);
    }
};

const prunePublicAnalysisState = (now) => {
    for (const [key, entry] of publicAnalysisCache) {
        if (now - entry.createdAt >= ANALYSIS_CACHE_MS) publicAnalysisCache.delete(key);
    }
    for (const [key, attempts] of publicAnalysisAttempts) {
        const recent = attempts.filter(timestamp => now - timestamp < ANALYSIS_WINDOW_MS);
        if (recent.length) publicAnalysisAttempts.set(key, recent);
        else publicAnalysisAttempts.delete(key);
    }
};

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

export const roastPublicPortfolio = async (req, res) => {
    const now = Date.now();
    prunePublicRoastState(now);
    const cacheKey = req.params.slug.toLowerCase();
    const cached = publicRoastCache.get(cacheKey);
    if (cached) return res.status(200).json({ success: true, ...cached.result, cached: true });

    const clientIp = req.ip || req.socket.remoteAddress || "unknown";
    const rateLimitKey = `${clientIp}:${cacheKey}`;
    const attempts = publicRoastAttempts.get(rateLimitKey) || [];
    if (attempts.length >= ROAST_LIMIT_PER_IP) {
        return res.status(429).json({ success: false, message: "Public portfolio roasts are temporarily rate limited. Try again later." });
    }
    publicRoastAttempts.set(rateLimitKey, [...attempts, now]);

    try {
        const result = await roastPublicPortfolioService(req.params.slug);
        publicRoastCache.set(cacheKey, { createdAt: now, result });
        return res.status(200).json({ success: true, ...result, cached: false });
    } catch (error) {
        const status = error.message === "Portfolio not found." ? 404 : 500;
        return res.status(status).json({ success: false, message: error.message || "Could not roast portfolio." });
    }
};

export const analyzePublicPortfolioRepository = async (req, res) => {
    const now = Date.now();
    prunePublicAnalysisState(now);
    const cacheKey = `${req.params.slug.toLowerCase()}:${req.params.id}`;
    const cached = publicAnalysisCache.get(cacheKey);
    if (cached) return res.status(200).json({ success: true, ...cached.result, cached: true });

    const clientIp = req.ip || req.socket.remoteAddress || "unknown";
    const rateLimitKey = `${clientIp}:${cacheKey}`;
    const attempts = publicAnalysisAttempts.get(rateLimitKey) || [];
    if (attempts.length >= ANALYSIS_LIMIT_PER_REPOSITORY) {
        return res.status(429).json({ success: false, message: "Public repository analysis is temporarily rate limited. Try again later." });
    }
    publicAnalysisAttempts.set(rateLimitKey, [...attempts, now]);

    try {
        const result = await analyzePublicPortfolioRepositoryService(req.params.slug, req.params.id);
        publicAnalysisCache.set(cacheKey, { createdAt: now, result });
        return res.status(200).json({ success: true, ...result, cached: false });
    } catch (error) {
        const status = error.message === "Public portfolio repository not found." ? 404 : 500;
        return res.status(status).json({ success: false, message: error.message || "Could not analyze public repository." });
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
