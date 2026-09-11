import axios from "axios";
import { sql } from "../config/db.js";
import { buildRepositoryContext } from "./githubCollector.service.js";
import { analyzeRepositoryWithAI } from "./ai.service.js";
import { saveRepositoryAnalysis } from "./analysis.service.js"
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
            id,
            github_repo_id,
            name,
            owner,
            description,
            default_branch,
            html_url,
            private,
            fork,
            included,
            created_at,
            updated_at
        FROM repositories
        WHERE user_id = ${userId}
        ORDER BY updated_at DESC
    `;

    return {
        success: true,
        count: repositories.length,
        repositories,
    };
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
    console.log(process.env.DATABASE_URL);
    console.log(new URL(process.env.DATABASE_URL).hostname);
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
    SELECT latest_commit_at
    FROM repository_analysis
    WHERE repository_id = ${repo.id}
    LIMIT 1
`;

    if (
        existingAnalysis.length > 0 &&
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