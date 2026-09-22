# Session banner

The session page header identifies reqlogue and, when the meeting has a name, shows only that name. It has no actions. The same header appears on `/prepare` with an empty name, so that screen shows the wordmark only.

## Sub-features

- `banner-wordmark` shows image `reqlogue` in the session banner.
- `banner-named` shows heading equal to the meeting name and nothing else in the banner.
- `banner-quiet` has no buttons, no links, and none of the retired copy `自動更新` or `マインドマップ`.

## How to get to it (user POV)

- Choose `はじめる` on home, fill `会議名`, then choose `次へ` to see the named banner.
- Reload an existing `/session/<uuid>` whose meeting record is still stored.

There is no settings control that changes the banner. The UI does not seed a blank-name session.

## Driving it with verify-reqlogue

Preconditions:

- Doctor reports healthy at `http://127.0.0.1:3317`.
- Start from home so the meeting record exists. A random UUID with no stored record looks like the wordmark-only banner and is not this feature's named path.

- **Named banner.** Run `.cursor/skills/verify-reqlogue/helpers/drive session-banner`. The helper starts `新サービスの打ち合わせ` from home link `はじめる`, then prepare fields, then `次へ`. Banner image `reqlogue` is visible. Banner heading is `新サービスの打ち合わせ`. Banner button count is `0` and banner link count is `0`. Page text does not include `自動更新` or `マインドマップ`. Shot `00-named`.
- **Proof.** `evidence/session-banner/00-named.png`, `00-named.aria.txt`, and `result.json` show the wordmark and the named heading.

## Gotchas

- The heading is the meeting name, not a generic "Session" title. Assert the typed string.
- That heading is absent on the first paint. Wait for it before the named screenshot.
- Capture chrome (`会議を開始`) sits outside the banner. Query `getByRole("banner")` before counting buttons.
- Reloading a replaced meeting URL shows the wordmark-only banner because `次へ` cleared the old record. That is `home-replace`, not a banner bug.
- `/prepare` uses the same header with an empty name. That wordmark-only state is not a session started with a blank name.
