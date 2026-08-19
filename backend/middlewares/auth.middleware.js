import jwt from "jsonwebtoken";

export const authenticate = (req, res, next) => {
    try {
        // Get token from cookie
        const token = req.cookies.token;

        console.log("token is cookie:", token)

        if (!token) {
            return res.status(401).json({
                success: false,
                message: "Unauthorized",
            });
        }

        // Verify JWT
        const decoded = jwt.verify(token, process.env.JWT_SECRET);

        // Attach user to request
        req.user = decoded;

        next();
    } catch (error) {
        return res.status(401).json({
            success: false,
            message: "Invalid or expired token",
        });
    }
};