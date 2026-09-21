# Session banner

The session page header identifies reqlogue and, when the meeting has a name, shows only that name. It has no actions. A blank-name session keeps the wordmark and omits the heading.

## Sub-features

- `banner-wordmark` shows image `reqlogue` in the session banner.
- `banner-named` shows heading equal to the meeting name and nothing else in the banner.
- `banner-blank` omits the heading when the user started with an empty name.
- `banner-quiet` has no buttons, no links, and none of the retired copy `自動更新` or `マインドマップ`.

## How to get to it (user POV)

- Choose `はじめる` on home with a name to see the named banner.
- Choose `はじめる` on home with an empty name to see the wordmark-only banner.
- Reload an existing `/session/<uuid>` whose meeting record is still stored.

There is no settings control that changes the banner.

## Driving it with verify-reqlogue

Preconditions:

- Doctor reports healthy at `http://127.0.0.1:3317`.
- Start from home so the meeting record exists. A random UUID with no stored record looks like the blank banner and is not this feature's named path.

- **Named banner.** Run `.cursor/skills/verify-reqlogue/helpers/drive session-banner`. The helper starts `新サービスの打ち合わせ` from home. Banner image `reqlogue` is visible. Banner heading is `新サービスの打ち合わせ`. Banner button count is `0` and banner link count is `0`. Page text does not include `自動更新` or `マインドマップ`. Shot `00-named`.
- **Blank banner.** The helper returns to home and chooses `はじめる` with an empty field. Heading count is `0`. Banner image `reqlogue` remains visible. Shot `01-blank`.
- **Proof.** `evidence/session-banner/00-named.png`, `00-named.aria.txt`, `01-blank.png`, `01-blank.aria.txt`, and `result.json` show the wordmark and the named heading only on the named path.

## Gotchas

- The heading is the meeting name, not a generic "Session" title. Assert the typed string.
- An empty stored name and a missing stored record both omit the heading. Prove blank by actually submitting an empty home form in this run.
- Capture chrome (`会議を開始`) sits outside the banner. Query `getByRole("banner")` before counting buttons.
- Reloading a replaced meeting URL shows the blank banner because home start cleared the old record. That is `home-replace`, not a banner bug.
