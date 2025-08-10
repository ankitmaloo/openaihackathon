# AI Agent Guidelines for This Repo

This repo is a small monorepo with a Python FastAPI backend and a Vite + React (TypeScript) frontend. This document gives AI coding agents the conventions, run instructions, and guardrails needed to contribute safely and effectively.

## Structure
- `backend/`: FastAPI app orchestrating a two‑agent conversation and persisting to Firestore.
- `frontend/`: Vite + React + Tailwind UI. See `frontend/AGENTS.md` for detailed UI conventions.

## Local Development
### Frontend
- Node: 18+ recommended.
- Install: `npm ci` inside `frontend/`.
- Dev server: `npm run dev`.
- Build: `npm run build`; preview: `npm run preview`.
- Lint: `npm run lint`.

More details and conventions live in `frontend/AGENTS.md` (imports via `@/`, Tailwind usage, naming, PR expectations).

### Backend
- Python: 3.12+ (see `backend/pyproject.toml`).
- Env vars: create `backend/.env` with `OPENAI_API_KEY=...`.
- Firebase Admin credentials: place a service account JSON and ensure `backend/constants.py` points to it (default `creds.json`).
- Install dependencies (not yet pinned in `pyproject.toml`): ensure the following are available in the environment:
  - `fastapi`, `uvicorn[standard]`, `pydantic`, `python-dotenv`, `firebase-admin`, and an `agents` library providing `Agent`, `Runner`, `ItemHelpers`.
- Run API from `backend/`: `uvicorn main:app --reload`.

Endpoints
- `GET /`: health check.
- `POST /start { "query": string }`: kicks off the agent conversation in the background; returns a `conversation_id`.
- `GET /history`: returns in‑memory conversation log for simple polling.

Firestore persistence lives under collection `a2a` with a root conversation doc and a `history/{conversation_id}` doc that is updated each turn.

## Coding Conventions
### General
- Keep changes minimal and scoped; avoid unrelated refactors.
- Prefer small, well‑named functions; add docstrings where helpful.
- Update docs when behavior or commands change.

### Frontend
- Follow the patterns in `frontend/AGENTS.md` (TypeScript strictness, component naming, Tailwind utilities, `@/` alias, ESLint).

### Backend
- Use type hints and FastAPI/Pydantic models where applicable.
- Keep endpoint handlers small; push multi‑step logic into helpers.
- Do not hardcode secrets; use `.env` and service account files.

## Testing
- Frontend: tests not configured; if adding, prefer Vitest + React Testing Library. Co‑locate as `*.test.ts(x)`.
- Backend: no tests yet; if adding, prefer `pytest` and keep tests local to changed modules.

## Security & Secrets
- Never commit secrets or tokens. Redact or mock in examples.
- Treat `backend/creds.json` as sensitive; prefer `.gitignore` for real credentials.
- Validate any external input; avoid executing untrusted data.

## Agent Operating Guidelines
- Make surgical patches: only touch files relevant to the task.
- Do not upgrade or add dependencies unless necessary for the change; if required, document rationale.
- Preserve existing file structure and naming; avoid mass renames.
- Keep user‑facing commands and scripts working; update this doc if you add or change them.
- When ambiguity exists, prefer adding small comments or asking for clarification rather than guessing.

## Quick Runbook
1) Backend
   - Ensure Python 3.12+ and the following are set up:
     - `backend/.env` with `OPENAI_API_KEY`
     - Firebase Admin service account JSON; update `backend/constants.py` if using a non‑default path
     - Install libs: `fastapi uvicorn pydantic python-dotenv firebase-admin agents`
   - Run: `cd backend && uvicorn main:app --reload`

2) Frontend
   - `cd frontend && npm ci && npm run dev`
   - Open the printed local URL to access the UI.

## Notes
- The backend imports an `agents` package that provides `Agent`, `Runner`, and helpers; ensure this dependency is available in your environment.
- If you change API routes or payloads, update the frontend calls and this document.
