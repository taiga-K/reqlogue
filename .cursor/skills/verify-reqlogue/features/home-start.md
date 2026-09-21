# Start a meeting from home

Home lets a user type today's meeting name and press `はじめる`. The app mints a session URL and shows that name on the session banner. A blank name still opens a session. Starting again from home replaces the previous meeting.

## Sub-features

- `home-open` shows the wordmark, headline, name field, and enabled `はじめる` button.
- `home-named` submits a trimmed name and lands on `/session/<uuid>` with that heading.
- `home-persist` keeps the typed name after a reload of the same session URL.
- `home-blank` submits an empty field and still mints a session id with no heading.
- `home-replace` starting another meeting from home replaces the previous stored meeting.

## How to get to it (user POV)

- Open `http://127.0.0.1:3317/` (the launched home page).
- Type into `今日の会議のなまえ` or leave it blank.
- Choose `はじめる`.

There is no other user entry that creates a named meeting. Visiting `/session/<id>` directly does not run this feature.

## Driving it with verify-reqlogue

Preconditions:

- Doctor reports healthy at `http://127.0.0.1:3317`.
- You are proving this feature, not only opening a leftover session tab.

- **Open home.** Go to `/`. Run `.cursor/skills/verify-reqlogue/helpers/drive home-start`. Shot `00-home` shows banner image `reqlogue`, heading `話すことに、集中しよう。`, textbox `今日の会議のなまえ`, and enabled button `はじめる`.
- **Named start.** Fill `新サービスの打ち合わせ` and choose `はじめる`. Shot `01-home-filled` is the form before submit. The URL matches `/session/<uuid>`, does not contain `meetingName`, and the banner heading reads `新サービスの打ち合わせ`.
- **Persist.** Reload that session URL. The banner heading is still `新サービスの打ち合わせ`. `result.json` records one `reqlogue.meeting.*` value that includes that name. Shot `02-session-named` is this state.
- **Blank start.** Return to `/` and choose `はじめる` with an empty field. The URL still matches `/session/<uuid>`. The banner keeps the wordmark and has no heading. Shot `03-session-blank`.
- **Replace.** From `/`, start `旧会議`, then start `新会議` from home again. The heading reads `新会議`. Reloading the `旧会議` session URL no longer shows `旧会議`. Shot `04-session-replaced`.
- **Proof.** `evidence/home-start/00-home.png` through `04-session-replaced.png`, matching `*.aria.txt`, and `result.json` identify reqlogue, the typed names, and the session URLs.

## Gotchas

- `はじめる` stays enabled when the field is blank. Do not wait for it to disable.
- The name is trimmed. Assert the banner heading, not the raw field value with surrounding spaces.
- The session URL is the meeting id. A `meetingName` query string means an old client and fails this feature.
- Starting a new meeting from home clears earlier `reqlogue.meeting.*` keys. A previous session URL is not a stable fixture.
- Directly opening `/session/<uuid>` skips this feature even if a banner appears.
- Reloading a named session hydrates the heading from the stored record. Wait for the heading; the first SSR paint has no name.
