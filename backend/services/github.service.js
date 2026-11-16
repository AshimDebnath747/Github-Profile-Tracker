import axios from "axios";
import { sql } from "../config/db.js";
import { buildRepositoryContext } from "./githubCollector.service.js";
import { analyzeRepositoryWithAI } from "./ai.service.js";
import { roastPortfolioWithAI } from "./ai.service.js";
import { saveRepositoryAnalysis } from "./analysis.service.js"

const escapeRegExp = (value) => value.replace(/[.*+?^${}()|[\]\\]/g, "\\$&");

const locateEvidenceQuote = (content, quote) => {
    const words = quote.trim().split(/\s+/).filter(Boolean);
    if (!words.length) return null;
    const pattern = words.map(escapeRegExp).join("\\s+");
    const match = new RegExp(pattern).exec(content);
    if (!match) return null;
    const start = match.index;
    const end = start + match[0].length;
    return {
        lineStart: content.slice(0, start).split("\n").length,
        lineEnd: content.slice(0, end).split("\n").length,
    };
};

const validateAnalysisEvidence = (aiAnalysis, context, repo) => {
    const files = new Map(
        [...(context.importantFiles || []), ...(context.sourceFiles || [])]
            .filter(file => typeof file?.path === "string" && typeof file?.content === "string")
            .map(file => [file.path, file.content])
    );
    const findings = {
        strengths: Array.isArray(aiAnalysis.strengths) ? aiAnalysis.strengths : [],
        weaknesses: Array.isArray(aiAnalysis.weaknesses) ? aiAnalysis.weaknesses : [],
        recommendations: Array.isArray(aiAnalysis.recommendations) ? aiAnalysis.recommendations : [],
    };
    const verified = [];
    for (const item of Array.isArray(aiAnalysis.evidence) ? aiAnalysis.evidence : []) {
        if (!item || !Object.hasOwn(findings, item.category) || !Number.isInteger(item.findingIndex)) continue;
        const finding = findings[item.category][item.findingIndex];
        const content = files.get(item.sourcePath);
        const quote = typeof item.quote === "string" ? item.quote.trim() : "";
        if (typeof finding !== "string" || !content || quote.length < 20 || quote.length > 240) continue;
        const location = locateEvidenceQuote(content, quote);
        if (!location) continue;
        const sourcePath = item.sourcePath.split("/").map(encodeURIComponent).join("/");
        const branch = encodeURIComponent(repo.default_branch || "main");
        const url = `https://github.com/${encodeURIComponent(repo.owner)}/${encodeURIComponent(repo.name)}/blob/${branch}/${sourcePath}?plain=1#L${location.lineStart}`;
        verified.push({ category: item.category, findingIndex: item.findingIndex, item: finding, filePath: item.sourcePath, quote, ...location, url });
    }

    const retained = { strengths: [], weaknesses: [], recommendations: [] };
    const normalizedEvidence = [];
    for (const category of Object.keys(findings)) {
        findings[category].forEach((finding, findingIndex) => {
            const matches = verified.filter(item => item.category === category && item.findingIndex === findingIndex);
            if (!matches.length) return;
            const newIndex = retained[category].push(finding) - 1;
            normalizedEvidence.push(...matches.map(item => ({ ...item, findingIndex: newIndex })));
        });
    }
    return { findings: retained, evidence: normalizedEvidence };
};
import pLimit from "p-limit";

