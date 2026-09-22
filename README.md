# reqlogue

要件定義ヒアリングを支援する AI エージェント。会議音声をリアルタイムで文字起こしし、その場でマインドマップを更新し、曖昧・矛盾・漏れを検出して助言を行い、会議終了後に Markdown 形式の要件定義書を出力します。

使うのはブラウザだけであり、会議の相手（クライアント等）は通常の Google Meet などのまま参加します。初回認証はありません。

---

## リポジトリ構成（モノレポ構造）

本リポジトリはフロントエンド（Next.js）とバックエンド（FastAPI）の関心事を明確に分離したモノレポ構成を採用しています。

```
reqlogue/
├── web/                  # Next.js 16 App Router (TypeScript) / FSD
│   ├── app/              # Next.js ルーティング入口（薄い再エクスポート）
│   ├── e2e/              # Playwright E2E テスト
│   ├── src/
│   │   ├── _pages/       # FSD pages レイヤー（画面単位コンポジション）
│   │   ├── entities/     # FSD entities レイヤー（会議・要件ドメインモデル・ストレージ）
│   │   └── shared/       # FSD shared レイヤー（共通 UI・ユーティリティ・API 連携）
│   └── package.json
├── api/                  # Python 3.12+ / FastAPI / Clean Architecture (uv 管理)
│   ├── src/reqlogue_api/
│   │   ├── domain/       # 純粋なドメインモデル・ビジネスルール
│   │   ├── application/  # ユースケース・ポート（インターフェース）
│   │   ├── infrastructure/# Whisper・OrcaRouter 外部連携・スタブ
│   │   ├── presentation/ # FastAPI HTTP ルーター・スキーマ
│   │   └── main/         # 設定読み込み・依存性注入（DI）・アプリ起動配線
│   ├── tests/            # 単体テスト・HTTP 契約検証
│   └── pyproject.toml
├── contracts/
│   └── openapi.yaml      # HTTP 契約の正本（web と api の共有資産）
├── docs/                 # プロジェクト方針・設計ドキュメント
├── .github/
│   └── workflows/
│       ├── frontend-verify.yml # フロントエンド自動検証・E2E CI
│       └── api-verify.yml      # バックエンド自動検証 CI
└── AGENTS.md             # リポジトリ恒久設計規約・開発ルール
```

---

## 技術スタック

| 領域 | 採用技術 |
| :--- | :--- |
| **ユーザー対応言語** | 日本語（Japanese） |
| **フロントエンド FW** | Next.js 16.3.5 (App Router, React 19.2.8) |
| **フロントエンド設計** | Feature-Sliced Design (FSD) |
| **フロントエンド言語** | TypeScript 5 (Strict Mode) |
| **フロントエンド UI 部品** | shadcn/ui, Tailwind CSS |
| **マインドマップ描画** | markmap (`markmap-lib`, `markmap-view`) |
| **要件定義書描画** | `react-markdown` |
| **フロントエンド パッケージ管理** | `pnpm` (10.33.3, lockfile 必須) |
| **フロントエンド検証** | Steiger (FSD構造検証), ESLint, `tsc --noEmit`, Storybook stories check, Vitest, Playwright E2E |
| **バックエンド FW** | FastAPI + Uvicorn |
| **バックエンド設計** | Clean Architecture |
| **バックエンド言語** | Python >=3.12 |
| **バックエンド パッケージ管理** | `uv` (lockfile 必須) |
| **バックエンド検証** | Ruff (lint), Mypy (strict), Pytest (HTTP契約・単体テスト) |
| **音声認識 (STT)** | OpenAI GPT-Realtime-Whisper (バックエンド経由) |
| **AI Gateway** | OrcaRouter (`orcarouter/meeting-support-lite`, `orcarouter/requirements-quality`) |
| **API 契約** | OpenAPI 3.1 (`contracts/openapi.yaml`) |
| **CI/CD** | GitHub Actions (Node 22 / uv) |

---

## 環境変数

フロントエンドから OpenAI や OrcaRouter へ直接通信しません。外部 LLM / 音声認識キーはバックエンド（FastAPI）だけが保持します。

### バックエンド (`api/`)

