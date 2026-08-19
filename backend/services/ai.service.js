// services/ai.service.js

import axios from "axios";

export const analyzeRepositoryWithAI = async (context) => {
    const prompt = `
You are a senior software architect.

Analyze this GitHub repository.

Repository:

${JSON.stringify(context)}

Evaluate:

- Overall summary
- Folder organization
- Architecture
- Code quality
- Documentation
- Maintainability
- Security
- Best practices

Return ONLY valid JSON.

{
    "summary": "",
    "strengths": [],
    "weaknesses": [],
    "recommendations": [],
    "architecture": {
        "pattern": "",
        "frontend": "",
        "backend": "",
        "database": ""
    },
    "technologies": [],
    "scores": {
        "documentation": 0,
        "codeQuality": 0,
        "maintainability": 0,
        "security": 0,
        "overall": 0
    }
}
`;

    const { data } = await axios.post(
        "https://openrouter.ai/api/v1/chat/completions",
        {
            model: process.env.OPENROUTER_MODEL, // or any OpenRouter model
            temperature: 0.2,
            messages: [
                {
                    role: "system",
                    content:
                        "You are an expert software architect. Always return valid JSON only.",
                },
                {
                    role: "user",
                    content: prompt,
                },
            ],
            response_format: {
                type: "json_object",
            },
        },
        {
            headers: {
                Authorization: `Bearer ${process.env.OPENROUTER_API_KEY}`,
                "Content-Type": "application/json",

                // Optional but recommended
                "HTTP-Referer": process.env.APP_URL,
                "X-Title": "GitHub Portfolio Analyzer",
            },
        }
    );

    console.log(data)

    const content = data.choices[0].message.content;

    return JSON.parse(content);
};

// services/ai.service.js

export const analyzeDeveloperWithAI = async (context) => {
    const prompt = `
You are a senior software architect and technical recruiter.

Analyze this developer based on all of their GitHub repositories.

Repository Data:
${JSON.stringify(context, null, 2)}

Your task is to evaluate the developer as a whole.

Return ONLY valid JSON in the following format:

{
    "summary": "",
    "strengths": [],
    "improvements": [],
    "topTechnologies": [],
    "developerLevel": "",
    "recommendedRoles": [],
    "overallScore": 0
}

Guidelines:
- Summary should be 3-5 sentences.
- Strengths should highlight recurring good practices.
- Improvements should focus on the biggest gaps.
- developerLevel must be one of:
  - Beginner
  - Intermediate
  - Advanced
  - Production Ready
- recommendedRoles should contain 3-5 suitable software roles.
- overallScore should be an integer between 0 and 100.
- Return ONLY JSON.
`;

    const response = await fetch(
        "https://openrouter.ai/api/v1/chat/completions",
        {
            method: "POST",
            headers: {
                Authorization: `Bearer ${process.env.OPENROUTER_API_KEY}`,
                "Content-Type": "application/json",
                "HTTP-Referer": process.env.APP_URL,
                "X-Title": "GitHub Portfolio Analyzer",
            },
            body: JSON.stringify({
                model: process.env.OPENROUTER_MODEL,
                temperature: 0.2,
                messages: [
                    {
                        role: "system",
                        content:
                            "You are an expert software architect and technical recruiter. Always return valid JSON only.",
                    },
                    {
                        role: "user",
                        content: prompt,
                    },
                ],
            }),
        }
    );

    const data = await response.json();

    if (!response.ok) {
        console.error(data);
        throw new Error(
            data.error?.message || "Failed to generate developer analysis."
        );
    }

    if (!data.choices?.length) {
        console.error(data);
        throw new Error("Invalid response received from OpenRouter.");
    }

    let content = data.choices[0].message.content.trim();

    // Remove markdown fences if the model returns them
    if (content.startsWith("```")) {
        content = content
            .replace(/^```(?:json)?/i, "")
            .replace(/```$/, "")
            .trim();
    }

    try {
        return JSON.parse(content);
    } catch (err) {
        console.error("AI returned invalid JSON:", content);
        throw new Error("AI returned malformed JSON.");
    }
};