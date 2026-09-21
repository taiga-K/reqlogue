# reqlogue — コーディングエージェント向け

要件定義ヒアリング用の AI エージェント。会議音声をリアルタイム文字起こしし、その場でマインドマップを更新し、曖昧・矛盾・漏れを助言し、終了後に Markdown の要件定義書を出す。

実装は依頼されたスライスだけ。空の `web/`・`api/`・`contracts/` や空フォルダを先に量産しない。Turborepo は使わない。

## 置き場

ルート直下にデプロイ単位を置く。`apps/` も `packages/` も作らない。ルートに `package.json` / `pnpm-workspace.yaml` は置かない。

| パス | 役割 |
|---|---|
| `web/` | Next.js App Router + FSD |
| `api/` | FastAPI + クリーンアーキテクチャ |
| `contracts/openapi.yaml` | HTTP 契約の正本。web と api が共有する唯一の資産 |
| `docs/` | 方針・設計 |

後から足してよいもの: `Taskfile.yml`、`contracts/asyncapi.yaml`、`worker/`、`.cursor/` / `skills/`。今は作らない。

## `web/` — FSD

[FSD × Next.js](https://fsd.how/ja/docs/guides/tech/with-nextjs/) に従う。Next.js の予約フォルダは `web/` 直下、FSD 層は `web/src/` だけ。`app` / `pages` 層は `_app` / `_pages` に改名する。

- `web/app/` は再エクスポートだけ。画面は `src/_pages/`
- 層の向き: `_app → _pages → widgets → features → entities → shared`
- 全層を最初から作らない。単一画面の処理を無理に `features/` へ抜かない
- Route Handler は入口の変換（認証クッキー、ヘルスチェック）だけ。業務は `api` へ

## `api/` — クリーンアーキテクチャ

レイヤー名がディレクトリ。コンテキスト分割は境界が分かれてから。

- `domain` — 外側へ依存しない。Pydantic を流用しない
- `application` — domain と port だけを知る
- `infrastructure` — Whisper / OrcaRouter / DB など port の実装
- `presentation` — FastAPI / WebSocket。HTTP スキーマはここ
- `main` — 設定・DI・組み立てだけが実装を配線する

## 契約

- 正本は `contracts/openapi.yaml`。手書きの共有型や TypeScript の `packages/` は禁止
- FastAPI の `/openapi.json` は実行時生成物。CI で `contracts/` と差分を見る
- `web/src/shared/api/` は OpenAPI から生成する。言語が違うので手で鏡写ししない
- リアルタイム契約が固まったら `contracts/asyncapi.yaml` を足す
