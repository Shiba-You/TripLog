# CLAUDE.md

This file provides guidance to Claude Code (claude.ai/code) when working with code in this repository.

## プロジェクトの目的

TripLog は「旅の軌跡を自動で記録し、地図上にコレクションとして可視化する」ことを中心価値とする個人向け旅行記録サービス。位置トラッキングによる経路の地図可視化、訪問済みエリアの塗りつぶし可視化（トロフィー）、GPXインポート、断絶検知通知、写真の自動同期とマッピング、旅費の家計簿、AIおすすめ経路チャットを一つにまとめる。作者本人が自宅サーバでまず使い込み、将来的にOSS化・App Store公開・AWS移行につなげることを目的とする（詳細: `docs/domain/01_基本設計/01_要件定義書.md`）。

## 現在のフェーズ

ローカル開発インフラ（`docs/domain/01_基本設計/07_基盤設計.md`）に基づき、`api`（Spring Boot） / `web`（Vue） / `mobile`（Expo）の各スケルトンとDocker Compose環境（db/minio）を構築済み。`shared` は未着手。いずれもヘルスチェック等の動作確認のみのスケルトンで、画面固有のビジネスロジックは未実装。画面/機能ごとに、後述の Spec-Driven Development ワークフロー（specify → plan → tasks → implement）を通じて実装を進めていく。

## 技術スタック

詳細と選定理由は `docs/domain/01_基本設計/03_アーキテクチャと技術選定.md` を正とする（要約のみ以下に記載）。

| レイヤー | 採用技術 |
|---|---|
| モバイル | React Native（Expo + Dev Build / EAS Build）。`maplibre-react-native` は Expo Go 非対応、Dev Build/EAS Build必須 |
| Web | Vue + MapLibre GL JS |
| スタイル | Tailwind CSS（モバイル/Webでできる限り統一） |
| API契約 | OpenAPI（`docs/domain/01_基本設計/06_API設計.md` に全文あり）。クライアントはこれを参照して型を生成する |
| スキーマバリデーション | yup。フォーム入力値・APIレスポンスの実行時スキーマ検証に使用（モバイル/Webで統一） |
| 地図レンダラ | MapLibre GL（Web: GL JS / RN: `@maplibre/maplibre-react-native`） |
| 地図タイル | Protomaps PMTiles（Cloudflare R2自前ホスト）＋国内は地理院タイル併用可 |
| バックエンド | Java + Spring。JOINが絡むクエリは MyBatis、それ以外は Hibernate（楽観ロック） |
| データベース | PostgreSQL 16 + PostGIS（自宅サーバ運用 → 将来 AWS RDS/Aurora） |
| 写真ストレージ | Cloudflare R2（S3互換、署名付きURL経由でクライアントから直接アップロード） |
| AIチャット | Claude API（サーバ経由で中継、キーをクライアントに出さない） |
| プッシュ通知 | APNs |
| 認証 | MVPはなし（単一ユーザー）。公開時は `X-API-Key` → 将来 Bearer/JWT |
| リポジトリ構成 | pnpm workspaces モノレポ（`api` / `mobile` / `web` / `shared`）。`shared` は未スキャフォールド |

## ディレクトリ構成

- `docs/domain/01_基本設計/` — 要件定義・機能一覧・アーキテクチャ・データモデル・API設計・画面設計（一次情報源）・インフラ設計
- `docs/domain/02_画面定義書/` — 画面ごとの詳細定義（画面項目・処理・SQL相当）。実装前に必ず読む
- `docs/works/` — 作業状況・進捗メモ（例: Figmaプロトタイプ作成の進捗）
- `docs/spec/<画面ID>/` — 画面単位の Spec-Driven Development 成果物（`spec.md` / `plan.md` / `tasks.md`）。下記ワークフロー参照
- `.claude/agents/` — サブエージェント定義（`specify-agent` / `plan-agent` / `tasks-agent` / `implement-agent`）
- `scripts/` — インフラ操作スクリプト（`up.sh` / `down.sh` / `health.sh`）。コンテナの起動・停止・ヘルスチェックは以降これらを使う
- `api` — Spring Bootスケルトン（Gradle, Java 21）
- `web` — Vue3 + Vite + TypeScript + Tailwindスケルトン
- `mobile` — Expo + TypeScriptスケルトン（iOS Dev Build/EAS Buildは未セットアップ）
- `shared` — 未スキャフォールド（型・地図スタイル等の共有コードを配置予定）

## 実装ワークフロー（Spec-Driven Development）

画面・機能を実装する際は、以下の順序でサブエージェントを使う。各成果物は次の工程の入力になるため、工程を飛ばして実装に入らない。

