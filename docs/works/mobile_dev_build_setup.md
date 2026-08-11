# モバイル Dev Build 環境構築（未着手タスク）

最終更新: 2026-08-11
ステータス: 未着手（方式は確定済み。下記「方式」参照。着手ブランチでの実施を待つ）

## 背景・目的

地図レンダラとして採用している `@maplibre/maplibre-react-native`（`docs/domain/01_基本設計/03_アーキテクチャと技術選定.md`）は Expo Go 非対応で、Dev Buildが必須。現状の `mobile/`（S-001実装スケルトン作成時点）はExpo管理ワークフローのままで、`ios/` / `android/` ネイティブフォルダも存在しない。

地図を扱う画面（S-001 マップ/ホーム、S-002 トラッキング、S-008 GPXインポート 等）の実機/シミュレータでの動作確認には、本タスクの完了が前提になる。S-001の実装スコープ自体（`docs/spec/S-001/plan.md`）には含めず、独立したタスクとして切り出す。

## 開発環境の棲み分け（2026-08-11確定）

モバイル開発は次の2環境を用途で使い分ける。同期はgit（push/pull）のみで行い、DevContainerとMac間でファイルシステムを直接共有することはしない。

| 環境 | 用途 | できること |
|---|---|---|
| **Mac（ローカル、通常時）** | 通常の開発・動作確認 | コード編集、`expo prebuild`＋ローカルXcodeでのビルド、iOSシミュレータでの動作確認 |
| **DevContainer（Mac不可時、`.devcontainer/`参照）** | Macが使えない状況でのコーディングのみ | コード編集、型チェック（`tsc`）・lint・ユニットテスト。**シミュレータ/実機での動作確認は不可**（Linuxコンテナのため。リモートSSHサーバでも同じ制約） |

DevContainer側で書いたコードはcommit→push、Mac側でpull、という通常のgit運用で同期する。DevContainer上でモバイルアプリを実行・検証することは想定しない。

## スコープ

- `expo-dev-client` の導入
- `npx expo prebuild` によるネイティブプロジェクトの生成・ローカルXcodeでのビルド確認
- `@maplibre/maplibre-react-native` を導入し、最小限のMapViewがiOSシミュレータ上で描画できることを確認する
- 完了後、S-001以降の地図関連画面のtasks/implement工程がDev Build上で動作確認できる状態にする

## 方式（確定）

| 方式 | 内容 | 採否 |
|---|---|---|
| (a) ローカル完結 | `npx expo install expo-dev-client` → `npx expo prebuild` で `ios/`/`android/` を生成 → ローカルXcodeでシミュレータ向けにビルド | **採用**。Apple Developer Program登録不要で、Mac上での通常開発フローに合致する |
| (b) EAS Build | EAS CLI導入・`eas.json` 作成 → クラウドビルド | **不採用**。Apple Developer Programアカウントを保有していないため実施しない |

`npx expo prebuild` が生成する `ios/` / `android/` フォルダはgit管理せず（`.gitignore`対象のまま）、常に `app.json`/config pluginsから再生成する「Continuous Native Generation」方針とする。生成後のネイティブフォルダを直接手編集・コミットしない。

## 想定タスク（着手ブランチでの作業イメージ）

1. `npx expo install expo-dev-client` を実行する
2. `npx expo prebuild` を実行し、Xcodeでビルド・iOSシミュレータでの起動を確認する
3. `@maplibre/maplibre-react-native` を導入し、最小限のMapView（タイルが表示されるだけの画面）で動作確認する
4. `docs/domain/01_基本設計/08_ブランチ戦略.md` に従い、`feature/mobile-dev-build` 等のブランチで実施し、PRを出す前に全テストが成功していることを確認する

## 関連ドキュメント

- 技術選定（MapLibre採用方針）: `docs/domain/01_基本設計/03_アーキテクチャと技術選定.md`
- S-001 受け入れ基準（本タスク完了が前提となる画面）: `docs/spec/S-001/spec.md`
- S-001 実装計画: `docs/spec/S-001/plan.md`
- ブランチ戦略: `docs/domain/01_基本設計/08_ブランチ戦略.md`
- DevContainer構成: `docs/domain/01_基本設計/07_基盤設計.md`「Devcontainer」節
