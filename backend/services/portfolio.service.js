import { sql } from "../config/db.js";
import { roastPortfolioWithAI } from "./ai.service.js";

export const generatePortfolioService = async (userId) => {
    /*
     * STEP 1
     * Get user
     */

    const [user] = await sql`
        SELECT *
        FROM users
        WHERE id = ${userId}
        LIMIT 1
    `;

    if (!user) {
        throw new Error("User not found.");
    }

    const publicSlug = user.portfolio_slug || user.github_username;
    if (!publicSlug) {
        throw new Error("A public portfolio link cannot be created without a GitHub username.");
    }

    /*
     * STEP 2
     * Create portfolio if it doesn't exist
     */

    const [portfolio] = await sql`
        INSERT INTO portfolios (
            user_id,
            status
        )
        VALUES (
            ${userId},
            'pending'
        )
        ON CONFLICT (user_id)
        DO UPDATE
        SET updated_at = NOW()
        RETURNING *;
    `;

    /*
     * STEP 3
     * Get selected repositories
     */

    const repositories = await sql`
        SELECT
            r.id,
            r.name,
            r.owner,
            r.description,
            r.html_url,
            r.private,
            r.fork,
            r.github_created_at,

            ra.summary,
            ra.languages,
            ra.technologies,
            ra.primary_language,
            ra.overall_score,
            ra.stars,
            ra.forks_count,
            ra.watchers_count

        FROM repositories r

        LEFT JOIN repository_analysis ra
            ON r.id = ra.repository_id

        WHERE
            r.user_id = ${userId}
            AND r.included = true

        ORDER BY
            ra.overall_score DESC NULLS LAST,
            r.github_created_at DESC;
    `;

    /*
     * STEP 4
     * Statistics
     */

    const stats = {
        totalRepositories: repositories.length,
        publicRepositories: repositories.filter(r => !r.private).length,
        privateRepositories: repositories.filter(r => r.private).length,
        forkedRepositories: repositories.filter(r => r.fork).length,

        totalStars: repositories.reduce(
            (sum, repo) => sum + (repo.stars || 0),
            0
        ),

        totalForks: repositories.reduce(
            (sum, repo) => sum + (repo.forks_count || 0),
            0
        ),

        averageScore:
            repositories.length
                ? Math.round(
                    repositories.reduce(
                        (sum, repo) =>
                            sum + (repo.overall_score || 0),
                        0
                    ) / repositories.length
                )
                : 0
    };

    /*
     * STEP 5
     * Update portfolio metadata
     */

    const [updatedPortfolio] = await sql`
        UPDATE portfolios
        SET
            status = 'ready',
            version = version + 1,
            last_generated_at = NOW(),
            updated_at = NOW()
        WHERE id = ${portfolio.id}
        RETURNING *;
    `;

    /*
     * STEP 6
     * Return
     */

    return {
        success: true,

        portfolioUrl: `/portfolio/${encodeURIComponent(publicSlug)}`,

        portfolio: {
            id: updatedPortfolio.id,
            version: updatedPortfolio.version,
            status: updatedPortfolio.status,
            lastGeneratedAt: updatedPortfolio.last_generated_at,

            profile: {
                username: user.github_username,
                name: updatedPortfolio.display_name || user.name,
                avatar: user.avatar_url,
                bio: updatedPortfolio.bio || user.bio,
                tagline: updatedPortfolio.tagline,
                theme: updatedPortfolio.theme,
                socialLinks: updatedPortfolio.social_links,
                resumeUrl: updatedPortfolio.resume_url,
                displayEmail: updatedPortfolio.display_email
            },

            stats,

            repositories
        }
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
            OR LOWER(github_username) = LOWER(${slug})
        ORDER BY CASE WHEN portfolio_slug = ${slug} THEN 0 ELSE 1 END
        LIMIT 1
    `;

    if (users.length === 0) {
        throw new Error("Portfolio not found.");
    }

    const user = users[0];

    const [portfolioSettings] = await sql`
        SELECT display_name, tagline, bio, social_links, resume_url, display_email, show_github_stats, id
        FROM portfolios
        WHERE user_id = ${user.id} AND status = 'ready'
        LIMIT 1
    `;

    /*
        STEP 2
        Get included repositories
    */

    const repositories = await sql`
        SELECT
            r.id,
            r.github_repo_id,
            r.name,
            r.owner,
            r.description,
            r.html_url,
            r.default_branch,
            r.private,
            r.fork,
            ra.summary AS analysis_summary,
            ra.strengths AS analysis_strengths,
            ra.weaknesses AS analysis_weaknesses,
            ra.recommendations AS analysis_recommendations,
            ra.overall_score AS analysis_overall_score,
            ra.architecture AS analysis_architecture,
            ra.architecture_score,
            ra.documentation_score,
            ra.code_quality_score,
            ra.maintainability_score,
            ra.security_score,
            ra.testing_score,
            ra.deployment_score,
            ra.analyzed_at
        FROM repositories r
        LEFT JOIN repository_analysis ra ON ra.repository_id = r.id
        WHERE r.user_id = ${user.id}
            AND r.included = true
            AND r.private = false
            AND (
                NOT EXISTS (
                    SELECT 1 FROM portfolio_featured_repositories pfr
                    WHERE pfr.portfolio_id = ${portfolioSettings?.id ?? null}
                )
                OR r.id IN (
                    SELECT pfr.repository_id FROM portfolio_featured_repositories pfr
                    WHERE pfr.portfolio_id = ${portfolioSettings?.id ?? null}
                )
            )
        ORDER BY r.updated_at DESC
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
                name: portfolioSettings?.display_name || user.name,
                avatar: user.avatar_url,
                bio: portfolioSettings?.bio || user.bio,
                tagline: portfolioSettings?.tagline || null,
                location: user.location,
                linkedin: portfolioSettings?.social_links?.linkedin || user.linkedin_url,
                socialLinks: portfolioSettings?.social_links || {},
                resumeUrl: portfolioSettings?.resume_url || null,
                displayEmail: portfolioSettings?.display_email || null,
                showGithubStats: portfolioSettings?.show_github_stats !== false,
                slug: user.portfolio_slug,
            },
            repositories: repositories.map(repo => {
                const architecture = typeof repo.analysis_architecture === "string"
                    ? JSON.parse(repo.analysis_architecture)
                    : repo.analysis_architecture;
                return ({
                id: repo.id,
                github_repo_id: repo.github_repo_id,
                name: repo.name,
                owner: repo.owner,
                description: repo.description,
                html_url: repo.html_url,
                default_branch: repo.default_branch,
                private: repo.private,
                fork: repo.fork,
                analysis: repo.analysis_summary ? {
                    summary: repo.analysis_summary,
                    strengths: repo.analysis_strengths || [],
                    weaknesses: repo.analysis_weaknesses || [],
                    recommendations: repo.analysis_recommendations || [],
                    evidence: Array.isArray(architecture?.evidence) ? architecture.evidence : [],
                    overallScore: repo.analysis_overall_score,
                    analyzedAt: repo.analyzed_at,
                    scores: {
                        architecture: repo.architecture_score,
                        documentation: repo.documentation_score,
                        codeQuality: repo.code_quality_score,
                        maintainability: repo.maintainability_score,
                        security: repo.security_score,
                        testing: repo.testing_score,
                        deployment: repo.deployment_score,
                        overall: repo.analysis_overall_score,
                    },
                } : null,
            });
            }),
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


/* ===========================================================
    GET MY PORTFOLIO
=========================================================== */

export const getPortfolioService = async (userId) => {
    const portfolioResult = await sql`
        SELECT *
        FROM portfolios
        WHERE user_id = ${userId}
        LIMIT 1
    `;

    if (portfolioResult.length === 0) {
        return null;
    }

    const portfolio = portfolioResult[0];

    const [user] = await sql`
        SELECT
            portfolio_slug,
            github_username,
            name,
            avatar_url,
            bio
        FROM users
        WHERE id = ${userId}
        LIMIT 1
    `;

    const featuredRepositories = await sql`
        SELECT
            r.id,
            r.name,
            r.description,
            r.owner,
            r.html_url,
            pfr.display_order
        FROM portfolio_featured_repositories pfr
        JOIN repositories r
            ON r.id = pfr.repository_id
        WHERE pfr.portfolio_id = ${portfolio.id}
        ORDER BY pfr.display_order
    `;

    return {
        ...portfolio,
        portfolio_slug: user?.portfolio_slug ?? null,
        github_username: user?.github_username ?? null,
        user_name: user?.name ?? null,
        avatar_url: user?.avatar_url ?? null,
        user_bio: user?.bio ?? null,
        featuredRepositories,
    };
};

/* ===========================================================
    UPDATE PORTFOLIO
=========================================================== */

export const updatePortfolioService = async (userId, payload) => {
    const {
        displayName,
        bio,
        tagline,
        theme,
        socialLinks,
        resumeUrl,
        featuredRepositories = [],
        displayEmail,
        showGithubStats,
    } = payload;

    if (featuredRepositories.length > 6) {
        throw new Error("Maximum 6 featured repositories allowed.");
    }

    return await sql.begin(async (tx) => {
        let portfolio;

        const existing = await tx`
            SELECT *
            FROM portfolios
            WHERE user_id = ${userId}
            LIMIT 1
        `;

        if (existing.length === 0) {
            const inserted = await tx`
                INSERT INTO portfolios (
                    user_id,
                    display_name,
                    bio,
                    tagline,
                    theme,
                    social_links,
                    resume_url,
                    display_email,
                    show_github_stats
                )
                VALUES (
                    ${userId},
                    ${displayName},
                    ${bio},
                    ${tagline},
                    ${theme},
                    ${JSON.stringify(socialLinks || {})},
                    ${resumeUrl},
                    ${displayEmail},
                    ${showGithubStats}
                )
                RETURNING *
            `;

            portfolio = inserted[0];
        } else {
            const updated = await tx`
                UPDATE portfolios
                SET
                    display_name = ${displayName},
                    bio = ${bio},
                    tagline = ${tagline},
                    theme = ${theme},
                    social_links = ${JSON.stringify(socialLinks || {})},
                    resume_url = ${resumeUrl},
                    display_email = ${displayEmail},
                    show_github_stats = ${showGithubStats},
                    updated_at = NOW()
                WHERE user_id = ${userId}
                RETURNING *
            `;

            portfolio = updated[0];
        }

        // ----------------------------
        // Update featured repositories
        // ----------------------------

        await tx`
            DELETE FROM portfolio_featured_repositories
            WHERE portfolio_id = ${portfolio.id}
        `;

        for (let i = 0; i < featuredRepositories.length; i++) {
            await tx`
                INSERT INTO portfolio_featured_repositories (
                    portfolio_id,
                    repository_id,
                    display_order
                )
                VALUES (
                    ${portfolio.id},
                    ${featuredRepositories[i]},
                    ${i + 1}
                )
            `;
        }

        const repos = await tx`
            SELECT
                r.id,
                r.name,
                r.description,
                r.owner,
                r.html_url,
                pfr.display_order
            FROM portfolio_featured_repositories pfr
            JOIN repositories r
                ON r.id = pfr.repository_id
            WHERE pfr.portfolio_id = ${portfolio.id}
            ORDER BY pfr.display_order
        `;

        return {
            ...portfolio,
            featuredRepositories: repos,
        };
    });
};


export const roastPortfolioService = async (userId) => {
    const repositories = await sql`
        SELECT
            r.name,
            r.description,
            ra.summary,
            ra.strengths,
            ra.weaknesses,
            ra.documentation_score,
            ra.code_quality_score,
            ra.maintainability_score,
            ra.security_score,
            ra.testing_score,
            ra.deployment_score,
            ra.overall_score,
            ra.technologies
        FROM repositories r
        JOIN repository_analysis ra
            ON r.id = ra.repository_id
        WHERE r.user_id = ${userId};
    `;

    if (!repositories.length) {
        throw new Error("No analyzed repositories found.");
    }
    console.log(repositories.length)

    return await roastPortfolioWithAI(repositories);
};

export const roastPublicPortfolioService = async (slug) => {
    const [user] = await sql`
        SELECT id
        FROM users
        WHERE portfolio_slug = ${slug}
            OR LOWER(github_username) = LOWER(${slug})
        ORDER BY CASE WHEN portfolio_slug = ${slug} THEN 0 ELSE 1 END
        LIMIT 1
    `;

    if (!user) throw new Error("Portfolio not found.");

    const repositories = await sql`
        SELECT
            r.name,
            r.description,
            ra.summary,
            ra.strengths,
            ra.weaknesses,
            ra.documentation_score,
            ra.code_quality_score,
            ra.maintainability_score,
            ra.security_score,
            ra.testing_score,
            ra.deployment_score,
            ra.overall_score,
            ra.technologies
        FROM repositories r
        JOIN repository_analysis ra ON ra.repository_id = r.id
        WHERE r.user_id = ${user.id}
            AND r.included = true
            AND r.private = false
        ORDER BY r.updated_at DESC
    `;

    if (!repositories.length) throw new Error("No analyzed public repositories found.");
    return await roastPortfolioWithAI(repositories);
};
