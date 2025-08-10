## Butler: agents for B2B buying & selling

Lets your agents talk to other agents selling you software on email, only get involved when it makes sense. 


This folder contains a small mono with:

- `backend/` — FastAPI service orchestrating an agent conversation and persisting state (Firestore)
- `frontend/` — Vite + React UI
- `executor-agent/` — Mastra-based executor that runs a workflow to parse conversations and trigger tool actions (e.g., Slack)

See `AGENTS.MD` for agent conventions and guardrails.

### Prerequisites

- Python 3.12+
- Node.js 18+

### Environment

- Backend: `.env` with `OPENAI_API_KEY=...`; Firebase Admin credentials JSON placed at `backend/creds.json` (path configurable via `backend/constants.py`)
- Executor agent: `OPENAI_API_KEY`, `AMPERSAND_PROJECT_ID`, `AMPERSAND_API_KEY`

### Run

Backend

```bash
cd backend
pip install fastapi uvicorn pydantic python-dotenv firebase-admin agents
uvicorn main:app --reload
```

Frontend

```bash
cd frontend
npm ci
npm run dev
```

Executor Agent

```bash
cd executor-agent
pnpm install
pnpm server  # or: pnpm dev
```

### References

- `AGENTS.MD` in this directory for detailed guidance


