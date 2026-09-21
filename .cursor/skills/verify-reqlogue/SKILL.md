---
name: verify-reqlogue
description: Drive the reqlogue Next.js web app (primary) and FastAPI transcription API (secondary) the way a user would — launch an isolated instance, doctor it, exercise mapped features, and capture evidence. Use when proving home start, session banner, meeting capture, or stub transcription, or when a change needs a real-browser proof rather than unit tests.
---

# Verify reqlogue

reqlogue is a meeting-hearing assistant. A user names a meeting on the Next.js home page, lands on `/session/<uuid>`, then starts tab+mic capture so FastAPI can transcribe audio. This skill drives that real path. The primary surface is the web app at an isolated `127.0.0.1` port. FastAPI is secondary: the browser talks only to FastAPI, never to OpenAI.

Read `features/README.md` before driving. Prove the mapped entry points for the feature you claim, not a convenient substitute.

## Launch

Never attach to a developer's shared servers on `:3000` (Next `pnpm dev`), `:3217` (Playwright e2e `next start`), or `:8000` (README uvicorn). Those ports are already claimed by other workflows.

From the repo root:

```bash
.cursor/skills/verify-reqlogue/helpers/launch
```

That starts only the web app:

- Command: `pnpm exec next dev --hostname 127.0.0.1 --port 3317` in `web/`
- Env: `NEXT_PUBLIC_API_MOCKING=enabled` and `NEXT_PUBLIC_API_BASE_URL=http://127.0.0.1:8017`
- Ready: `GET http://127.0.0.1:3317/` returns HTML whose `<title>` is `reqlogue` and whose body includes `話すことに、集中しよう。`
- PID, ports, and git SHA are written to `/tmp/reqlogue-verify/<run-id>/run/meta.env`
- The current run id is stored in `/tmp/reqlogue-verify/CURRENT`

To also start the stub FastAPI (required for `transcription-api`):

```bash
.cursor/skills/verify-reqlogue/helpers/launch --with-api
```

That adds `REQLOGUE_TRANSCRIBER=stub uv run uvicorn reqlogue_api.main.app:app --host 127.0.0.1 --port 8017` in `api/`. Ready: `GET http://127.0.0.1:8017/health` returns exactly `{"status":"ok"}`.

Overrides: `REQLOGUE_VERIFY_RUN_ID`, `REQLOGUE_VERIFY_WEB_PORT` (default `3317`), `REQLOGUE_VERIFY_API_PORT` (default `8017`), `REQLOGUE_VERIFY_BASE_DIR` (default `/tmp/reqlogue-verify`). Launch refuses if `/tmp/reqlogue-verify/CURRENT` already points at a live run, or if the chosen ports are listening.

`NEXT_PUBLIC_API_MOCKING=enabled` makes `createTranscriber()` return the in-app stub that immediately appends `stub transcript`. That is the safe capture path. It does **not** exercise FastAPI. The HTTP contract is a separate feature (`transcription-api`). Do not treat a mocked capture as proof that `/v1/transcription` works.

A second isolated instance can run if you pick a new `REQLOGUE_VERIFY_RUN_ID` and unused ports. Browser meeting records live in `localStorage` under `reqlogue.meeting.<id>` and are origin-scoped, so different ports do not share them. Do not double-drive one instance from two agents.

Teardown is `helpers/cleanup` (see Cleanup). Launch also tears down an incomplete run if ready-check fails.

## Doctor

Run this first whenever anything looks off, and the drive helper runs it automatically:

```bash
.cursor/skills/verify-reqlogue/helpers/doctor
```

It is read-only. Healthy means:

- `meta.env` exists for the current run
- the web PID is alive and owns TCP `WEB_PORT` (the listener may be a child of the launched `setsid` PID)
- `GET $WEB_URL/` is the reqlogue home page (title + headline)
- `git rev-parse HEAD` matches the SHA recorded at launch
- `NEXT_PUBLIC_API_MOCKING` recorded for this run is `enabled`
- if the run was started with `--with-api`: the api PID is alive, owns `API_PORT`, and `/health` is `{"status":"ok"}`

Refuse to drive when doctor fails. A page on `:3000` that merely "looks like reqlogue" is not this instance.

## Drive

Harness: Playwright from `web/` (`pnpm exec playwright`, Chromium). Helpers wrap it so you do not invent selectors.

```bash
.cursor/skills/verify-reqlogue/helpers/drive home-start
.cursor/skills/verify-reqlogue/helpers/drive session-banner
.cursor/skills/verify-reqlogue/helpers/drive meeting-capture
.cursor/skills/verify-reqlogue/helpers/drive transcription-api
```

