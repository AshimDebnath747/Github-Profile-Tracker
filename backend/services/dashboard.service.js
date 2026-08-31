// services/dashboard.service.js

import { sql } from "../config/db.js";
import { analyzeDeveloperWithAI, analyzeDeveloperDNAWithAI } from "./ai.service.js";

/* ===========================================================
    MAIN SERVICE
=========================================================== */

export const getDashboardService = async (userId) => {
    // 1. Fetch repositories with analysis
    const repositories = await getRepositories(userId);

    // 2. Dashboard metrics
    const overallScore = calculateOverallScore(repositories);
    const totalRepositories = repositories.length;
    const languageStats = calculateLanguageStats(repositories);
    const topRepositories = getTopRepositories(repositories);

    // 3. Developer AI Summary
    const developerAnalysis = await getDeveloperAnalysis(
        userId,
        repositories,
        overallScore
    );

    return {
        overallScore,
        totalRepositories,
        languageStats,
        topRepositories,
        developerSummary: developerAnalysis.summary,
        strengths: developerAnalysis.strengths,
        improvements: developerAnalysis.improvements,
    };
};

/* ===========================================================
    DATABASE
=========================================================== */

const getRepositories = async (userId) => {
    const repositories = await sql`
        SELECT
            r.id,
            r.name,
            r.description,
            r.html_url,
            r.owner,
            r.included,

            ra.summary,
            ra.languages,
            ra.primary_language,
            ra.overall_score,
            ra.documentation_score,
            ra.code_quality_score,
            ra.stars,
            ra.forks_count,
            ra.watchers_count,
            ra.strengths,
            ra.weaknesses,
            ra.recommendations

        FROM repositories r
        LEFT JOIN repository_analysis ra
            ON r.id = ra.repository_id

        WHERE r.user_id = ${userId}
    `;

    return repositories;
};

/* ===========================================================
    SCORE
=========================================================== */

const calculateOverallScore = (repositories) => {
    const analyzed = repositories.filter(
        (repo) => repo.overall_score !== null
    );

    if (!analyzed.length) return 0;

    const total = analyzed.reduce(
        (sum, repo) => sum + repo.overall_score,
        0
    );

    return Math.round(total / analyzed.length);
};

/* ===========================================================
    LANGUAGES
=========================================================== */

const calculateLanguageStats = (repositories) => {
    const languageMap = {};

    repositories.forEach((repo) => {
        if (!repo.languages) return;

        const languages =
            typeof repo.languages === "string"
                ? JSON.parse(repo.languages)
                : repo.languages;

        Object.entries(languages).forEach(([language, bytes]) => {
            languageMap[language] =
                (languageMap[language] || 0) + Number(bytes);
        });
    });

    return Object.entries(languageMap)
        .map(([language, bytes]) => ({
            language,
            bytes,
        }))
        .sort((a, b) => b.bytes - a.bytes);
};

/* ===========================================================
    TOP REPOSITORIES
=========================================================== */

const getTopRepositories = (repositories) => {
    return repositories
        .filter((repo) => repo.overall_score !== null)
        .sort((a, b) => b.overall_score - a.overall_score)
        .slice(0, 5)
        .map((repo) => ({
            id: repo.id,
            name: repo.name,
            description: repo.description,
            overallScore: repo.overall_score,
            stars: repo.stars,
            forks: repo.forks_count,
            language: repo.primary_language,
            summary: repo.summary,
        }));
};

/* ===========================================================
    AI DEVELOPER ANALYSIS
=========================================================== */

