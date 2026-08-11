# ローカル開発インフラ設計

作成日: 2026-08-11
ステータス: 承認待ち（ユーザーレビュー中）

## 背景・目的

アプリ実装に入る前に、自宅サーバーに直接触れず、開発者のMac上で完結するローカル開発環境（Dockerコンテナ）を整備する。`docs/domain/01_基本設計/03_アーキテクチャと技術選定.md` の技術スタックを踏まえ、本番（自宅サーバー→将来AWS）と揃えつつローカルで完結できる構成にする。

## 決定事項サマリ

| 論点 | 決定 |
|---|---|
| コンテナ化対象 | DB（Postgres+PostGIS）、MinIO（R2代替）、`api`（Spring Boot）、`web`（Vue） |
| コンテナ化しない対象 | `mobile`（Expo/Xcode。iOSシミュレータはmacOSネイティブ必須） |
| バックエンドビルドツール | Gradle（Kotlin DSL） |
| R2代替 | MinIO（S3互換） |
| Claude API | ローカルではモック（固定応答）。`AI_MOCK=true`で切替。実装はS-007画面実装時 |
| エディタ連携 | `docker compose up` のみ。VS Code devcontainer.jsonは作らない |
| Webの状態管理 | Pinia |
| Webのフォームバリデーション | vee-validate |
| バージョン管理 | 現状gitリポジトリではないため、本設計書コミット前に `git init` する |

## ディレクトリ構成（新規追加分）

```
/
├── docker-compose.yml
├── .env.example（コミット） / .env（.gitignore対象）
├── .gitignore
├── api/                       # Spring Boot + Gradle
│   ├── Dockerfile
│   ├── build.gradle.kts / settings.gradle.kts
│   └── src/main/
│       ├── java/.../HealthController.java   # 最小限のヘルスチェックのみ
│       └── resources/
│           ├── application.yml
│           └── db/migration/
│               ├── V1__init_schema.sql      # 04_データモデル.mdの全12テーブルをそのまま転記
│               └── V2__seed_user.sql        # MVP単一ユーザーのシード
├── web/                        # Vue3 + Vite + TypeScript + Tailwind
│   ├── Dockerfile
│   └── src/
│       ├── App.vue             # APIヘルスチェック結果を表示するだけの最小ページ
│       ├── stores/              # Pinia store配置先（雛形のみ）
│       └── validation/          # vee-validate + yup(or zod) のスキーマ配置先（雛形のみ）
├── pnpm-workspace.yaml          # 現状 web のみ登録。mobile/sharedは着手時に追加
├── package.json                 # ルート（workspace定義＋補助スクリプト）
└── docs/infra/                  # 本設計書の置き場所
```

## Docker Compose構成

| サービス | イメージ/内容 | 公開ポート | 用途 |
|---|---|---|---|
| `db` | `postgis/postgis:16-3.4` | 5432 | PostgreSQL 16 + PostGIS |
| `minio` | `minio/minio` | 9000 (API) / 9001 (Console) | R2代替オブジェクトストレージ |
| `minio-init` | `minio/mc`（起動時のみ実行） | - | 写真/PMTiles用バケットを冪等に作成して終了 |
| `api` | 自前Dockerfile（JDK21 + Gradle、ホットリロード） | 8080（+ debug 5005） | Spring Boot API |
| `web` | 自前Dockerfile（Node20、Vite dev server） | 5173 | Vue ダッシュボード |

補足:
- `db` / `minio` は名前付きボリュームでデータ永続化
- `api` / `web` はソースディレクトリをbind mountし、ホットリロードで開発する
- `api` は `db` のヘルスチェック完了後に起動する（`depends_on: condition: service_healthy`）
- ブラウザ（`web` のフロント）から `api` を呼ぶ経路は `http://localhost:8080`。ブラウザは常にホスト側公開ポート経由でアクセスするため、コンテナ内部DNS名（`api`）は使わない

## 環境変数（.env.example に定義するもの）

- DB接続情報（ホスト/ポート/DB名/ユーザー/パスワード）
- MinIOクレデンシャル・エンドポイント・バケット名
- `ANTHROPIC_API_KEY`（空でよい）、`AI_MOCK=true`
- API/Webの公開ポート、`VITE_API_BASE_URL=http://localhost:8080`

`.env` 実体は `.gitignore` 対象、`.env.example` はプレースホルダー値でコミットする。

## DBスキーマ

`docs/domain/01_基本設計/04_データモデル.md` に記載済みの全12テーブル（`users` / `devices` / `trips` / `tracks` / `track_points` / `regions` / `visited_regions` / `photos` / `expenses` / `comments` / `ai_chat_sessions` / `ai_chat_messages`）とインデックスを、Flywayマイグレーション `V1__init_schema.sql` にそのまま転記する。既に確定済みの設計をそのまま反映するだけであり、画面固有のビジネスロジックを新たに設計するものではないため、インフラ構築の範囲に含める。

`V2__seed_user.sql` で単一MVPユーザーを1行シードする（`users` テーブルのみ）。

**スコープ外**: `regions`（行政区画）への実データ投入（OSM/Natural Earth等からのインポート）は別タスクとする。今回はテーブル定義のみ作成し、空のまま。

## api スケルトンの中身

ヘルスチェックが通り、DBマイグレーションが適用される最小構成に留める（画面の実装はしない）。

- Spring Boot 3.3 / Java 21 / Gradle（Kotlin DSL）
- 依存: `spring-boot-starter-web`, `spring-boot-starter-actuator`, `flyway-core` + `flyway-database-postgresql`, PostgreSQLドライバ, `hibernate-spatial`（PostGISジオメトリ用。実際のエンティティマッピングは各画面実装時）
- CORSで `http://localhost:5173` を許可
- `spring-boot-devtools` でホットリロード

## web スケルトンの中身

同様に最小構成。`/` でAPIのヘルスチェック結果を表示するだけのページとする。

- Vue 3 + Vite + TypeScript
- Tailwind CSS（`docs/domain/01_基本設計/03_アーキテクチャと技術選定.md` の方針どおり）
- **状態管理: Pinia**（`src/stores/` に雛形のみ配置。実際のstoreは各画面実装時に追加）
- **フォームバリデーション: vee-validate**（スケルトン段階では外部スキーマライブラリ（zod/yup等）は追加せず、vee-validate単体のルール記法で最小フォーム例のみ動作確認する。zod/yup等の要否・選定は各画面実装時にplan-agentで判断する。`src/validation/` に雛形のみ配置）

いずれもスケルトン段階では「ライブラリが導入され、最小限の使用例（例: Piniaのcounter的な最小store、vee-validateの最小フォーム1つ）が動作確認できる」レベルに留め、実際の画面バリデーションルール（文字数上限等）は spec-driven ワークフロー（`specify-agent` 等）で画面ごとに実装する。

## Git初期化

現在リポジトリがgit管理されていないため、`.gitignore` 作成後に `git init` し、既存ドキュメント一式＋今回のインフラ構成を初期コミットとしてまとめてコミットする。

## 今回のスコープ外

- `mobile`（Expo）アプリの雛形作成
- `regions` への実データ投入
- 本番（自宅サーバー/AWS）向けのビルド最適化・マルチステージ本番Dockerfile
- CI/CD（GitHub Actions等）の整備
- 認証・APIキー保護の実装

## 未解決事項

なし（前段の質疑応答で主要な論点は解消済み）。
