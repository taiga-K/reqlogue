# @reqlogue/api

FastAPI service for reqlogue. Layers follow Clean Architecture: `domain` → `application` → `infrastructure` / `presentation`. Composition happens in `main.py`.

```bash
uv sync --package reqlogue-api
pnpm --filter @reqlogue/api dev
```

- `GET /health` and `GET /ready`
- `GET /v1/sessions/{id}` workspace snapshot
- `POST /v1/realtime/stt/sessions` GPT-Realtime-Whisper placeholder
- `GET /v1/sessions/{id}/requirements.md` OrcaRouter placeholder export