const getDeveloperAnalysis = async (
    userId,
    repositories,
    overallScore
) => {
    const existing = await sql`
        SELECT *
        FROM developer_analysis
        WHERE user_id = ${userId}
        LIMIT 1
    `;

    if (existing.length) {
        return existing[0];
    }

    const context = repositories.map((repo) => ({
        name: repo.name,
        summary: repo.summary,
        technologies: repo.languages,
        strengths: repo.strengths,
        weaknesses: repo.weaknesses,
        recommendations: repo.recommendations,
        score: repo.overall_score,
    }));

    const aiAnalysis = await analyzeDeveloperWithAI({
        repositories: context,
        overallScore,
    });

    await saveDeveloperAnalysis(userId, aiAnalysis);

    return aiAnalysis;
};

/* ===========================================================
    SAVE AI RESULT
=========================================================== */

const saveDeveloperAnalysis = async (userId, analysis) => {
    await sql`
        INSERT INTO developer_analysis (
            user_id,
            summary,
            strengths,
            improvements,
            top_technologies,
            recommended_roles,
            developer_level,
            overall_score,
            analyzed_at,
            updated_at
        )
        VALUES (
            ${userId},
            ${analysis.summary},
            ${JSON.stringify(analysis.strengths)},
            ${JSON.stringify(analysis.improvements)},
            ${JSON.stringify(analysis.topTechnologies)},
            ${JSON.stringify(analysis.recommendedRoles)},
            ${analysis.developerLevel},
            ${analysis.overallScore},
            NOW(),
            NOW()
        )
        ON CONFLICT (user_id)
        DO UPDATE SET
            summary = EXCLUDED.summary,
            strengths = EXCLUDED.strengths,
            improvements = EXCLUDED.improvements,
            top_technologies = EXCLUDED.top_technologies,
            recommended_roles = EXCLUDED.recommended_roles,
            developer_level = EXCLUDED.developer_level,
            overall_score = EXCLUDED.overall_score,
            analyzed_at = NOW(),
            updated_at = NOW();
    `;
};

// services/dashboard.service.js

export const getSkillTimelineService = async (userId) => {
    const repositories = await sql`
        SELECT
            r.github_created_at,
            ra.languages,
            ra.technologies
        FROM repositories r
        JOIN repository_analysis ra
            ON r.id = ra.repository_id
        WHERE r.user_id = ${userId}
        ORDER BY r.github_created_at ASC;
    `;

    const timeline = {};

    for (const repo of repositories) {
        if (!repo.github_created_at) continue;

        const year = new Date(repo.github_created_at).getFullYear();

        if (!timeline[year]) {
            timeline[year] = {
                languages: new Set(),
                technologies: new Set(),
            };
        }

        // Languages
        const languages =
            typeof repo.languages === "string"
                ? JSON.parse(repo.languages)
                : repo.languages;

        if (languages) {
            Object.keys(languages).forEach((language) => {
                timeline[year].languages.add(language);
            });
        }

        // Technologies
        const technologies =
            typeof repo.technologies === "string"
                ? JSON.parse(repo.technologies)
                : repo.technologies;

        if (Array.isArray(technologies)) {
            technologies.forEach((tech) => {
                timeline[year].technologies.add(tech);
            });
        }
    }

    return Object.entries(timeline)
        .map(([year, data]) => ({
            year: Number(year),
            languages: [...data.languages].sort(),
            technologies: [...data.technologies].sort(),
        }))
        .sort((a, b) => a.year - b.year);
};


export const getDeveloperDNAService = async (userId) => {
    const repositories = await sql`
        SELECT
            r.name,
            r.description,
            ra.summary,
            ra.languages,
            ra.technologies,
            ra.architecture,
            ra.strengths,
            ra.weaknesses,
            ra.documentation_score,
            ra.code_quality_score,
            ra.maintainability_score,
            ra.security_score,
            ra.testing_score,
            ra.deployment_score,
            ra.overall_score
        FROM repositories r
        JOIN repository_analysis ra
            ON r.id = ra.repository_id
        WHERE r.user_id = ${userId};
    `;

    if (!repositories.length) {
        throw new Error("No analyzed repositories found.");
    }

    return await analyzeDeveloperDNAWithAI(repositories);
};