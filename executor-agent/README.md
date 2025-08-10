## Executor Agent (Mastra)

Express server that runs a Mastra workflow to extract action items from a sales conversation and execute them via tools (e.g., Slack through Ampersand MCP).

### Endpoints

- POST `/workflow` — body: `{ "conversation": string }`
- GET `/health`

### Prerequisites

- Node.js 18+
- pnpm
- Environment: `OPENAI_API_KEY`, `AMPERSAND_PROJECT_ID`, `AMPERSAND_API_KEY`

### Setup

```bash
pnpm install
pnpm server  # or: pnpm dev / pnpm start
```

### Example

```bash
curl -X POST http://localhost:3000/workflow \
  -H 'Content-Type: application/json' \
  -d '{"conversation":"Alice: Can you send me the payment link? Bob: Sure, I will send it now."}'
```