1. `specify-agent` — 画面ID（例: `S-001`）を指定して受け入れ基準を作成 → `docs/spec/<画面ID>/spec.md`
2. `plan-agent` — `spec.md` を読み、アーキテクチャ・データモデル差分・API契約を作成 → `docs/spec/<画面ID>/plan.md`
3. `tasks-agent` — `plan.md` を読み、独立して実装・テスト可能な小タスクに分解しスケジュールを作成 → `docs/spec/<画面ID>/tasks.md`
4. `implement-agent` — `tasks.md` を読み、テスト先行で実装。全タスク完了後に `spec.md` の受け入れ基準を満たすか検証し、満たさない場合は修正する

各エージェントは、判断に必要な情報がドキュメントから確定できない場合、推測で進めずユーザーに確認する（詳細は各エージェント定義ファイル参照）。

## コマンド

- インフラ起動: `./scripts/up.sh`（`.env` がなければ `.env.example` からコピーし `docker compose up -d --build`）
- インフラ停止: `./scripts/down.sh`
- ヘルスチェック: `./scripts/health.sh`（db/minio/api/web を確認、異常時は非ゼロ終了）
- Web開発サーバ: `pnpm web:dev`（Docker内でも起動済み。ホストから直接動かす場合に使用）
- Web型チェック/ビルド: `pnpm web:build`
- モバイル起動: `pnpm mobile:start`（Expo dev server） / `pnpm mobile:ios`
- API: コンテナ内で `./gradlew bootRun` が自動起動（ホットリロード）。単体でビルドする場合は `cd api && ./gradlew build`

画面固有のビルド/テスト/リント（各ワークスペースのlint設定等）は、各画面の実装着手時（tasks-agent/implement-agent）に整備しこのセクションへ追記する。

## ドメイン知識への参照パス

実装・設計判断の前に、対象範囲の一次情報を必ず読むこと。

- 要件定義（スコープ・非機能要件・用語集）: `docs/domain/01_基本設計/01_要件定義書.md`
- 機能一覧・MVPスコープ: `docs/domain/01_基本設計/02_機能一覧.md`
- アーキテクチャ・技術選定・方針: `docs/domain/01_基本設計/03_アーキテクチャと技術選定.md`
- データモデル（テーブル定義・ER図）: `docs/domain/01_基本設計/04_データモデル.md`
- 画面設計（デザイントークン・画面一覧・Figma仕様・画面遷移図）: `docs/domain/01_基本設計/05_画面設計.md`
- API設計（OpenAPI全文・シーケンス図）: `docs/domain/01_基本設計/06_API設計.md`
- 画面ごとの詳細定義（画面項目・処理・クエリ）: `docs/domain/02_画面定義書/<画面ID>_*.md`
- Figmaプロトタイプの進捗・node-id: `docs/works/figma_prototype_progress.md`、および各画面定義書内のURL

## 絶対に守るべき制約

- 全テーブルに `user_id` を持たせる。MVPは単一ユーザー運用だが、将来のマルチユーザー化（RLS導入）を前提にした設計・実装を崩さない。
- 位置情報は機微な個人データとして扱う。バックアップは暗号化し、生の座標をログに出力しない。
- 写真などの大容量バイナリは DB に格納しない。Cloudflare R2 に署名付きURL経由で外出しし、DB には座標・メタデータのみを持たせる。
- 接続先（API / タイル / ストレージの URL）はすべて環境変数で外出しする。自宅サーバ → AWS への移行を設定変更のみで行える状態を維持する。
- 通信は HTTPS 必須。
- 地図はレンダラ（MapLibre）とタイル（PMTiles）を分離し、タイル供給元を差し替え可能にする。スタイル JSON と PMTiles の URL は環境変数化する。
- バックエンドは単一APIサーバ（モノリス）として開始し、Controller / UseCase / Repository の三層で責務を分離する。マイクロサービス化はしない。
- API契約は OpenAPI 定義を正とする。エンドポイントの追加・変更時は OpenAPI 定義（`docs/domain/01_基本設計/06_API設計.md`）を合わせて更新する。
- スコープ外（本MVPでは対応しない）: 複数ユーザー間の共有・公開、Androidアプリ提供、他者とのリアルタイム位置共有、ターンバイターン経路案内、決済・課金機能（`docs/domain/01_基本設計/01_要件定義書.md` 2章参照）。実装時にこれらへ踏み込まない。
- 画面・機能の実装は、対象の `docs/spec/<画面ID>/spec.md` を作成せずに着手しない（上記ワークフロー参照）。
