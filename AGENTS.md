
# Frontend Development Rules

## Goal
Build the frontend for the existing application using the backend
that is already implemented.

## Backend is the source of truth
- Inspect existing backend routes, controllers, validators and schemas.
- Document the actual API endpoints, request bodies and response shapes.
- Do not rewrite or refactor the backend.
- Do not change database schemas or authentication behavior.
- If an API is missing, report it instead of silently inventing one.

## Frontend implementation
- Follow the requested frontend stack and existing conventions.
- Build reusable components and keep business logic out of pages.
- Use the real backend API, not fabricated production data.
- Handle loading, errors, empty states and authentication.
- Keep secrets out of frontend environment variables.

## Collaboration
- Claude coordinates implementation and integration.
- Codex handles clearly scoped implementation or review tasks.
- Delegate sequentially when tasks overlap.
- Inspect all diffs and run tests before accepting changes.
- Never commit, push, merge, or deploy without user approval.
