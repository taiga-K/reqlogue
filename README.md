# reqlogue

要件定義ヒアリング用AIエージェント。

会議音声をリアルタイムで文字起こしし、その場でマインドマップを更新し、曖昧・矛盾・漏れを助言したあと、会議終了後に Markdown の要件定義書を作成する。

## 構成

Turborepo + pnpm（TypeScript）と uv workspace（Python）のモノレポ。

| パッケージ | 役割 |
|---|---|
| `apps/web` | Next.js App Router / FSD |
| `apps/api` | FastAPI / Clean Architecture |
| `packages/contracts` | 共有 API 型と OpenAPI |

音声認識は GPT-Realtime-Whisper、マインドマップと要件定義書は OrcaRouter。スケルトンではアダプタを置き、ライブ呼び出しは環境変数で閉じている。

## 起動

```bash
pnpm install
uv sync --package reqlogue-api
cp .env.example .env

pnpm dev:api
pnpm dev:web
```

- Web: http://127.0.0.1:3000
- API: http://127.0.0.1:8000/health
- デモ会議: http://127.0.0.1:3000/meeting （セッション `demo`）

API が止まっていても、Web はプレースホルダの会議面を返す。

## 検証

```bash
pnpm verify
pnpm --filter @reqlogue/web build
pnpm test:e2e
```

CI は `frontend-verify` と `api-verify`。required checks に両方と `frontend-verify / e2e` を登録する。

## プレースホルダ

- `POST /v1/realtime/stt/sessions` — GPT-Realtime-Whisper セッションの仮発行
- `GET /v1/sessions/{id}` — 文字起こし / マインドマップ / 助言
- `GET /v1/sessions/{id}/requirements.md` — Markdown 書き出し
