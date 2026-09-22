# Transcription API

The FastAPI process accepts health checks and turns a PCM body into a mindmap turn. With `REQLOGUE_MINDMAP=stub`, loud PCM returns `{"markdown":"# 会議\n\n- 要件","transcript":"stub transcript"}`. Silence keeps the previous markdown and an empty transcript. The browser is not involved.

## Sub-features

- `api-health` `GET /health` returns `{"status":"ok"}`.
- `api-mindmap-stub` `POST /v1/mindmap` with multipart PCM returns the stub transcript and markdown.
- `api-mindmap-silence` silent PCM returns the previous markdown and `transcript: ""`.
- `api-mindmap-shape` the JSON has no `speaker` field.

## How to get to it (user POV)

- Run the API as documented: `cd api && uv sync --extra dev && REQLOGUE_MINDMAP=stub uv run uvicorn reqlogue_api.main.app:app --host 127.0.0.1 --port 8017` (verification uses `helpers/launch --with-api` on port `8017`).
- `GET http://127.0.0.1:8017/health`
- `POST http://127.0.0.1:8017/v1/mindmap` as `multipart/form-data` with `meetingId`, `previousMarkdown`, and `audio`.

The Next.js app calls this same POST from the live (non-mocked) hearing path. That browser path is not this feature.

## Driving it with verify-reqlogue

Preconditions:

- This run was launched with `.cursor/skills/verify-reqlogue/helpers/launch --with-api`.
- Doctor reports the API PID owns port `8017` and `/health` is `{"status":"ok"}`.
- If doctor says `api not in this run`, stop. Re-launch with `--with-api`. Do not claim a mocked web capture as this feature.

- **Health.** Run `.cursor/skills/verify-reqlogue/helpers/drive transcription-api`. `GET $REQLOGUE_VERIFY_API_URL/health` returns status `200` and body `{"status":"ok"}`.
- **Stub mindmap.** `POST $REQLOGUE_VERIFY_API_URL/v1/mindmap` with loud PCM16 returns status `200` and JSON `{"markdown":"# 会議\n\n- 要件","transcript":"stub transcript"}`.
- **Silence.** The same POST with zero PCM and `previousMarkdown` `# 会議\n\n- 残す` returns that markdown and `transcript: ""`.
- **Shape.** The JSON object has no `speaker` property.
- **Proof.** `evidence/transcription-api/http.json` and `result.json` contain the responses. A web screenshot is not proof of this feature.

## Gotchas

- `helpers/launch` without `--with-api` leaves this feature unreachable. Report the unmet precondition; do not hit `:8000` on a shared process.
- Stub mode never calls OrcaRouter. `ORCAROUTER_API_KEY` is not required and must not be needed for this proof.
- CORS is not exercised by this fetch path. Browser capture against a live API is a different proof and needs `NEXT_PUBLIC_API_MOCKING` unset at launch.
- `503 {"status":"unavailable"}` means mindmap generation raised. Stub verification does not take this path.
