import {
    githubLoginService,
    githubCallbackService,
    getCurrentUserService,
    logoutService,
} from "../services/auth.service.js";

export const githubLogin = async (req, res, next) => {
    try {
        const url = await githubLoginService();

        return res.redirect(url);
    } catch (error) {
        next(error);
    }
};

export const githubCallback = async (req, res, next) => {
    try {
        const { code } = req.query;

        const result = await githubCallbackService(code);
        res.cookie("token", result.token, {
            httpOnly: true,
            secure: false,
            sameSite: "lax",
            maxAge: 7 * 24 * 60 * 60 * 1000,
        });

        const frontendUrl = process.env.FRONTEND_URL || "http://localhost:5173";
        return res.redirect(303, frontendUrl);
    } catch (error) {
        next(error);
    }
};

export const getCurrentUser = async (req, res, next) => {
    try {
        const user = await getCurrentUserService(req.user.id);

        return res.json({
            success: true,
            data: user,
        });
    } catch (error) {
        next(error);
    }
};

export const logout = async (req, res, next) => {
    try {
        await logoutService();

        res.clearCookie("token");

        return res.json({
            success: true,
            message: "Logged out successfully",
        });
    } catch (error) {
        next(error);
    }
};
