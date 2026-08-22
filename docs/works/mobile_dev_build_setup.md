# モバイル Dev Build 環境構築（未着手タスク）

最終更新: 2026-08-11

ステータス: 未着手（別ブランチで着手予定）

## 背景・目的

地図レンダラとして採用している `@maplibre/maplibre-react-native`（`docs/domain/01_基本設計/03_アーキテクチャと技術選定.md`）は Expo Go 非対応で、Dev Build または EAS Build が必須。現状の `mobile/`（S-001実装スケルトン作成時点）はExpo管理ワークフローのままで、`ios/` / `android/` ネイティブフォルダも `eas.json` も存在しない。

地図を扱う画面（S-001 マップ/ホーム、S-002 トラッキング、S-008 GPXインポート 等）の実機/シミュレータでの動作確認には、本タスクの完了が前提になる。S-001の実装スコープ自体（`docs/spec/S-001/plan.md`）には含めず、独立したタスクとして切り出す。

## スコープ

- `expo-dev-client` の導入
- ネイティブプロジェクトの生成・ビルド確認（下記「方式」いずれかを選択）
- `@maplibre/maplibre-react-native` を導入し、最小限のMapViewが実機またはシミュレータ上で描画できることを確認する
- 完了後、S-001以降の地図関連画面のtasks/implement工程がDev Build上で動作確認できる状態にする

## 方式（着手時にユーザーへ確認すること。ここでは決定していない）

| 方式 | 内容 | メリット | デメリット |
|---|---|---|---|
| (a) ローカル完結 | `npx expo install expo-dev-client` → `npx expo prebuild` で `ios/`/`android/` を生成 → ローカルXcodeでシミュレータ向けにビルド | Apple Developer Program登録不要。ローカルで完結し即着手できる | 実機テストは不可（シミュレータのみ） |
| (b) EAS Build | EAS CLI導入・`eas.json` 作成 → `eas build --platform ios --profile development` でクラウドビルド | 実機での動作確認が可能 | Apple Developer Program登録済みアカウントが前提。ビルド待ち時間が発生 |

plan-agentの見立てでは、Apple Developer Program登録の有無がまだ確認できていないため、まずは (a) ローカル完結案が着手しやすい候補だが、最終判断は着手時にユーザーへ確認する。

## 想定タスク（着手ブランチでの作業イメージ）

1. 方式（a/b）をユーザーに確認して決定する
2. `npx expo install expo-dev-client` を実行する
3. (a)の場合: `npx expo prebuild` を実行し、Xcodeでビルド・iOSシミュレータでの起動を確認する
   (b)の場合: EAS CLIを導入し `eas.json` を作成、Apple Developer Programアカウントと連携し `eas build --platform ios --profile development` を実行する
4. `@maplibre/maplibre-react-native` を導入し、最小限のMapView（タイルが表示されるだけの画面）で動作確認する
5. `docs/domain/01_基本設計/08_ブランチ戦略.md` に従い、`feature/mobile-dev-build` 等のブランチで実施し、PRを出す前に全テストが成功していることを確認する

## 関連ドキュメント

- 技術選定（MapLibre採用方針）: `docs/domain/01_基本設計/03_アーキテクチャと技術選定.md`
- S-001 受け入れ基準（本タスク完了が前提となる画面）: `docs/spec/S-001/spec.md`
- S-001 実装計画: `docs/spec/S-001/plan.md`
- ブランチ戦略: `docs/domain/01_基本設計/08_ブランチ戦略.md`