Prefer these stable handles from the running UI and `web/e2e/*.spec.ts`:

| Handle | Role / locator |
|---|---|
| Home wordmark | `getByRole("img", { name: "reqlogue" })` inside `getByRole("banner")` |
| Home headline | `getByRole("heading", { name: "話すことに、集中しよう。" })` |
| Meeting name | `getByRole("textbox", { name: "今日の会議のなまえ" })` |
| Start session | `getByRole("button", { name: "はじめる" })` |
| Session URL | `/session/<uuid>` — must not contain `meetingName` |
| Session name | banner `getByRole("heading", { name: "<typed name>" })` |
| Start capture | `getByRole("button", { name: "会議を開始" })` |
| Stop capture | `getByRole("button", { name: "会議を終了" })` |
| Capture errors | `getByRole("status")` text `画面とマイクの共有が必要です` / `タブの音声を共有してください` / `文字起こしに接続できませんでした` |
| API health | `GET $API_URL/health` |
| API transcribe | `POST $API_URL/v1/transcription` with `Content-Type: application/octet-stream` |

`はじめる` is enabled on a blank name. Submit mints a UUID with `crypto.randomUUID()`, writes `reqlogue.meeting.<id>` after clearing every other `reqlogue.meeting.*` key, and `router.push`es `/session/<id>`. Reloading that URL is the persistence check: `SessionWorkspace` rereads `localStorage` and the banner heading returns.

Meeting capture needs the fake `getDisplayMedia` / `getUserMedia` streams from `web/e2e/session.spec.ts` (`helpers/drive meeting-capture` installs them). Without fakes the browser permission dialog blocks the agent. The session main column is empty: `stub transcript` is stored, not rendered. Visible proof is the button label flipping `会議を開始` ↔ `会議を終了`. Persistence proof is the `reqlogue.meeting.*` value containing `stub transcript`, then becoming empty after `会議を終了`.

Do not click coordinates. Do not call `startNewMeeting` or write `localStorage` from the harness except to read it. Do not POST to `/v1/transcription` from the browser test page and call that a capture proof.

## Evidence

Proof artifacts go to `/tmp/reqlogue-verify/<run-id>/evidence/<feature>/` and **must survive cleanup**. That directory is the named location. `helpers/cleanup` deletes only `/tmp/reqlogue-verify/<run-id>/run/`.

Each drive writes `result.json` plus:

- Web features: `00-*.png` / `00-*.aria.txt` for the state before the action, then numbered after shots. Home-start also keeps the filled-form shot.
- `transcription-api`: `http.json` with status codes and bodies.

Standards:

- Exercise the real user path (home form or session buttons, or the published HTTP contract). No internal setters, no test-only endpoints.
- Capture the action and the resulting state, not only the last screen.
- For mutations, prove a second view: reload the session URL, or re-read `localStorage`, or GET `/health` then POST `/v1/transcription`.
- Mocks are allowed only at the production boundary already in the app: `NEXT_PUBLIC_API_MOCKING=enabled` replaces the FastAPI transcriber inside the browser. Record that the run used mocking. Proving FastAPI requires `--with-api` and the HTTP feature.
- Record the feature id and entry point in `result.json`.
- An unmet precondition is a failed path, not a skip claimed through another path.

## Cleanup

```bash
.cursor/skills/verify-reqlogue/helpers/cleanup
```

Stops only the PIDs in this run's `meta.env` (the `setsid` process groups). It never `pkill next` or `pkill uvicorn`. After processes die it removes `/tmp/reqlogue-verify/<run-id>/run/` and the `CURRENT` pointer. It prints `evidence survived cleanup:` and lists `/tmp/reqlogue-verify/<run-id>/evidence/`.

If a launch or drive fails, run cleanup before the next attempt so ports 3317/8017 are not stranded.

## Helpers

All helpers are executable. Invoke them from the repo root as shown above.

| Script | Purpose |
|---|---|
| `helpers/launch` | Isolated Next dev server; `--with-api` adds stub FastAPI |
| `helpers/doctor` | Read-only health of the launched instance |
| `helpers/drive <feature>` | Doctor, then Playwright/HTTP recipe for one mapped feature |
| `helpers/cleanup` | Kill launched PIDs; keep evidence |

`helpers/lib.sh` is sourced by the bash helpers. `helpers/drive.mjs` is the Playwright/HTTP implementation; call it only through `helpers/drive`.

## Maintenance

After the app's routes, labels, or launch commands change, run `/maintain-verification-skill` so this map stays honest.
