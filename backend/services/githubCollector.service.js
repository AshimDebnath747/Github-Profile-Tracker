// services/githubCollector.service.js

import axios from "axios";

const githubApi = (accessToken) =>
    axios.create({
        baseURL: "https://api.github.com",
        headers: {
            Authorization: `Bearer ${accessToken}`,
            Accept: "application/vnd.github+json",
        },
    });

/**
 * Fetch complete repository tree
 */
export const fetchRepositoryTree = async (
    accessToken,
    owner,
    repo,
    branch = "main"
) => {
    const github = githubApi(accessToken);

    const { data } = await github.get(
        `/repos/${owner}/${repo}/git/trees/${branch}?recursive=1`
    );

    return data.tree;
};

/**
 * Download a file from GitHub
 */
export const fetchRepositoryFile = async (
    accessToken,
    owner,
    repo,
    path
) => {
    const github = githubApi(accessToken);

    try {
        const { data } = await github.get(
            `/repos/${owner}/${repo}/contents/${path}`
        );

        return {
            path,
            content: Buffer.from(data.content, "base64").toString("utf8"),
        };
    } catch {
        return null;
    }
};

/**
 * Download important project files
 */
export const fetchImportantFiles = async (
    accessToken,
    owner,
    repo
) => {
    const files = [
        "README.md",
        "package.json",
        "tsconfig.json",
        "Dockerfile",
        "docker-compose.yml",
        ".gitignore",
        ".env.example",
        ".prettierrc",
        ".eslintrc",
        ".eslintrc.json",
        ".eslintrc.js",
        "eslint.config.js",
    ];

    const results = await Promise.all(
        files.map((file) =>
            fetchRepositoryFile(accessToken, owner, repo, file)
        )
    );

    return results.filter(Boolean);
};

/**
 * Pick representative source files
 */
export const pickRepresentativeFiles = (tree) => {
    const allowedExtensions = [
        ".js",
        ".ts",
        ".jsx",
        ".tsx",
        ".py",
        ".java",
        ".go",
        ".rs",
    ];

    const ignored = [
        "node_modules/",
        "dist/",
        "build/",
        "coverage/",
        ".next/",
        "public/",
        "assets/",
        "images/",
    ];

    return tree
        .filter((item) => {
            if (item.type !== "blob") return false;

            if (
                ignored.some((dir) => item.path.startsWith(dir))
            )
                return false;

            return allowedExtensions.some((ext) =>
                item.path.endsWith(ext)
            );
        })
        .slice(0, 15)
        .map((item) => item.path);
};

/**
 * Download source files
 */
export const fetchSourceFiles = async (
    accessToken,
    owner,
    repo,
    paths
) => {
    const results = await Promise.all(
        paths.map((path) =>
            fetchRepositoryFile(accessToken, owner, repo, path)
        )
    );

    return results.filter(Boolean);
};

/**
 * Build repository context for AI
 */
export const buildRepositoryContext = async ({
    accessToken,
    owner,
    repo,
    githubRepo,
}) => {
    const tree = await fetchRepositoryTree(
        accessToken,
        owner,
        repo,
        githubRepo.default_branch
    );

    const importantFiles = await fetchImportantFiles(
        accessToken,
        owner,
        repo
    );

    const representativePaths = pickRepresentativeFiles(tree);

    const sourceFiles = await fetchSourceFiles(
        accessToken,
        owner,
        repo,
        representativePaths
    );

    return {
        repository: {
            name: githubRepo.name,
            description: githubRepo.description,
            topics: githubRepo.topics,
            language: githubRepo.language,
            defaultBranch: githubRepo.default_branch,
            visibility: githubRepo.visibility,
        },

        tree: tree.map((t) => ({
            path: t.path,
            type: t.type,
        })),

        importantFiles,

        sourceFiles,
    };
};