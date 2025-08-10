## Backend (FastAPI)

FastAPI service that starts an agent conversation in the background and exposes a simple history API. Requires an OpenAI API key and Firebase Admin credentials for persistence.

### Prerequisites

- Python 3.12+
- `.env` with `OPENAI_API_KEY=...`
- Firebase Admin service account JSON at `creds.json` (path configurable in `constants.py`)

### Install & Run

```bash
pip install fastapi uvicorn pydantic python-dotenv firebase-admin agents
uvicorn main:app --reload
```

### Endpoints

- `POST /start` — body: `{ "query": string }`
  - Responds as Server‑Sent Events with `init`, periodic `heartbeat`, and a final `done` event
- `GET /history` — returns in‑memory history list
- `GET /` — health/info


