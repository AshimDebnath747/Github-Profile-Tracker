import {
    syncRepositoriesService,
    getRepositoriesService,
    toggleRepositoryService,
    analyzeRepositoryService,
    getRepositoryHealthService,
    analyzeAllRepositoriesService,
    generateProjectStoryService
} from "../services/github.service.js";

export const syncRepositories = async (req, res, next) => {
    try {
        const result = await syncRepositoriesService(req.user.id);

        res.status(200).json(result);
    } catch (err) {
        next(err);
    }
};

export const getRepositories = async (req, res, next) => {
    try {
        const repos = await getRepositoriesService(req.user.id);

        res.status(200).json({
            success: true,
            repos,
        });
    } catch (err) {
        next(err);
    }
};

export const toggleRepository = async (req, res, next) => {
    try {
        const { id } = req.params;

        const result = await toggleRepositoryService(
            req.user.id,
            id
        );

        return res.status(200).json(result);
    } catch (error) {
        next(error);
    }
};

export const analyzeRepository = async (req, res, next) => {
    try {
        const { id } = req.params;

        const result = await analyzeRepositoryService(
            req.user.id,
            id
        );

        return res.status(200).json(result);
    } catch (error) {
        next(error);
    }
};

export const getRepositoryHealth = async (req, res) => {
    try {
        const data = await getRepositoryHealthService(
            req.user.id,
            req.params.id
        );

        res.json({
            success: true,
            ...data,
        });
    } catch (err) {
        res.status(500).json({
            success: false,
            message: err.message,
        });
    }
};

export const analyzeAllRepositories = async (req, res) => {
    try {
        const result = await analyzeAllRepositoriesService(req.user.id);

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

export const generateProjectStory = async (req, res) => {
    try {
        const { id } = req.params;

        const result = await generateProjectStoryService(
            req.user.id,
            id
        );

        return res.status(200).json(result);
    } catch (error) {
        console.error(error);

        return res.status(500).json({
            success: false,
            message: error.message,
        });
    }
};