設定は環境変数から読み込みます。ルートの `.env.example` を参考に設定してください。

| 変数 | 必須 / デフォルト | 説明 |
| :--- | :--- | :--- |
| `OPENAI_API_KEY` | 実運用時は必須 | GPT-Realtime-Whisper 音声認識用 API キー。バックエンドのみで使用します |
| `REQLOGUE_TRANSCRIBER` | 任意 (デフォルト: `OPENAI_API_KEY` 設定時は `openai`、未設定時は `stub`) | 音声文字起こしアダプタの指定 (`stub` または `openai`)。明示的に `stub` が指定されている場合は API キーがあってもスタブが優先されます |
| `ORCAROUTER_API_KEY` | 実運用時は必須 | OrcaRouter API キー。マインドマップ・アドバイス・要件定義書生成で使用します |
| `REQLOGUE_MINDMAP` | 任意 (デフォルト: `ORCAROUTER_API_KEY` 設定時は `orcarouter`、未設定時は `stub`) | マインドマップ・アドバイス・要件定義書のアダプタ指定 (`stub` または `orcarouter`)。明示的に `stub` が指定されている場合は API キーがあってもスタブが優先されます |
| `CORS_ORIGINS` | 任意 (デフォルト: `http://localhost:3000,http://127.0.0.1:3000,http://127.0.0.1:3217`) | 許可する CORS オリジンのカンマ区切りリスト |

※ `REQLOGUE_MINDMAP` はマインドマップ、アドバイス分析、要件定義書ドラフトの生成モードを一括して制御します。

### フロントエンド (`web/`)

| 変数 | 必須 / デフォルト | 説明 |
| :--- | :--- | :--- |
| `NEXT_PUBLIC_API_BASE_URL` | 任意 (デフォルト: `http://127.0.0.1:8000`) | FastAPI バックエンドの接続先 URL |
| `NEXT_PUBLIC_API_MOCKING` | 任意 (CI/モック用) | `enabled` に設定すると、FastAPI を呼び出さずブラウザ内部のスタブ実装および MSW を使用します |

`NEXT_PUBLIC_*` に OpenAI や OrcaRouter の API キーを置かないでください。

---

## クイックスタート

### バックエンド (`api/`)

```bash
cd api
uv sync --extra dev
# スタブモード（外部 API キー不要）で起動する場合:
REQLOGUE_TRANSCRIBER=stub REQLOGUE_MINDMAP=stub uv run uvicorn reqlogue_api.main.app:app --reload --port 8000

# 外部 API（OpenAI / OrcaRouter）を利用して起動する場合:
# export OPENAI_API_KEY="your-openai-key"
# export ORCAROUTER_API_KEY="your-orcarouter-key"
# export REQLOGUE_MINDMAP="orcarouter"
# export REQLOGUE_TRANSCRIBER="openai"
# uv run uvicorn reqlogue_api.main.app:app --reload --port 8000
```

### フロントエンド (`web/`)

```bash
cd web
pnpm install
pnpm dev      # http://localhost:3000
```

---

## デモ手順

### A. 認証なし・外部 API 不要のスタブプレビュー（最短パス）

Google Meet や外部 API キーがない環境でも、音声を含むタブの画面共有とマイク共有を許可すれば、スタブ動作で準備〜会議進行〜マインドマップ・助言〜要件定義書生成の全フローを確認できます。

1. バックエンドをスタブモード（`REQLOGUE_TRANSCRIBER=stub REQLOGUE_MINDMAP=stub`）で起動し、フロントエンドを起動して `http://localhost:3000` を開く。
2. ホーム画面（`/`）で **はじめる** をクリックする（初回ログインは不要）。
3. 会議準備画面（`/prepare`）で会議名（例：「新サービスの打ち合わせ」）を入力し（概要は任意）、**次へ** をクリックする。
4. セッション画面（`/session/[meetingId]`）が表示される。左メニューから「マインドマップ」と「アドバイス」の切り替えができることを確認する。
5. 画面右下の **会議を開始** をクリックする（ブラウザの画面共有・マイク共有許可ダイアログでタブ音声共有を含む許可を行う）。
6. 取り込みが開始されるとボタンが **会議を終了** に切り替わり、スタブ文字起こしからマインドマップ（根ノードが会議名に固定）やアドバイスカードが随時更新される。
7. アドバイスカード（カンバン形式）をドラッグ＆ドロップで「アドバイス」→「対応中」→「解決済み」へ移動したり、各カードの **削除** ボタンで削除できることを確認する。
8. **会議を終了** をクリックすると、要件定義書生成 API が呼ばれ、完了後に `/session/[meetingId]/requirements` へ遷移して 7 つの章立てで構成された Markdown 要件定義書が表示される。