export const syncRepositoriesService = async (userId) => {
    // STEP 1 - Get GitHub access token
    const tokenResult = await sql`
        SELECT access_token
        FROM oauth_tokens
        WHERE user_id = ${userId}
        AND provider = 'github'
        LIMIT 1
    `;

    if (tokenResult.length === 0) {
        throw new Error("GitHub account is not connected.");
    }

    const accessToken = tokenResult[0].access_token;

    // STEP 2 - Fetch repositories
    const response = await axios.get(
        "https://api.github.com/user/repos",
        {
            headers: {
                Authorization: `Bearer ${accessToken}`,
                Accept: "application/vnd.github+json",
            },
            params: {
                per_page: 100,
                sort: "updated",
            },
        }
    );

    const repos = response.data;

    // STEP 3 - Insert / Update repositories
    for (const repo of repos) {
        const existingRepo = await sql`
            SELECT id
            FROM repositories
            WHERE github_repo_id = ${repo.id}
            LIMIT 1
        `;

        if (existingRepo.length > 0) {
            await sql`
                UPDATE repositories
                SET
                    name = ${repo.name},
                    owner = ${repo.owner.login},
                    description = ${repo.description},
                    default_branch = ${repo.default_branch},
                    html_url = ${repo.html_url},
                    private = ${repo.private},
                    fork = ${repo.fork},
                    github_created_at = ${repo.created_at},
                    github_updated_at = ${repo.updated_at},
                    github_pushed_at = ${repo.pushed_at},
                    updated_at = NOW()
                WHERE github_repo_id = ${repo.id}
            `;
        } else {
            await sql`
                INSERT INTO repositories (
                    user_id,
                    github_repo_id,
                    name,
                    owner,
                    description,
                    default_branch,
                    html_url,
                    private,
                    fork,
                    github_created_at,
                    github_updated_at,
                    github_pushed_at
                )
                VALUES (
                    ${userId},
                    ${repo.id},
                    ${repo.name},
                    ${repo.owner.login},
                    ${repo.description},
                    ${repo.default_branch},
                    ${repo.html_url},
                    ${repo.private},
                    ${repo.fork},
                    ${repo.created_at},
                    ${repo.updated_at},
                    ${repo.pushed_at}
                )
            `;
        }
    }

    return {
        success: true,
        message: "Repositories synced successfully.",
        count: repos.length,
    };
};

export const getRepositoriesService = async (userId) => {

    const repositories = await sql`
        SELECT
            r.id,
            r.github_repo_id,
            r.name,
            r.owner,
            r.description,
            r.default_branch,
            r.html_url,
            r.private,
            r.fork,
            r.included,
            r.created_at,
            r.updated_at,
            ra.summary AS analysis_summary,
            ra.strengths AS analysis_strengths,
            ra.weaknesses AS analysis_weaknesses,
            ra.recommendations AS analysis_recommendations,
            ra.overall_score AS analysis_overall_score,
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
        WHERE r.user_id = ${userId}
        ORDER BY r.updated_at DESC
    `;

    return {
        success: true,
        count: repositories.length,
        repositories: repositories.map(repo => ({
            id: repo.id,
            github_repo_id: repo.github_repo_id,
            name: repo.name,
            owner: repo.owner,
            description: repo.description,
            default_branch: repo.default_branch,
            html_url: repo.html_url,
            private: repo.private,
            fork: repo.fork,
            included: repo.included,
            created_at: repo.created_at,
            updated_at: repo.updated_at,
            analysis: repo.analysis_summary ? {
                summary: repo.analysis_summary,
                strengths: repo.analysis_strengths || [],
                weaknesses: repo.analysis_weaknesses || [],
                recommendations: repo.analysis_recommendations || [],
                overallScore: repo.analysis_overall_score,
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
                analyzedAt: repo.analyzed_at,
            } : null,
        })),
    };
};

export const roastRepositoryService = async (userId, repoId) => {
    const [repository] = await sql`
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
        LEFT JOIN repository_analysis ra ON ra.repository_id = r.id
        WHERE r.id = ${repoId} AND r.user_id = ${userId}
        LIMIT 1
    `;

    if (!repository) throw new Error("Repository not found.");
    if (!repository.summary) throw new Error("Analyze this repository before requesting a roast.");
    return await roastPortfolioWithAI([repository]);
};

export const toggleRepositoryService = async (userId, repoId) => {

    // Check repository belongs to the authenticated user
    const repository = await sql`
        SELECT id, included
        FROM repositories
        WHERE id = ${repoId}
        AND user_id = ${userId}
        LIMIT 1
    `;

    if (repository.length === 0) {
        throw new Error("Repository not found.");
    }

    const newIncludedValue = !repository[0].included;

    await sql`
        UPDATE repositories
        SET
            included = ${newIncludedValue},
            updated_at = NOW()
        WHERE id = ${repoId}
    `;

    return {
        success: true,
        message: `Repository ${newIncludedValue ? "included" : "excluded"
            } successfully.`,
        included: newIncludedValue,
    };
};



