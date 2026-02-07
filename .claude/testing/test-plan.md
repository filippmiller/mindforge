# Test Plan

**Generated:** 2026-02-07 19:30
**Frontend URL:** https://mindforge-frontend-production.up.railway.app
**Backend URL:** https://mindforge-production.up.railway.app
**Framework:** React + Vite (frontend), FastAPI (backend)
**Auth System:** None (public, no authentication)
**Scope:** All

## API Endpoints Discovered

| Endpoint | Method | Auth | Priority |
|----------|--------|------|----------|
| /api/health | GET | No | P0 |
| /api/sessions | GET | No | P0 |
| /api/sessions | POST | No | P0 |
| /api/sessions/{id} | GET | No | P1 |
| /api/sessions/{id} | PATCH | No | P1 |
| /api/sessions/{id} | DELETE | No | P1 |
| /api/brainstorm/{id}/message | POST | No | P0 |
| /api/brainstorm/{id}/history | GET | No | P1 |
| /api/whitepaper/{id} | GET | No | P1 |
| /api/whitepaper/{id}/generate | POST | No | P2 |
| /api/competitor/{id}/analyze | POST | No | P2 |

## Frontend Routes

| Route | Type | Description |
|-------|------|-------------|
| / | SPA | Single page app — session sidebar, thinking stream, voice orb, text input |

## Data Flows

| Flow | Steps | Priority |
|------|-------|----------|
| New Session | Click NEW PROJECT or type message → Session created → Appears in sidebar | P0 |
| Brainstorm | Select session → Type/speak → SSE stream → Thinking blocks appear | P0 |
| Session Switch | Click session in sidebar → History loads → Whitepaper updates | P1 |
| Session Delete | Hover session → Click delete → Confirm → Session removed | P1 |
| Whitepaper | Brainstorm until sections fill → Click Generate → Modal with markdown | P2 |

## Test Execution Order

1. API endpoint validation (health, CRUD, brainstorm, error cases)
2. Frontend page load (SPA renders, no console errors)
3. Session CRUD via UI (create, list, switch, delete)
4. Brainstorm flow (send message, receive stream, thinking blocks)
5. Error handling (invalid inputs, non-existent sessions, network errors)
6. Edge cases (empty states, special characters, concurrent requests)
