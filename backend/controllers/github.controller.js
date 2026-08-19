import {
    syncRepositoriesService,
    getRepositoriesService,
    toggleRepositoryService,
    analyzeRepositoryService
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