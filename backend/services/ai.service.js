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
  "languages": {},
  "technologies": [],
  "scores": {
    "architecture": 0,
    "documentation": 0,
    "codeQuality": 0,
    "maintainability": 0,
    "security": 0,
    "testing": 0,
    "deployment": 0,
    "overall": 0
  }
}

Give every score between 0 and 100.

Base the score on actual evidence found in the repository.

Never guess.

If there is insufficient evidence for a category, assign a neutral score (50) and explain why in the recommendations. Do not invent facts.
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


export const roastPortfolioWithAI = async (repositories, mode = "reddit") => {
    const prompt = `
You are an experienced software engineer and comedian.

Your task is to roast a developer's GitHub portfolio.

Roast Style: ${mode}

Rules:
- Be funny and witty.
- Base every roast on actual evidence.
- Never invent problems.
- Mix praise with criticism.
- Roast the code, not the person.
- Mention good repositories if they exist.
- End with one motivating sentence.
- Keep the roast between 200 and 350 words.
- roast all the repositories provided equally

Repository Analysis:
${JSON.stringify(repositories, null, 2)}

Return ONLY valid JSON.

{
    "rating": 0,
    "severity": "light",
    "title": "",
    "roast": "",
    "highlights": [],
    "recommendations": [],
    "funniestMoment": "",
    "closingRemark": ""
}

Guidelines:
- rating: integer between 1 and 10.
- severity: one of "light", "medium", "brutal".
- title: a funny headline.
- highlights: maximum 5.
- recommendations: maximum 5.
`;

    const { data } = await axios.post(
        "https://openrouter.ai/api/v1/chat/completions",
        {
            model: process.env.OPENROUTER_MODEL,
            temperature: 0.8,
            response_format: {
                type: "json_object",
            },
            messages: [
                {
                    role: "system",
                    content:
                        "You are a senior software engineer who writes hilarious but constructive portfolio reviews. Return only valid JSON.",
                },
                {
                    role: "user",
                    content: prompt,
                },
            ],
        },
        {
            headers: {
                Authorization: `Bearer ${process.env.OPENROUTER_API_KEY}`,
                "Content-Type": "application/json",
                "HTTP-Referer": process.env.APP_URL,
                "X-Title": "GitHub Portfolio Analyzer",
            },
        }
    );

    try {
        return JSON.parse(data.choices[0].message.content);
    } catch (err) {
        console.error("Invalid AI response:", data.choices[0].message.content);
        throw new Error("AI returned invalid JSON.");
    }
};


export const analyzeDeveloperDNAWithAI = async (repositories) => {
    const prompt = `
You are a senior software architect and technical recruiter.

Analyze the developer's repositories and determine their Developer DNA.

Only use evidence present in the repository analysis.
Never invent information.

Repository Analysis:

${JSON.stringify(repositories, null, 2)}

Return ONLY valid JSON.

{
  "title": "",
  "description": "",
  "traits": [],
  "strengths": [],
  "weaknesses": [],
  "favoriteTechnologies": [],
  "codingStyle": "",
  "careerLevel": "",
  "idealRoles": [],
  "confidence": 0
}

Rules:
- confidence must be between 0 and 100.
- traits: maximum 6.
- strengths: maximum 5.
- weaknesses: maximum 5.
- favoriteTechnologies: maximum 8.
- idealRoles: maximum 5.
- Base every conclusion on repository evidence.
`;

    const { data } = await axios.post(
        "https://openrouter.ai/api/v1/chat/completions",
        {
            model: process.env.OPENROUTER_MODEL,
            temperature: 0.4,
            response_format: {
                type: "json_object",
            },
            messages: [
                {
                    role: "system",
                    content:
                        "You are an expert software architect. Return only valid JSON.",
                },
                {
                    role: "user",
                    content: prompt,
                },
            ],
        },
        {
            headers: {
                Authorization: `Bearer ${process.env.OPENROUTER_API_KEY}`,
                "Content-Type": "application/json",
                "HTTP-Referer": process.env.APP_URL,
                "X-Title": "GitHub Portfolio Analyzer",
            },
        }
    );

    return JSON.parse(data.choices[0].message.content);
};


export const generateProjectStoryWithAI = async (repository) => {
    const prompt = `
You are a senior software engineer and technical writer.

Generate a compelling story for this GitHub project.

Repository:

${JSON.stringify(repository)}

Return ONLY valid JSON.

{
  "title": "",
  "problem": "",
  "goal": "",
  "approach": "",
  "technicalHighlights": [],
  "challenges": [],
  "keyLearnings": [],
  "impact": "",
  "futureImprovements": []
}

Rules:
- Base the story only on the provided repository data.
- Do not invent features that are not evident.
- Keep the tone professional and suitable for recruiters.
`;

    const { data } = await axios.post(
        "https://openrouter.ai/api/v1/chat/completions",
        {
            model: process.env.OPENROUTER_MODEL,
            temperature: 0.4,
            response_format: {
                type: "json_object",
            },
            messages: [
                {
                    role: "system",
                    content:
                        "You are an expert software engineer. Return valid JSON only.",
                },
                {
                    role: "user",
                    content: prompt,
                },
            ],
        },
        {
            headers: {
                Authorization: `Bearer ${process.env.OPENROUTER_API_KEY}`,
                "Content-Type": "application/json",
                "HTTP-Referer": process.env.APP_URL,
                "X-Title": "GitHub Portfolio Analyzer",
            },
        }
    );

    return JSON.parse(data.choices[0].message.content);
};

export const askPortfolioAI = async (portfolio, question) => {

    const prompt = `
You are an AI assistant for a developer's GitHub portfolio.

Answer ONLY using the information provided.

If the answer cannot be determined from the portfolio, say:
"I couldn't find that information in the portfolio."

Portfolio:

${JSON.stringify(portfolio)}

Question:
${question}
`;

    const { data } = await axios.post(
        "https://openrouter.ai/api/v1/chat/completions",
        {
            model: process.env.OPENROUTER_MODEL,
            temperature: 0.2,
            messages: [
                {
                    role: "system",
                    content:
                        "You are an expert software engineering assistant."
                },
                {
                    role: "user",
                    content: prompt
                }
            ]
        },
        {
            headers: {
                Authorization: `Bearer ${process.env.OPENROUTER_API_KEY}`,
                "Content-Type": "application/json"
            }
        }
    );

    return data.choices[0].message.content;
};