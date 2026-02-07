# Session Notes: E2E Testing Suite

**Date:** 2026-02-07 20:10
**Area:** Testing/E2E
**Type:** test
**Log Entry:** `.claude/agent-log.md` (entry at 2026-02-07 20:10)

## Context

User requested `/test` after implementing `/wizzard` improvements. Ran full E2E test suite against Railway production deployment to verify all functionality works.

## What Was Done

### Phase 1: Discovery
- Fetched OpenAPI spec from /openapi.json — found 11 API endpoints
- Frontend is a single-page app (React SPA)
- No authentication system
- Backend: FastAPI + SQLite on Railway
- Frontend: Vite React on Railway

### Phase 2: API Testing (curl)
- Health check: PASS
- Session CRUD (create, get, list, rename, delete): All PASS
- Brainstorm SSE: FAIL (ANTHROPIC_API_KEY not configured)
- Whitepaper get: PASS; generate: BLOCKED
- Error handling (404, empty message, missing field, max length): All PASS
- Edge cases (XSS, long names, Unicode): 3/4 PASS (XSS not sanitized)

### Phase 3: Frontend Testing (Playwright)
- Created e2e-test.mjs Playwright script
- Page load, title, components: All PASS
- Text input visible by default: PASS (new feature verified)
- Message sending: FAIL (blocked by missing API key)
- Session sidebar: PASS
- No console errors: PASS

### Phase 4: Cleanup
- Deleted all 5 test sessions from production DB
- Verified sessions list empty

## Technical Decisions

| Decision | Rationale | Alternatives |
|----------|-----------|-------------|
| Used curl for API tests | Faster than Playwright for pure API testing | Could use httpie or Python requests |
| Used Playwright for frontend | Real browser testing catches rendering issues | Could use Puppeteer |
| Report-only for infra bugs | Can't fix Railway env vars from code | Could add .env validation on startup |

## Bugs Found

| # | Severity | Root Cause | Fix |
|---|----------|-----------|-----|
| 1 | CRITICAL | Railway service missing ANTHROPIC_API_KEY env var | User must set in Railway dashboard |
| 2 | LOW | No HTML sanitization on SessionCreate model | Add field validator with html.escape() or strip_tags |
| 3 | LOW | No max_length on session name in Pydantic model | Add Field(max_length=200) to SessionCreate |
| 4 | INFO | FastAPI docs_url not disabled for production | Set docs_url=None in production config |

## Gotchas for Future Agents

- **Railway env vars**: The backend runs fine but the AI features require ANTHROPIC_API_KEY. Check this first when debugging production issues.
- **Test data cleanup**: Always delete test sessions after testing. The Railway SQLite DB persists between deployments.
- **Playwright on Windows**: Must `npm install playwright` in the project root to import it from .mjs scripts. The global npx version won't resolve for ESM imports.
- **SSE testing with curl**: Use `timeout N curl -N` to avoid hanging on SSE streams.

---
