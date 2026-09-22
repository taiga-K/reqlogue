# Start a meeting from home

Home lets a user choose `はじめる` to open `/prepare`. Prepare collects 会議名 and 会議の概要. `次へ` stays disabled until the trimmed name is non-empty, then mints a session URL and shows that name on the session banner. Starting again from prepare replaces the previous meeting when `次へ` is chosen.

## Sub-features

- `home-open` shows the wordmark, headline, no name field, and enabled link `はじめる`.
- `prepare-open` opens `/prepare` with the wordmark, headline, both fields, and disabled `次へ`.
- `home-named` submits a trimmed name and lands on `/session/<uuid>` with that heading.
- `home-persist` keeps the typed name after a reload of the same session URL.
- `home-replace` choosing `次へ` for another meeting replaces the previous stored meeting.

## How to get to it (user POV)

- Open `http://127.0.0.1:3317/` (the launched home page).
- Choose `はじめる`.
- Type into `会議名`. `会議の概要` may stay empty.
- Choose `次へ` once it is enabled.

There is no other user entry that creates a named meeting. Visiting `/session/<id>` directly does not run this feature. A blank or whitespace-only name cannot proceed.

## Driving it with verify-reqlogue

Preconditions:

- Doctor reports healthy at `http://127.0.0.1:3317`.
- You are proving this feature, not only opening a leftover session tab.

- **Open home.** Go to `/`. Run `.cursor/skills/verify-reqlogue/helpers/drive home-start`. Shot `00-home` shows banner image `reqlogue`, heading `話すことに、集中しよう。`, no textbox, and enabled link `はじめる`.
- **Open prepare.** Choose `はじめる`. The URL is `/prepare`. Shot `01-prepare` shows image `reqlogue`, heading `会議の準備をしましょう`, textboxes `会議名` and `会議の概要`, and disabled button `次へ`.
- **Named start.** Fill `新サービスの打ち合わせ`. `次へ` becomes enabled. Shot `02-prepare-filled` is the form before submit. Choose `次へ`. The URL matches `/session/<uuid>`, does not contain `meetingName`, and the banner heading reads `新サービスの打ち合わせ`.
- **Persist.** Reload that session URL. The banner heading is still `新サービスの打ち合わせ`. `result.json` records one `reqlogue.meeting.*` value that includes that name. Shot `03-session-named` is this state.
- **Replace.** From `/`, choose `はじめる`, start `旧会議` with `次へ`, then start `新会議` the same way. The heading reads `新会議`. Reloading the `旧会議` session URL no longer shows `旧会議`. Shot `04-session-replaced`.
- **Proof.** `evidence/home-start/00-home.png` through `04-session-replaced.png`, matching `*.aria.txt`, and `result.json` identify reqlogue, the typed names, and the session URLs.

## Gotchas

- `はじめる` is a link and does not mint a meeting. Do not wait for it to disable.
- `次へ` stays disabled while `会議名` is blank or whitespace-only. Overview text alone does not enable it.
- The name is trimmed. Assert the banner heading, not the raw field value with surrounding spaces.
- The session URL is the meeting id. A `meetingName` query string means an old client and fails this feature.
- Starting a new meeting with `次へ` clears earlier `reqlogue.meeting.*` keys. A previous session URL is not a stable fixture.
- Directly opening `/session/<uuid>` skips this feature even if a banner appears.
- The banner name is read from localStorage after an empty server snapshot. Wait for the heading after the first navigation and after reload; the first paint has no name.
- The session UI does not render the overview. Prove overview storage by reading `reqlogue.meeting.*`.
