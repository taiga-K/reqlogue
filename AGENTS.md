# reqlogue 開発ガイド

reqlogue は、要件定義ヒアリングを支援する AI エージェントです。会議音声をリアルタイムで文字起こしし、その場でマインドマップを更新し、曖昧・矛盾・漏れを検出して助言を行い、会議終了後に Markdown 形式の要件定義書を出力します。

実装は依頼された機能スライスに限定し、必要なディレクトリやファイルを順次作成します。

## ディレクトリ構成

ルート直下に各デプロイ単位および共有資産を配置します。

| パス | 役割・技術スタック |
|---|---|
| `web/` | フロントエンド: Next.js App Router + FSD (Feature-Sliced Design) |
| `api/` | バックエンド: Python / FastAPI + クリーンアーキテクチャ |
| `contracts/openapi.yaml` | HTTP 契約の正本。web と api が共有する資産 |
| `docs/` | プロジェクト方針・設計ドキュメント |

## `web/` — FSD (Feature-Sliced Design)

フロントエンドは [FSD × Next.js ガイド](https://fsd.how/ja/docs/guides/tech/with-nextjs/) に沿って構成します。Next.js の予約ディレクトリは `web/` 直下に配置し、FSD のレイヤー構造は `web/src/` 配下に集約します。Next.js との名称衝突を避けるため、FSD の `app` / `pages` 層は `_app` / `_pages` とします。

- `web/app/`: Next.js のルーティング入口。ページコンポーネントの再エクスポートを担当
- `src/_pages/`: 各画面の組み立てと画面固有の実装
- レイヤー依存方向: `_app → _pages → widgets → features → entities → shared`
- 構成規則: 各層は必要に応じて順次導入します。単一画面に閉じる処理は画面内に留め、複数画面で再利用する処理を `features/` や `entities/` へ配置します
- Route Handler: 認証クッキーの受け渡しやヘルスチェックなど、ルーティング境界での変換処理を担当します。業務ロジックは `api` へ集約します

## `api/` — クリーンアーキテクチャ

バックエンドは、レイヤー名とディレクトリ名を直接対応させたクリーンアーキテクチャを採用します。コンテキスト分割は境界が明確になった段階で行います。

- `domain`: 純粋なドメインモデルとビジネスルール。外部フレームワークから独立して定義します
- `application`: ユースケースとインターフェース（port）。domain と port を利用して業務フローを組み立てます
- `infrastructure`: port の具体的な実装。Whisper、OrcaRouter、データベースなどの外部アダプターを担当します
- `presentation`: FastAPI ルーターおよび WebSocket ハンドラー。リクエスト・レスポンス DTO（HTTP スキーマ）を定義します
- `main`: 設定読み込み、依存性注入（DI）、アプリケーションの起動配線を担当します
- 依存性の規則: 依存方向は常に外側から内側（presentation / infrastructure → application → domain）へ向けます

## 契約 (`contracts/`)

- `contracts/openapi.yaml` を HTTP 契約の正本として管理します
- `web/src/shared/api/` は `contracts/openapi.yaml` からコード生成したクライアントを利用します
- FastAPI の `/openapi.json` は、CI にて `contracts/openapi.yaml` との整合性を検証します
- リアルタイム音声通信等の仕様が必要になった段階で `contracts/asyncapi.yaml` を追加します
