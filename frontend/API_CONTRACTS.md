# Verified API contracts

The frontend uses `VITE_API_BASE_URL` (defaults to `http://localhost:5000/api`) and sends cookies with every request. Backend authentication reads the `token` cookie and returns `401` with `{ success: false, message }` when it is absent or invalid.

| Method | Path | Request | Verified response |
| --- | --- | --- | --- |
| GET | `/auth/me` | — | `{ success: true, data: { id } }` (`getCurrentUserService` currently returns only the id) |
| POST | `/auth/logout` | — | `{ success: true, message }`; clears the token cookie |
| GET | `/auth/github` | — | Redirects to GitHub OAuth |
| GET | `/dashboard` | — | `{ success: true, dashboard: { overallScore, totalRepositories, languageStats, topRepositories, developerSummary, strengths, improvements } }` |
| GET | `/github/repos` | — | `{ success: true, repos: { success: true, count, repositories: [{ ..., analysis }] } }` |
| POST | `/github/repos/sync` | — | `{ success, message, count }` |
| POST | `/github/repos/:id/toggle` | — | `{ success, message, included }` |
| POST | `/github/repos/:id/analyze` | — | Analysis result; the frontend only relies on success/error status |
| POST | `/github/repos/:id/roast` | — | `{ success, rating, severity, title, roast, highlights, recommendations, funniestMoment, closingRemark }`; requires a saved repository analysis |
| POST | `/github/repos/analyze-all` | — | `{ success, totalRepositories, successful, failed, results }` |
| GET | `/portfolio` | — | `{ success: true, portfolio: object \| null }` |
| POST | `/portfolio/generate` | — | `{ success, portfolioUrl, portfolio: { status, profile, stats, repositories } }` |
| GET | `/portfolio/roast` | — | `{ success, rating, severity, title, roast, highlights, recommendations, funniestMoment, closingRemark }`; requires at least one analyzed repository |
| POST | `/portfolio/:slug/roast` | — | Same roast result for included public repositories; cached for 30 minutes and limited to 8 uncached requests per portfolio/client IP per hour |
| PATCH | `/portfolio` | JSON body | Updates portfolio; frontend does not currently expose editing |
| GET | `/portfolio/:slug` | — | Public portfolio response, `{ success: true, portfolio: { user, repositories, stats } }`; the backend resolves either the saved portfolio slug or the GitHub username for older links |
| POST | `/portfolio/:slug/repositories/:id/analyze` | — | Analyzes an included public repository; saved analysis is returned on the next public portfolio read. Strength, weakness, and recommendation findings are retained only when their quoted excerpt matches a file fetched from that repository; response citations include the source path, line range, and GitHub URL. Results are cached for 15 minutes and uncached runs are rate-limited per portfolio/repository and client IP |

The dashboard shapes are taken from `dashboard.controller.js` and `dashboard.service.js`; repository and portfolio fields are based on their service SQL projections. The current authenticated-user service only returns `id`. Portfolio roasting uses all analyzed repositories for the authenticated user, per the existing backend service.
