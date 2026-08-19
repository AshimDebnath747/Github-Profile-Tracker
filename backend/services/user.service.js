import { sql } from "../config/db.js";
export const createOrUpdateUser = async (githubUser) => {

    // Check if user already exists
    const portfolioSlug = `${githubUser.login.toLowerCase()}-${githubUser.id}`;
    const existingUser = await sql`
        SELECT * FROM users
        WHERE github_id = ${githubUser.id}
    `;

    if (existingUser.length > 0) {

        const updated = await sql`
            UPDATE users
            SET
                github_username = ${githubUser.login},
                name = ${githubUser.name},
                email = ${githubUser.email},
                avatar_url = ${githubUser.avatar_url},
                bio = ${githubUser.bio},
                location = ${githubUser.location},
                portfolio_slug = ${portfolioSlug},
                updated_at = NOW()
            WHERE github_id = ${githubUser.id}
            RETURNING *;
        `;

        return updated[0];
    }

    // Create new user
    const inserted = await sql`
    INSERT INTO users (
        github_id,
        github_username,
        name,
        email,
        avatar_url,
        bio,
        location,
        portfolio_slug
    )
    VALUES (
        ${githubUser.id},
        ${githubUser.login},
        ${githubUser.name},
        ${githubUser.email},
        ${githubUser.avatar_url},
        ${githubUser.bio},
        ${githubUser.location},
        ${portfolioSlug}
    )
    RETURNING *;
    `;

    return inserted[0];
};