export const analyzeRepositoryService = async (userId, repoId) => {
    // ==================================================
    // STEP 1: Get repository + GitHub access token
    // ==================================================s
    const repositories = await sql`
        SELECT r.*, o.access_token
        FROM repositories r
        JOIN oauth_tokens o
            ON r.user_id = o.user_id
        WHERE
            r.id = ${repoId}
            AND r.user_id = ${userId}
            AND o.provider = 'github'
        LIMIT 1
    `;

    if (!repositories.length) {
        throw new Error("Repository not found");
    }

    const repo = repositories[0];
    const accessToken = repo.access_token;

    const headers = {
        Authorization: `Bearer ${accessToken}`,
        Accept: "application/vnd.github+json",
    };

    // ==================================================
    // STEP 2: Fetch GitHub metadata
    // ==================================================

    const [repoRes, languagesRes, commitsRes] = await Promise.all([
        axios.get(
            `https://api.github.com/repos/${repo.owner}/${repo.name}`,
            { headers }
        ),
        axios.get(
            `https://api.github.com/repos/${repo.owner}/${repo.name}/languages`,
            { headers }
        ),
        axios.get(
            `https://api.github.com/repos/${repo.owner}/${repo.name}/commits`,
            {
                headers,
                params: {
                    per_page: 1,
                },
            }
        ),
    ]);

    const githubRepo = repoRes.data;
    const languages = languagesRes.data;




    // ==================================================
    // STEP 3: README
    // ==================================================

    let hasReadme = false;

    try {
        await axios.get(
            `https://api.github.com/repos/${repo.owner}/${repo.name}/readme`,
            { headers }
        );

        hasReadme = true;
    } catch {
        hasReadme = false;
    }

    // ==================================================
    // STEP 4: Latest commit
    // ==================================================

    const latestCommit =
        commitsRes.data.length > 0
            ? commitsRes.data[0].commit.author.date
            : null;


    console.log(latestCommit);


    const existingAnalysis = await sql`
    SELECT *
    FROM repository_analysis
    WHERE repository_id = ${repo.id}
    LIMIT 1
`;

    const priorArchitecture = typeof existingAnalysis[0]?.architecture === "string"
        ? JSON.parse(existingAnalysis[0].architecture)
        : existingAnalysis[0]?.architecture;
    if (
        existingAnalysis.length > 0 &&
        Array.isArray(priorArchitecture?.evidence) && priorArchitecture.evidence.length > 0 &&
        new Date(existingAnalysis[0].latest_commit_at) >= new Date(latestCommit)
    ) {
        console.log("analysis is already done!")
        return {
            success: true,
            cached: true,
            analysis: existingAnalysis[0],
        };
    }
    // ==================================================
    // STEP 5: Primary language
    // ==================================================


    const primaryLanguage =
        githubRepo.language ||
        (Object.keys(languages).length
            ? Object.keys(languages).reduce((a, b) =>
                languages[a] > languages[b] ? a : b
            )
            : null);

    // ==================================================
    // STEP 6: Collect repository context
    // ==================================================

    const context = await buildRepositoryContext({
        accessToken,
        owner: repo.owner,
        repo: repo.name,
        githubRepo,
    });

    // ==================================================
    // STEP 7: AI Analysis
    // ==================================================

    const aiAnalysis = await analyzeRepositoryWithAI(context);
    const validated = validateAnalysisEvidence(aiAnalysis, context, repo);
    aiAnalysis.strengths = validated.findings.strengths;
    aiAnalysis.weaknesses = validated.findings.weaknesses;
    aiAnalysis.recommendations = validated.findings.recommendations;
    aiAnalysis.architecture = {
        ...(aiAnalysis.architecture && typeof aiAnalysis.architecture === "object" ? aiAnalysis.architecture : {}),
        evidence: validated.evidence,
    };

    /*
        aiAnalysis should return:

        {
            summary,
            strengths,
            weaknesses,
            recommendations,
            architecture,
            technologies,
            scores: {
                documentation,
                codeQuality,
                maintainability,
                security,
                overall
            }
        }
    */

    // ==================================================
    // STEP 8: Save everything
    // ==================================================

    await saveRepositoryAnalysis(repo.id, {
        // -------- Repository Metadata --------
        languages,
        primaryLanguage,
        topics: githubRepo.topics,

        hasReadme,
        hasLicense: !!githubRepo.license,
        latestCommit,

        homepage: githubRepo.homepage,

        stars: githubRepo.stargazers_count,
        forksCount: githubRepo.forks_count,
        watchersCount: githubRepo.watchers_count,
        openIssues: githubRepo.open_issues_count,

        // -------- AI Analysis --------
        summary: aiAnalysis.summary,

        strengths: aiAnalysis.strengths,
        weaknesses: aiAnalysis.weaknesses,
        recommendations: aiAnalysis.recommendations,

        architecture: aiAnalysis.architecture,
        technologies: aiAnalysis.technologies,

        // -------- Health Scores --------
        architectureScore: aiAnalysis.scores.architecture,
        documentationScore: aiAnalysis.scores.documentation,
        codeQualityScore: aiAnalysis.scores.codeQuality,
        maintainabilityScore: aiAnalysis.scores.maintainability,
        securityScore: aiAnalysis.scores.security,
        testingScore: aiAnalysis.scores.testing,
        deploymentScore: aiAnalysis.scores.deployment,
        overallScore: aiAnalysis.scores.overall,

        // Backward compatibility (if still used elsewhere)
        score: aiAnalysis.scores.overall,
    });

    // ==================================================
    // STEP 9: Return response
    // ==================================================

    return {
        success: true,
        message: "Repository analyzed successfully.",

        analysis: {
            repositoryId: repo.id,

            // -------- Repository Metadata --------
            languages,
            primaryLanguage,
            topics: githubRepo.topics,

            hasReadme,
            hasLicense: !!githubRepo.license,
            latestCommit,

            homepage: githubRepo.homepage,

            stars: githubRepo.stargazers_count,
            forksCount: githubRepo.forks_count,
            watchersCount: githubRepo.watchers_count,
            openIssues: githubRepo.open_issues_count,

            // -------- AI Analysis --------
            summary: aiAnalysis.summary,
            strengths: aiAnalysis.strengths,
            weaknesses: aiAnalysis.weaknesses,
            recommendations: aiAnalysis.recommendations,

            architecture: aiAnalysis.architecture,
            technologies: aiAnalysis.technologies,

            // -------- Health Scores --------
            scores: {
                architecture: aiAnalysis.scores.architecture,
                documentation: aiAnalysis.scores.documentation,
                codeQuality: aiAnalysis.scores.codeQuality,
                maintainability: aiAnalysis.scores.maintainability,
                security: aiAnalysis.scores.security,
                testing: aiAnalysis.scores.testing,
                deployment: aiAnalysis.scores.deployment,
                overall: aiAnalysis.scores.overall,
            },
        },
    };
};

