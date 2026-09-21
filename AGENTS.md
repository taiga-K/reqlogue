# reqlogue — コーディングエージェント向け指示

要件定義ヒアリング用の AI エージェント。会議音声をリアルタイムで文字起こしし、その場でマインドマップを更新し、曖昧・矛盾・漏れを助言し、終了後に Markdown の要件定義書を出力する。

実装は依頼されたスライスのみ対応する。空の `web/`・`api/`・`contracts/` や空ディレクトリを事前に量産しない。

## ディレクトリ構成

ルート直下にデプロイ単位を配置する。

| パス | 役割 |
|---|---|
| `web/` | Next.js App Router + FSD |
| `api/` | FastAPI + クリーンアーキテクチャ |
| `contracts/openapi.yaml` | HTTP 契約の正本。web と api が共有する唯一の資産 |
| `docs/` | 方針・設計。コードと一緒に管理する |

## `web/` — FSD

[FSD × Next.js ガイド](https://fsd.how/ja/docs/guides/tech/with-nextjs/) に従う。Next.js の予約ディレクトリは `web/` 直下、FSD 層は `web/src/` 配下のみに配置する。FSD の `app` / `pages` 層は `_app` / `_pages` に改名する。

- `web/app/` は Next.js のルーティング入口とし、再エクスポートのみ行う。画面の実装は `src/_pages/`
- レイヤー依存方向: `_app → _pages → widgets → features → entities → shared`
- 全層を最初から作らない。単一画面の処理を無理に `features/` へ切り出さない
- Route Handler は入口の変換（認証クッキーの橋渡し、ヘルスチェック）のみに留める。業務ロジックは `api` へ委譲する

## `api/` — クリーンアーキテクチャ

レイヤー名がディレクトリ名に対応する。コンテキスト分割は境界が実際に分かれてから行う。

- `domain` — 外側へ依存しない。Pydantic モデルを流用しない
- `application` — domain と port だけに依存する
- `infrastructure` — Whisper / OrcaRouter / DB など port の実装
- `presentation` — FastAPI / WebSocket。HTTP スキーマ（リクエスト・レスポンス DTO）はここに配置する
- `main` — 設定・DI・アプリ組み立てのみが実装を配線する

依存方向: `domain` はフレームワークを知らない。`infrastructure` と `presentation` は `application` の port を実装・呼び出し、内側へは依存しない。

## 契約

- 正本は `contracts/openapi.yaml`
- FastAPI の `/openapi.json` は実行時生成物。CI で `contracts/` と差分を検証する
- `web/src/shared/api/` は OpenAPI からクライアントを生成する
- リアルタイム契約が必要になった段階で `contracts/asyncapi.yaml` を追加する
