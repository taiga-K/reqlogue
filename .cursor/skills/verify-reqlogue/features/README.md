# reqlogue verification map

This directory is the maintained source for verifying reqlogue's user-facing behavior. Read this index before driving the app, then use the matching feature file as the recipe.

Primary surface: the Next.js app launched by `helpers/launch`. Secondary surface: the FastAPI transcription API launched only with `helpers/launch --with-api`.

## Baseline preconditions

- Launch with `.cursor/skills/verify-reqlogue/helpers/launch` (add `--with-api` only when the feature file requires FastAPI).
- Default URL is `http://127.0.0.1:3317`. Default stub API is `http://127.0.0.1:8017`.
- `NEXT_PUBLIC_API_MOCKING=enabled` is set on the launched web process.
- Run `.cursor/skills/verify-reqlogue/helpers/doctor` and require a healthy isolated instance whose ports are owned by the launched PIDs.
- Never drive `:3000`, `:3217`, or `:8000` unless this skill started them and doctor says they are ours.
- Chromium is installed through `pnpm exec playwright install chromium` in `web/` (the drive helper does this).

## Driving conventions

- Start every recipe from the launched home page unless its preconditions say otherwise.
- Prefer ARIA roles and accessible names over CSS selectors or DOM position.
- Treat every command as literal. Keep Japanese labels unchanged.
- Run browser and HTTP recipes through `.cursor/skills/verify-reqlogue/helpers/drive <feature-id>`.
- Submitting `次へ` on prepare clears every `reqlogue.meeting.*` key, then writes one new record. Do not reuse a previous session URL as if it still held data. `はじめる` only opens `/prepare` and does not mint a meeting.
- Restore nothing in the browser after a mutation; the next home submit wipes prior meetings. Do not delete proof artifacts during cleanup.

## Proof and skip reporting

- Capture the user action and the resulting state, not only the final screen.
- UI proof includes an ARIA snapshot and a screenshot with the reqlogue wordmark visible.
- HTTP proof includes the request, status, and body.
- Mutation proof includes a second read: reload the session, or re-read `reqlogue.meeting.*`, or repeat the HTTP call.
- Record the feature ID and entry point used with every artifact under `/tmp/reqlogue-verify/<run-id>/evidence/<feature>/`.
- Report an unreachable path with the attempted command and the unmet precondition.
- Do not report a skipped entry point as verified through a different path.
- Mocked capture (`NEXT_PUBLIC_API_MOCKING=enabled`) is not proof of FastAPI.

## Feature entry contract

Each feature file starts with an H1 title and one paragraph describing the user-visible behavior. It then uses exactly four H2 sections in this order.

1. `Sub-features` lists short IDs with one line for each behavior.
2. `How to get to it (user POV)` lists every user entry point.
3. `Driving it with verify-reqlogue` starts with `Preconditions:` and uses labeled bullets that pair each user action with an exact command and observable result.
4. `Gotchas` lists traps that can waste or invalidate a verification run.

Keep implementation details out of the map. Name only user paths, stable handles, required state, commands, and observable proof.

## Features

- [Start a meeting from home](./home-start.md) covers the home link, prepare fields, named submit on `次へ`, `/session/<uuid>`, and reload persistence.
- [Session banner](./session-banner.md) covers the wordmark header, named heading, and retired chrome.
- [Start and end meeting capture](./meeting-capture.md) covers `会議を開始` / `会議を終了`, stored stub transcript, and media-permission failures.
- [Transcription API](./transcription-api.md) covers FastAPI `/health` and stub `POST /v1/mindmap`.