export const getRepositoryHealthService = async (
    userId,
    repositoryId
) => {
    const result = await sql`
        SELECT
            r.id,
            r.name,

            ra.overall_score,
            ra.architecture_score,
            ra.documentation_score,
            ra.security_score,
            ra.testing_score,
            ra.maintainability_score,
            ra.deployment_score

        FROM repositories r
        JOIN repository_analysis ra
            ON r.id = ra.repository_id

        WHERE
            r.id = ${repositoryId}
            AND r.user_id = ${userId}

        LIMIT 1
    `;

    if (!result.length) {
        throw new Error("Repository not found.");
    }

    const repo = result[0];

    return {
        repository: {
            id: repo.id,
            name: repo.name,
        },
        health: {
            overall: repo.overall_score,
            architecture: repo.architecture_score,
            documentation: repo.documentation_score,
            security: repo.security_score,
            testing: repo.testing_score,
            maintainability: repo.maintainability_score,
            deployment: repo.deployment_score,
        },
    };
};

export const analyzeAllRepositoriesService = async (userId) => {
    const limit = pLimit(3);

    const repositories = await sql`
        SELECT id , github_repo_id, name
        FROM repositories
        WHERE user_id = ${userId};
    `;

    if (!repositories.length) {
        throw new Error("No repositories found.");
    }

    const results = await Promise.all(
        repositories.map(repo =>
            limit(async () => {
                try {
                    const analysis = await analyzeRepositoryService(
                        userId,
                        repo.id
                    );

                    return {
                        repository: repo.name,
                        githubRepoId: repo.github_repo_id,
                        success: true,
                        analysis: analysis.analysis,
                    };
                } catch (error) {
                    return {
                        repository: repo.name,
                        githubRepoId: repo.github_repo_id,
                        success: false,
                        error: error.message,
                    };
                }
            })
        )
    );

    return {
        success: true,
        totalRepositories: repositories.length,
        successful: results.filter(r => r.success).length,
        failed: results.filter(r => !r.success).length,
        results,
    };
};

export const analyzePublicPortfolioRepositoryService = async (slug, repositoryId) => {
    const [repository] = await sql`
        SELECT u.id AS user_id, r.id AS repository_id
        FROM users u
        JOIN repositories r ON r.user_id = u.id
        WHERE (u.portfolio_slug = ${slug} OR LOWER(u.github_username) = LOWER(${slug}))
            AND r.id = ${repositoryId}
            AND r.included = true
            AND r.private = false
        ORDER BY CASE WHEN u.portfolio_slug = ${slug} THEN 0 ELSE 1 END
        LIMIT 1
    `;

    if (!repository) throw new Error("Public portfolio repository not found.");
    return await analyzeRepositoryService(repository.user_id, repository.repository_id);
};
