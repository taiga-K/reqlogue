# reqlogue
要件定義ヒアリングを自律的に進行するAIエージェント

## Local

```bash
cd web && pnpm install && pnpm dev
cd api && uv sync --extra dev && REQLOGUE_TRANSCRIBER=stub uv run uvicorn reqlogue_api.main.app:app --reload --port 8000
```

Set `OPENAI_API_KEY` in a local `.env` when you want FastAPI to call GPT-Realtime-Whisper. Set `ORCAROUTER_API_KEY` and `REQLOGUE_MINDMAP=orcarouter` when you want FastAPI to call `orcarouter/meeting-support-lite`. A key alone does not override `REQLOGUE_MINDMAP=stub`. The browser talks only to FastAPI.