### B. Google Meet 併用の実機シナリオ

1. `OPENAI_API_KEY`、`ORCAROUTER_API_KEY` を設定し、`REQLOGUE_MINDMAP=orcarouter`、`REQLOGUE_TRANSCRIBER=openai` でバックエンドとフロントエンドを起動する。
2. Chrome で Google Meet を開き、相手は通常どおり参加する。
3. reqlogue を Meet の横に並べてブラウザで開き、ホームから **はじめる** を押して会議名を入力し **次へ** を進める。
4. **会議を開始** を押し、画面共有ピッカーで「Chrome タブ」→「Meet のタブ」を選択し、必ず **タブの音声を共有** を ON にして共有する（マイクも許可）。
5. 会議で要件ヒアリングを実施する（曖昧な点や確認漏れがあると自社側画面にのみ助言カードが通知される）。
6. **会議を終了** をクリックすると、発話ログと助言カードの状況を踏まえた要件定義書が OrcaRouter により生成され、プレビュー・確認ができる。

### マインドマップと助言の更新のしかた

- **音声の取得と文字起こし**: ブラウザの `getDisplayMedia`（タブ音声）と `getUserMedia`（マイク音声）を `AudioContext` で合成し、FastAPI（`POST /v1/transcription`）へ送信して文字起こしテキストを取得します。文字起こしテキストはブラウザの `localStorage` に保存され、UI 上には直接表示されません。
- **送信タイミング**: 発話後、確定した文字起こしが 1,500ms 途切れたタイミング（`QUIET_MS`）で更新 API を呼び出します（相槌「うん」「はい」「ええ」のみの場合は送信しません）。未送信テキストがおよそ 200 文字（`CHAR_CUT`）を超えた場合は次の改行で区切って送信し、区切りが来ない場合も 20,000ms（`BOUNDARY_WAIT_MS`）で送信します。先行呼び出しの処理中は多重実行せず、処理完了後に溜まった差分を 1 回にまとめて送信します。
- **マインドマップ更新**: FastAPI（`POST /v1/mindmap`）経由で OrcaRouter（`orcarouter/meeting-support-lite`）を呼び出し、これまでのマインドマップ Markdown と新しい発話差分から完全な markmap Markdown を返します。ルート見出しはフロントエンド側で常に会議名に固定されます（`pinMindmapRoot`）。
- **アドバイス検出**: 同様のタイミングで FastAPI（`POST /v1/advice`）へ発話差分と通知済みテーマ一覧を送信し、1 回あたり最大 2 件の助言カード（タイトル、理由、確認の質問、引用）が返されます。既存カードと重複しないものがカンバンの「アドバイス」列に追加されます。
- **要件定義書の作成**: 会議終了時に FastAPI（`POST /v1/requirements`）へ会議名、全発話ログ、および助言カード一覧を送信し、OrcaRouter（`orcarouter/requirements-quality`）によって 7 つの章立て（概要・ゴール、スコープ、業務フロー、機能要件、非機能要件、未決事項・リスク、変更履歴）を持つ Markdown 要件定義書が生成されます。

---

## 検証コマンド

### フロントエンド (`web/`)

```bash
cd web
pnpm verify       # 型検査・リント・Steiger構造検証・ストーリー検証・単体テスト
pnpm build        # 本番ビルド
pnpm test:e2e     # Playwright E2E テスト
```

### バックエンド (`api/`)

```bash
cd api
uv sync --extra dev
uv run ruff check src tests  # リント検証
uv run mypy src              # 型検査
uv run pytest                # 単体テスト・HTTP契約検証
```
