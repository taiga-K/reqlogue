# Transcription API

The FastAPI process accepts health checks and turns a PCM body into transcript JSON. With `REQLOGUE_TRANSCRIBER=stub` the completed text is always `stub transcript`. The browser is not involved.

## Sub-features

- `api-health` `GET /health` returns `{"status":"ok"}`.
- `api-transcribe-stub` `POST /v1/transcription` with `Content-Type: application/octet-stream` returns `{"text":"stub transcript"}`.
- `api-transcribe-shape` the JSON has no `speaker` field.

## How to get to it (user POV)

- Run the API as documented: `cd api && uv sync --extra dev && REQLOGUE_TRANSCRIBER=stub uv run uvicorn reqlogue_api.main.app:app --host 127.0.0.1 --port 8017` (verification uses `helpers/launch --with-api` on port `8017`).
- `GET http://127.0.0.1:8017/health`
- `POST http://127.0.0.1:8017/v1/transcription` with a binary body.

The Next.js app calls this same POST from the live (non-mocked) transcriber. That browser path is not this feature.

## Driving it with verify-reqlogue

Preconditions:

- This run was launched with `.cursor/skills/verify-reqlogue/helpers/launch --with-api`.
- Doctor reports the API PID owns port `8017` and `/health` is `{"status":"ok"}`.
- If doctor says `api not in this run`, stop. Re-launch with `--with-api`. Do not claim a mocked web capture as this feature.

- **Health.** Run `.cursor/skills/verify-reqlogue/helpers/drive transcription-api`. `GET $REQLOGUE_VERIFY_API_URL/health` returns status `200` and body `{"status":"ok"}`.
- **Stub transcribe.** `POST $REQLOGUE_VERIFY_API_URL/v1/transcription` with header `Content-Type: application/octet-stream` and body bytes `00 01` returns status `200` and JSON `{"text":"stub transcript"}`.
- **Shape.** The JSON object has no `speaker` property.
- **Proof.** `evidence/transcription-api/http.json` and `result.json` contain both responses. A web screenshot is not proof of this feature.

## Gotchas

- `helpers/launch` without `--with-api` leaves this feature unreachable. Report the unmet precondition; do not hit `:8000` on a shared process.
- Stub mode never calls OpenAI. `OPENAI_API_KEY` is not required and must not be needed for this proof.
- Empty PCM still returns `200` with `{"text":""}` from the domain rule; the recipe uses a non-empty body so the stub string appears.
- CORS is not exercised by this curl/fetch path. Browser capture against a live API is a different proof and needs `NEXT_PUBLIC_API_MOCKING` unset at launch.
- `503 {"status":"unavailable"}` means `transcribe_audio` raised. Any transcriber exception becomes that response, not only an OpenAI failure. Stub verification does not take this path.
