import axios from "axios";
import jwt from "jsonwebtoken";
import { sql } from "../config/db.js";
import { createOrUpdateUser } from "./user.service.js";
import { saveGithubToken } from "./oAuth.service.js";
export const githubLoginService = async () => {
    return (
        `https://github.com/login/oauth/authorize` +
        `?client_id=${process.env.GITHUB_CLIENT_ID}` +
        `&redirect_uri=${process.env.GITHUB_CALLBACK}` +
        `&scope=read:user,user:email`
    );
};

export const githubCallbackService = async (code) => {
    if (!code) {
        throw new Error("Authorization code is missing");
    }

    const tokenResponse = await axios.post(
        "https://github.com/login/oauth/access_token",
        {
            client_id: process.env.GITHUB_CLIENT_ID,
            client_secret: process.env.GITHUB_CLIENT_SECRET,
            code,
            redirect_uri: process.env.GITHUB_CALLBACK,
        },
        {
            headers: {
                Accept: "application/json",
            },
        }
    );

    const accessToken = tokenResponse.data.access_token;

    const githubUserResponse = await axios.get(
        "https://api.github.com/user",
        {
            headers: {
                Authorization: `Bearer ${accessToken}`,
                Accept: "application/vnd.github+json",
            },
        }
    );

    const githubUser = githubUserResponse.data;
    const dbUser = await createOrUpdateUser(githubUser);

    // Save GitHub access token
    await saveGithubToken(
        dbUser.id,
        accessToken,
        tokenResponse.data.scope,
        tokenResponse.data.refresh_token ?? null,
        tokenResponse.data.expires_at ?? null
    );

    const jwtToken = jwt.sign(
        {
            id: dbUser.id,
        },
        process.env.JWT_SECRET,
        {
            expiresIn: "7d",
        }
    );

    return {
        success: true,
        token: jwtToken,
        user: dbUser,
        accessToken,
    };
};

export const getCurrentUserService = async (userId) => {
    return {
        id: userId,
    };
};

export const logoutService = async () => {
    return true;
};