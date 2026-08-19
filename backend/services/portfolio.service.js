import { sql } from "../config/db.js";

export const generatePortfolioService = async (userId) => {

    /*
        STEP 1
        Get user
    */

    const users = await sql`
        SELECT *
        FROM users
        WHERE id = ${userId}
        LIMIT 1
    `;

    if (users.length === 0) {
        throw new Error("User not found.");
    }

    const user = users[0];

    /*
        STEP 2
        Get selected repositories
    */

    const repositories = await sql`
SELECT
    r.id,
    r.name,
    r.owner,
    r.description,
    r.html_url,
    r.default_branch,
    r.private,
    r.fork,

    a.score,
    a.languages,
    a.topics,
    a.has_readme,
    a.has_license,
    a.stars,
    a.forks,
    a.watchers

FROM repositories r

LEFT JOIN repository_analysis a
ON r.id = a.repository_id

WHERE r.user_id = ${userId}
AND r.included = true

ORDER BY
    a.score DESC NULLS LAST,
    r.updated_at DESC
`;

    /*
        STEP 3
        Calculate statistics
    */

    const stats = {
        totalRepositories: repositories.length,
        publicRepositories: repositories.filter(r => !r.private).length,
        privateRepositories: repositories.filter(r => r.private).length,
        forkedRepositories: repositories.filter(r => r.fork).length
    };

    /*
        STEP 4
        Build portfolio object
    */

    const portfolio = {
        user: {
            id: user.id,
            githubId: user.github_id,
            username: user.github_username,
            name: user.name,
            email: user.email,
            avatar: user.avatar_url,
            bio: user.bio,
            location: user.location,
            linkedin: user.linkedin_url,
            slug: user.portfolio_slug
        },

        stats,

        repositories: repositories.map(repo => ({
            id: repo.id,
            githubRepoId: repo.github_repo_id,
            name: repo.name,
            owner: repo.owner,
            description: repo.description,
            htmlUrl: repo.html_url,
            defaultBranch: repo.default_branch,
            private: repo.private,
            fork: repo.fork
        }))
    };

    /*
        STEP 5
        Return portfolio
    */

    return {
        success: true,
        portfolioUrl: `/portfolio/${user.portfolio_slug}`,
        portfolio
    };
};

export const getPublicPortfolioService = async (slug) => {
    /*
        STEP 1
        Find user by portfolio slug
    */

    const users = await sql`
        SELECT
            id,
            github_username,
            name,
            avatar_url,
            bio,
            location,
            linkedin_url,
            portfolio_slug
        FROM users
        WHERE portfolio_slug = ${slug}
        LIMIT 1
    `;

    if (users.length === 0) {
        throw new Error("Portfolio not found.");
    }

    const user = users[0];

    /*
        STEP 2
        Get included repositories
    */

    const repositories = await sql`
        SELECT
            id,
            github_repo_id,
            name,
            owner,
            description,
            html_url,
            default_branch,
            private,
            fork
        FROM repositories
        WHERE user_id = ${user.id}
        AND included = true
        ORDER BY updated_at DESC
    `;

    /*
        STEP 3
        Build response
    */

    return {
        success: true,
        portfolio: {
            user: {
                username: user.github_username,
                name: user.name,
                avatar: user.avatar_url,
                bio: user.bio,
                location: user.location,
                linkedin: user.linkedin_url,
                slug: user.portfolio_slug,
            },
            repositories,
            stats: {
                totalRepositories: repositories.length,
                publicRepositories: repositories.filter(
                    (repo) => !repo.private
                ).length,
                forkedRepositories: repositories.filter(
                    (repo) => repo.fork
                ).length,
            },
        },
    };
};