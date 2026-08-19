import { sql } from "../config/db.js";

export const saveGithubToken = async (
    userId,
    accessToken,
    scope = null,
    refreshToken = null,
    expiresAt = null
) => {
    const existing = await sql`
        SELECT id
        FROM oauth_tokens
        WHERE user_id = ${userId}
        AND provider = 'github'
        LIMIT 1
    `;

    if (existing.length > 0) {
        await sql`
            UPDATE oauth_tokens
            SET
                access_token = ${accessToken},
                refresh_token = ${refreshToken},
                scope = ${scope},
                expires_at = ${expiresAt}
            WHERE user_id = ${userId}
            AND provider = 'github'
        `;
    } else {
        await sql`
            INSERT INTO oauth_tokens (
                user_id,
                provider,
                access_token,
                refresh_token,
                scope,
                expires_at
            )
            VALUES (
                ${userId},
                'github',
                ${accessToken},
                ${refreshToken},
                ${scope},
                ${expiresAt}
            )
        `;
    }
};