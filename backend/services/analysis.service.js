// services/repositoryAnalysis.service.js

import { sql } from "../config/db.js";

export const saveRepositoryAnalysis = async (repositoryId, analysis) => {
    await sql`
        INSERT INTO repository_analysis (
            repository_id,

            languages,
            topics,
            has_readme,
            has_license,
            latest_commit_at,

            homepage,
            stars,
            forks_count,
            watchers_count,
            open_issues,
            primary_language,

            architecture_score,
            documentation_score,
            code_quality_score,
            maintainability_score,
            security_score,
            testing_score,
            deployment_score,
            overall_score,
            score,

            summary,
            strengths,
            weaknesses,
            recommendations,
            architecture,
            technologies,

            analyzed_at
        )
        VALUES (
            ${repositoryId},

            ${JSON.stringify(analysis.languages)},
            ${JSON.stringify(analysis.topics)},
            ${analysis.hasReadme},
            ${analysis.hasLicense},
            ${analysis.latestCommit},

            ${analysis.homepage},
            ${analysis.stars},
            ${analysis.forksCount},
            ${analysis.watchersCount},
            ${analysis.openIssues},
            ${analysis.primaryLanguage},

            ${analysis.architectureScore},
            ${analysis.documentationScore},
            ${analysis.codeQualityScore},
            ${analysis.maintainabilityScore},
            ${analysis.securityScore},
            ${analysis.testingScore},
            ${analysis.deploymentScore},
            ${analysis.overallScore},
            ${analysis.score},

            ${analysis.summary},
            ${JSON.stringify(analysis.strengths)},
            ${JSON.stringify(analysis.weaknesses)},
            ${JSON.stringify(analysis.recommendations)},
            ${JSON.stringify(analysis.architecture)},
            ${JSON.stringify(analysis.technologies)},

            NOW()
        )

        ON CONFLICT (repository_id)

        DO UPDATE SET
            languages = EXCLUDED.languages,
            topics = EXCLUDED.topics,
            has_readme = EXCLUDED.has_readme,
            has_license = EXCLUDED.has_license,
            latest_commit_at = EXCLUDED.latest_commit_at,

            homepage = EXCLUDED.homepage,
            stars = EXCLUDED.stars,
            forks_count = EXCLUDED.forks_count,
            watchers_count = EXCLUDED.watchers_count,
            open_issues = EXCLUDED.open_issues,
            primary_language = EXCLUDED.primary_language,

            architecture_score = EXCLUDED.architecture_score,
            documentation_score = EXCLUDED.documentation_score,
            code_quality_score = EXCLUDED.code_quality_score,
            maintainability_score = EXCLUDED.maintainability_score,
            security_score = EXCLUDED.security_score,
            testing_score = EXCLUDED.testing_score,
            deployment_score = EXCLUDED.deployment_score,
            overall_score = EXCLUDED.overall_score,
            score = EXCLUDED.score,

            summary = EXCLUDED.summary,
            strengths = EXCLUDED.strengths,
            weaknesses = EXCLUDED.weaknesses,
            recommendations = EXCLUDED.recommendations,
            architecture = EXCLUDED.architecture,
            technologies = EXCLUDED.technologies,

            analyzed_at = NOW(),
            updated_at = NOW();
    `;

    const [savedAnalysis] = await sql`
        SELECT *
        FROM repository_analysis
        WHERE repository_id = ${repositoryId}
        LIMIT 1
    `;

    return savedAnalysis;
};