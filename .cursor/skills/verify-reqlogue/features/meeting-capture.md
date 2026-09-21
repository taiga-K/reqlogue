# Start and end meeting capture

On a session page the user starts tab-and-mic capture, the app stores a transcript for that meeting, and ending the meeting clears it. The session main column does not render transcript text.

## Sub-features

- `capture-start` chooses `会議を開始` and the button becomes `会議を終了`.
- `capture-store` writes `stub transcript` into the stored meeting record while capture is live.
- `capture-hidden` does not show `stub transcript` in the visible page.
- `capture-end` chooses `会議を終了`, the button returns to `会議を開始`, and the stored meeting record is gone.
- `capture-denied` shows status `画面とマイクの共有が必要です` when screen and mic sharing are refused, and keeps `会議を開始`.

## How to get to it (user POV)

- Open a session from home, then choose `会議を開始` on that session page.
- Choose `会議を終了` while capture is live.
- Refuse the browser screen/mic prompts (or equivalent) instead of sharing.

There is no keyboard shortcut. Capture is not available on the home page.

## Driving it with verify-reqlogue

Preconditions:

- Doctor reports healthy at `http://127.0.0.1:3317`.
- The launched web process has `NEXT_PUBLIC_API_MOCKING=enabled` so capture uses the in-app stub transcriber.
- Do not use a live browser profile: the recipe installs fake `getDisplayMedia` / `getUserMedia` streams. A real permission dialog blocks the agent.

- **Start capture.** Run `.cursor/skills/verify-reqlogue/helpers/drive meeting-capture`. The helper starts `新サービスの打ち合わせ` from home, then clicks `会議を開始`. Shot `00-idle` is before the click. The button accessible name becomes `会議を終了`. Shot `01-capturing`.
- **Stored transcript.** While the button still reads `会議を終了`, the `reqlogue.meeting.*` value contains `stub transcript`. The page text `stub transcript` has count `0`.
- **End capture.** Click `会議を終了`. The button returns to `会議を開始`. Every `reqlogue.meeting.*` key is gone. Shot `02-ended`.
- **Permission denied.** The helper opens a second session with `getDisplayMedia` / `getUserMedia` rejected. Click `会議を開始`. A status reads `画面とマイクの共有が必要です` and the button is still `会議を開始`. Shot `03-permission-denied`.
- **Proof.** `evidence/meeting-capture/*.png`, `*.aria.txt`, and `result.json` record the button labels, the stored stub line, the empty store after end, and the denied status. This does not prove FastAPI; see `transcription-api.md`.

## Gotchas

- Without fake media the browser shows a picker the agent cannot complete. Always drive this feature through `helpers/drive meeting-capture`.
- The visible UI never lists the transcript. Counting page text `stub transcript` as a success is a false pass; the proof is the stored record and the button label.
- Ending a meeting deletes the stored record, including the name. The banner heading disappears after `会議を終了` even though the URL is unchanged.
- `NEXT_PUBLIC_API_MOCKING=enabled` is baked into this launch. A green capture here is not a `/v1/transcription` proof.
- Status `タブの音声を共有してください` means the display stream had no audio track. Status `文字起こしに接続できませんでした` is the live-API failure path, which this mocked launch does not take.
