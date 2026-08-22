# S-001 マップ（ホーム） タスク分解

## 参照

- docs/spec/S-001/spec.md
- docs/spec/S-001/plan.md
- docs/works/mobile_dev_build_setup.md（別タスク・未着手。地図レイヤー系タスクの実機/シミュレータ確認の前提）

## 前提・スコープメモ

- データモデル変更（マイグレーション）は無し。`plan.md`「データモデル」節の通り既存テーブルのみで実現できるため、db層のタスクは存在しない。
- `@maplibre/maplibre-react-native` を用いるコンポーネント（T-27〜T-30, T-32）は、Dev Build環境構築（`docs/works/mobile_dev_build_setup.md`、未着手）が完了するまで実機/シミュレータ上での描画確認ができない。該当タスクの完了の定義は「型チェック・ユニットテスト・（Jestでの）コンポーネントテストの成功」までとし、Dev Build環境が整い次第、実機/シミュレータでの動作確認を別途行うことをフォローアップとして各タスクに明記する。
- ローカル開発用の地図ベースタイル/スタイルJSONは未整備のため、T-31で暫定対応を別タスク化する（`plan.md`「技術的リスク・懸念点」参照）。

## タスク一覧

### T-1: shared ワークスペースの新設

- レイヤー: shared
- 内容: `pnpm-workspace.yaml` に `shared` を追加。`shared/package.json`・`shared/tsconfig.json` を作成。`docs/domain/01_基本設計/06_API設計.md` のOpenAPI全文を `shared/openapi.yaml` として抽出。`openapi-typescript` をdevDependencyとして導入し、`shared/src/api-types.ts` を生成するスクリプト（`pnpm --filter shared generate:types` 相当）を用意する。
- 対応AC: 無し（`plan.md`のアーキテクチャ方針で位置付け済みの基盤整備。T-2および全mobile API連携タスクの前提）
- 依存タスク: なし
- サイズ: M
- テスト観点: `openapi.yaml` が `06_API設計.md` のOpenAPI全文と内容一致すること（差分レビュー）。生成コマンド実行で `api-types.ts` がエラー無く生成され、5エンドポイント（trips/coverage/photos/tracks/trackPoints）の型が含まれること。`pnpm -r build`（または型チェック）が通ること。
- 状態: 完了

### T-2: shared yupスキーマ（5エンドポイント分）

- レイヤー: shared
- 内容: `shared/src/schemas/` に `tripSchema` / `coverageSchema` / `photoSchema` / `trackSchema` / `trackPointsFeatureSchema` を実装。`shared/src/api-types.ts` の型と整合させる。各スキーマの単体テスト（正常系・欠損値/NULL許容項目を含む異常系）を作成する。
- 対応AC: 無し（実行時スキーマ検証はAPIレスポンス不正時の早期検知が目的。AC-27のエラー状態遷移の一部として間接的に寄与）
- 依存タスク: T-1
- サイズ: M
- テスト観点: 各スキーマにJestテストを作成し、`trips.color`等必須項目の欠落時にバリデーションエラーとなること、`thumbnail_key`/`geom`等nullable項目がNULLでも成功することを確認する。
- 状態: 完了

### T-3: api CurrentUserProvider（シードユーザーID解決）共通基盤

- レイヤー: api
- 内容: `AppConstants.SEED_USER_ID` 定数、および `CurrentUserProvider`（現在のユーザーID解決を担うコンポーネント）を実装する。`plan.md`の通り、直接定数参照を各Controller/UseCaseに埋め込まない構成にする。
- 対応AC: 無し（認証無しMVPで全APIが単一シードユーザーとして動作するための共通基盤。T-4〜T-9の前提）
- 依存タスク: なし
- サイズ: S
- テスト観点: `CurrentUserProvider` の単体テストで、常に `00000000-0000-0000-0000-000000000001` を返すことを確認する。
- 状態: 完了

### T-4: `GET /api/trips` 実装

- レイヤー: api
- 内容: `TripController` / `ListTripsUseCase` / `TripRepository`（Hibernate/JPA）を実装。`started_on DESC NULLS LAST, created_at DESC` の並び順をリポジトリ層で実装する。
- 対応AC: AC-1, AC-2, AC-4, AC-23
- 依存タスク: T-3
- サイズ: M
- テスト観点: MockMvc（または`@SpringBootTest`）で、複数`trips`が正しい並び順で返ること、0件時に空配列が返ること、レスポンス形状がOpenAPI `Trip` スキーマ（`id`/`name`/`color`/`startedOn`/`endedOn`）と一致することを確認する。
- 状態: 完了

### T-5: `GET /api/trips/{tripId}/tracks` 実装

- レイヤー: api
- 内容: `TrackController`（GET） / `ListTracksUseCase` / `TrackRepository`（Hibernate/JPA）を実装する。
- 対応AC: AC-6, AC-7
- 依存タスク: T-3
- サイズ: S
- テスト観点: 指定`tripId`に紐づく`tracks`一覧が返ること、`track`が0件の旅行に対しては空配列が返ること（AC-7の前提条件）を確認する。
- 状態: 完了

### T-6: `POST /api/trips/{tripId}/tracks` 実装

- レイヤー: api
- 内容: `TrackController`（POST） / `StartTrackUseCase` / `TrackRepository`（INSERT）を実装。`source='live'`, `status='recording'` で新規トラックを作成する。
- 対応AC: AC-33
- 依存タスク: T-3
- サイズ: S
- テスト観点: 呼び出し後に `tracks` テーブルへ `source='live'`, `status='recording'` のレコードが1件追加されること、レスポンスがOpenAPI `Track` スキーマと一致することを確認する。
- 状態: 完了

### T-7: `GET /api/tracks/{trackId}/points` 実装

- レイヤー: api
- 内容: `TrackPointController` / `GetTrackPointsUseCase` / `TrackPointRepository`（ネイティブクエリ、PostGIS `ST_Simplify`/`ST_AsGeoJSON`使用）を実装。`simplify` パラメータでズームレベル相当の間引きを行う。
- 対応AC: AC-6, AC-7, AC-36
- 依存タスク: T-3
- サイズ: M
- テスト観点: `track_points`が存在するトラックで`simplify`パラメータ違いにより点数が変化すること、`track_points`が0件のトラックで空のGeoJSON（エラーにならない）が返ることを確認する。
- 状態: 完了

### T-8: `GET /api/photos` 実装

- レイヤー: api
- 内容: `PhotoController` / `ListPhotosUseCase` / `PhotoRepository`（ネイティブクエリ、`ST_MakeEnvelope`によるbboxフィルタ、`hasLocation`パラメータ対応）を実装する。
- 対応AC: AC-10, AC-13, AC-14
- 依存タスク: T-3
- サイズ: M
- テスト観点: 指定bbox内の写真のみ返ること、`hasLocation=true`指定時に`geom`がNULLの写真が除外されること、`thumbnail_key`がNULLの写真も欠落なく返る（クライアント側でデフォルトアイコン判定できる）ことを確認する。
- 状態: 完了

### T-9: `GET /api/coverage` 実装

- レイヤー: api
- 内容: `api/build.gradle.kts` に `mybatis-spring-boot-starter` を追加。`CoverageController` / `GetCoverageUseCase` / `CoverageMapper`（MyBatis、`visited_regions`と`regions`のJOIN、および件数集計の2クエリ）を実装。`regionType=city`固定で動作させる。
- 対応AC: AC-8, AC-9, AC-21, AC-22
- 依存タスク: T-3
- サイズ: L
- テスト観点: `visited_regions`が1件以上ある状態で`geojson`にポリゴンが含まれ`stats.visitedCount/totalCount/coverageRate`が正しい値になること、`regions`未投入（`totalCount=0`）時に`geojson`が空でエラーにならないことを確認する。
- 状態: 完了

### T-10: mobile 新規ライブラリ導入 + テスト基盤セットアップ

- レイヤー: mobile
- 内容: `@maplibre/maplibre-react-native`, `expo-location`, `expo-linking`, `@react-navigation/native` + `@react-navigation/bottom-tabs` + `@react-navigation/native-stack`, `@tanstack/react-query` を導入。あわせて `jest-expo` プリセット、`@testing-library/react-native` 等のテスト基盤を整備し、`package.json` に `test` スクリプトを追加する。
- 対応AC: 無し（後続すべてのmobileタスクの前提となる基盤整備）
- 依存タスク: なし
- サイズ: M
- テスト観点: `pnpm --filter mobile test` がサンプルテスト（雛形コンポーネントの1件）で成功すること。`pnpm --filter mobile tsc --noEmit` が通ること。
- 状態: 完了

### T-11: mobile APIクライアント基盤（`api/client.ts`）

- レイヤー: mobile
- 内容: `EXPO_PUBLIC_API_BASE_URL` を用いたfetchラッパーを実装し、通信エラー/5xxエラーを正規化した例外/エラー型を返す。
- 対応AC: 無し（AC-27のエラー検知に使う全API呼び出し共通基盤）
- 依存タスク: T-1, T-10
- サイズ: S
- テスト観点: モックしたfetchでの正常系（JSONパース成功）、異常系（ネットワークエラー・5xxステータス）それぞれで期待した戻り値/例外になることをJestで確認する。
- 状態: 完了

### T-12: `useTrips` フック（`api/trips.ts`）

- レイヤー: mobile
- 内容: `GET /api/trips` を呼ぶreact-queryフック `useTrips` を実装。取得後にT-2の`tripSchema`でバリデーションする。
- 対応AC: AC-1, AC-2, AC-4, AC-23
- 依存タスク: T-2, T-11
- サイズ: S
- テスト観点: モックAPIレスポンスに対し、フックが`data`/`isLoading`/`isError`を正しく返すこと、不正レスポンス（スキーマ不一致）時にエラー扱いになることをJestで確認する。
- 状態: 完了

### T-13: `useCoverage` フック（`api/coverage.ts`）

- レイヤー: mobile
- 内容: `GET /api/coverage?regionType=city` を呼ぶreact-queryフック `useCoverage` を実装。取得後にT-2の`coverageSchema`でバリデーションする。
- 対応AC: AC-8, AC-9, AC-21, AC-22
- 依存タスク: T-2, T-11
- サイズ: S
- テスト観点: `geojson`が空・非空それぞれのモックレスポンスでフックの戻り値が期待通りになることを確認する。
- 状態: 完了

### T-14: `useTripTracks` / `useTrackPoints` / `useStartTrack` フック（`api/tracks.ts`）

- レイヤー: mobile
- 内容: `GET /api/trips/{tripId}/tracks`、`GET /api/tracks/{trackId}/points?simplify=...`、`POST /api/trips/{tripId}/tracks` をそれぞれ呼ぶreact-queryフック/ミューテーションを実装。T-2の`trackSchema`/`trackPointsFeatureSchema`でバリデーションする。
- 対応AC: AC-6, AC-7, AC-33, AC-36
- 依存タスク: T-2, T-11
- サイズ: M
- テスト観点: モックAPIで複数トラック・複数トラックポイントの取得、`track_points`0件時の空配列取得、`useStartTrack`実行後のミューテーション成功/失敗ハンドリングをJestで確認する。
- 状態: 完了

### T-15: `usePhotos` フック（`api/photos.ts`）

- レイヤー: mobile
- 内容: bbox・`hasLocation=true`を引数に取る `GET /api/photos` のreact-queryフック `usePhotos` を実装。T-2の`photoSchema`でバリデーションする。
- 対応AC: AC-10, AC-13, AC-14, AC-36
- 依存タスク: T-2, T-11
- サイズ: S
- テスト観点: bbox引数が変わるとクエリキーが変わり再取得がトリガーされること、`thumbnail_key`がNULLの写真データも欠落なく`data`に含まれることを確認する。
- 状態: 完了

### T-16: `useLocationPermission` フック

- レイヤー: mobile
- 内容: `expo-location`を用い、許可状態が「未確認」の場合は`requestForegroundPermissionsAsync()`を自動実行（AC-16）。結果を「許可あり/許可なし」の2値に正規化（AC-17）。許可ありの場合はタイムアウト付きで`getCurrentPositionAsync()`を試行し現在地を返す。
- 対応AC: AC-16, AC-17, AC-18
- 依存タスク: T-10
- サイズ: M
- テスト観点: `expo-location`をモックし、「未確認→自動リクエスト」「使用中のみ許可/常に許可→許可あり」「拒否/制限→許可なし」の分岐、および現在地取得成功/タイムアウト失敗それぞれのケースをJestで確認する。
- 状態: 完了
- フォローアップ: 実機/シミュレータでのOSダイアログ実表示確認はDev Build環境構築（`docs/works/mobile_dev_build_setup.md`）完了後に行う。

### T-17: `useInitialViewport` フック（AC-36フォールバックロジック）

- レイヤー: mobile
- 内容: T-16の現在地取得結果とT-14で取得した全track_pointsを入力に、優先順位（1: 現在地 → 2/3: track_points bounding boxへのfitBounds一本化 → 4: 日本全体固定範囲）で初期中心座標・ズームを決定するロジックを実装する。`plan.md`「技術的リスク・懸念点」に記載の通り、優先順位2/3は同一のfitBounds処理に統合する。
- 対応AC: AC-36
- 依存タスク: T-14, T-16
- サイズ: M
- テスト観点: 「現在地あり」「現在地なし・track_points複数」「現在地なし・track_points1件」「track_points0件」の4パターンそれぞれで期待した中心座標/範囲が算出されることをJestで確認する。
- 状態: 完了

### T-18: `useMapScreenQueries`（ローディング/エラー状態集約）

- レイヤー: mobile
- 内容: T-12〜T-15のクエリ結果を集約し、「ローディング」「エラー」「データ空」「通常」の状態を1つに解決するフックを実装する。react-queryの`retry`を無効化し、失敗クエリのみを対象にした`refetch`（再試行）を提供する。
- 対応AC: AC-25, AC-26, AC-27, AC-28
- 依存タスク: T-12, T-13, T-14, T-15
- サイズ: M
- テスト観点: 全クエリ成功＋`trips`0件→「データ空」、全クエリ成功＋`trips`1件以上→「通常」、いずれか1クエリが5xx/通信エラー→「エラー」への状態遷移、再試行操作で失敗クエリのみが再実行されることをJestで確認する。
- 状態: 完了

### T-19: RootNavigator + placeholder画面 + App.tsx配線

- レイヤー: mobile
- 内容: `@react-navigation/bottom-tabs`によるRootNavigator（マップ／旅行／家計簿／設定の4タブ）を実装し、`App.tsx`に`QueryClientProvider`とあわせて組み込む。S-002/S-003/S-005/S-006/S-009向けの最小限のplaceholder画面（タイトルのみ）を作成する。
- 対応AC: AC-15, AC-24, AC-32, AC-34, AC-35
- 依存タスク: T-10
- サイズ: M
- テスト観点: RTLで各タブタップ時に対応するplaceholder画面へ遷移すること、マップタブが初期状態でハイライトされることを確認する。`navigation.navigate('PhotoDetail'|'Tracking'|...)`呼び出しがモック経由で正しい画面名・パラメータで呼ばれることを確認する。
- 状態: 完了

### T-20: `FilterChipBar` コンポーネント

- レイヤー: mobile
- 内容: `trips`データからフィルタチップを生成し、初期状態全ON、タップでのローカルON/OFF切替（API再取得無し）を実装する。`trips`0件時はチップ領域自体を描画しない。
- 対応AC: AC-2, AC-3, AC-4, AC-5
- 依存タスク: T-10, T-1
- サイズ: S
- テスト観点: RTLで、`trips`件数分のチップが`name`ラベル・`color`背景で描画されること、タップでON/OFF状態が切り替わりコールバックが呼ばれること、`trips`が空配列のとき何も描画されないことを確認する。
- 状態: 完了

### T-21: `LayerToggleControl` コンポーネント

- レイヤー: mobile
- 内容: 写真ピン／経路／訪問エリアの3トグル（初期全ON）を実装し、切替をローカル状態のコールバックとして親に通知する。
- 対応AC: AC-3, AC-29, AC-30, AC-31
- 依存タスク: T-10
- サイズ: S
- テスト観点: RTLで初期状態が3つとも ON 表示であること、各トグルタップでON/OFFが切り替わりコールバックが呼ばれることを確認する。
- 状態: 完了

### T-22: `TrophyBadge` コンポーネント

- レイヤー: mobile
- 内容: `coverage`の`stats`（`visitedCount`/`totalCount`/`coverageRate`）を表示するバッジを実装。`totalCount`が0の場合は非表示にする。
- 対応AC: AC-21, AC-22
- 依存タスク: T-10, T-1
- サイズ: S
- テスト観点: RTLで`totalCount>=1`のとき「visitedCount/totalCount」「coverageRate%」の文字列が描画されること、`totalCount=0`のとき何も描画されないことを確認する。
- 状態: 完了

### T-23: `LocationPermissionBanner` コンポーネント

- レイヤー: mobile
- 内容: 「許可なし」時に警告文言＋「設定を開く」ボタンを表示するバナーを実装。タップで`expo-linking`の`Linking.openSettings()`を呼ぶ。ローディング/エラー状態とは独立して権限状態のみで表示可否を決める。
- 対応AC: AC-19, AC-20
- 依存タスク: T-10
- サイズ: S
- テスト観点: RTLで許可状態propに応じた表示/非表示切替、「設定を開く」タップ時に`Linking.openSettings`（モック）が呼ばれることを確認する。
- 状態: 完了

### T-24: `EmptyStateCta` コンポーネント

- レイヤー: mobile
- 内容: `trips`0件時に「最初の旅行を作る」ボタンを含むカードを表示し、タップでS-003新規作成モーダル（placeholder）へ遷移するコールバックを呼ぶ。
- 対応AC: AC-23, AC-24
- 依存タスク: T-10
- サイズ: S
- テスト観点: RTLで`trips`0件propのとき描画されること、ボタンタップでコールバック（遷移関数）が呼ばれることを確認する。
- 状態: 完了

### T-25: `ErrorBanner` コンポーネント

- レイヤー: mobile
- 内容: 「再試行」ボタン付きのエラー表示バナーを実装。どのAPIが失敗した場合でも同一表示形式にする。
- 対応AC: AC-27, AC-28
- 依存タスク: T-10
- サイズ: S
- テスト観点: RTLでバナー描画、「再試行」タップでコールバック（refetch）が呼ばれることを確認する。
- 状態: 完了

### T-26: `TripSelectionDialog` コンポーネント

- レイヤー: mobile
- 内容: FABタップ時に表示する旅行選択ダイアログを実装。既存旅行一覧（T-12のキャッシュ済みデータを再利用、API再取得なし）＋新規作成の選択肢を提示し、既存旅行選択時にT-14の`useStartTrack`を呼び出す。
- 対応AC: AC-32, AC-33
- 依存タスク: T-12, T-14
- サイズ: M
- テスト観点: RTLで`trips`件数分の選択肢＋新規作成選択肢が表示されること、既存旅行選択→決定操作で`useStartTrack`のミューテーションが呼ばれること、react-queryの`useTrips`再取得（refetch）が発生しないことを確認する。
- 状態: 完了

### T-27: `RoutePolylineLayer` コンポーネント

- レイヤー: mobile
- 内容: フィルタON旅行の`track_points`を`trips.color`でポリライン描画するMapLibreレイヤーコンポーネントを実装。`track_points`0件のトラックは描画をスキップする。
- 対応AC: AC-6, AC-7
- 依存タスク: T-14, T-10
- サイズ: S
- テスト観点: propsに応じたGeoJSON/スタイル生成ロジックをJestでユニットテストする（`track_points`有無での分岐、`color`の反映）。MapLibreコンポーネント自体の実描画確認はDev Build環境完了後に行う。
- 状態: 完了
- フォローアップ: Dev Build環境が整い次第、実機/シミュレータでポリラインが正しい色・経路で描画されることを確認する。

### T-28: `VisitedRegionFillLayer` コンポーネント

- レイヤー: mobile
- 内容: `coverage`の`geojson`をアクセント色半透明のFillレイヤーとして描画するコンポーネントを実装。`geojson`が空の場合は何も描画しない。
- 対応AC: AC-8, AC-9
- 依存タスク: T-13, T-10
- サイズ: S
- テスト観点: propsに応じたレイヤー生成ロジックをJestでユニットテストする（空geojson時に非描画になる分岐）。
- 状態: 完了
- フォローアップ: Dev Build環境が整い次第、実機/シミュレータで塗りつぶしが正しく描画されることを確認する。

### T-29: `PhotoPinLayer` コンポーネント（クラスタリング対応）

- レイヤー: mobile
- 内容: 写真ピンをMapLibre標準クラスタリング（`ShapeSource`の`cluster`プロパティ、デフォルトradius/zoom）付きで描画。`thumbnail_key`ありは個別サムネピン、無しはデフォルトアイコンピン、`geom`NULLの写真は非表示（`usePhotos`側の`hasLocation=true`で対象外）にする。クラスタタップ時はズームイン展開、個別ピンタップ時は`navigation.navigate('PhotoDetail', { photoId })`を呼ぶ。
- 対応AC: AC-10, AC-11, AC-12, AC-13, AC-14, AC-15
- 依存タスク: T-15, T-10
- サイズ: M
- テスト観点: propsに応じたピン種別振り分けロジック（サムネあり/なし/geom NULL）をJestでユニットテストする。個別ピンタップ時に`navigation.navigate`（モック）が正しい引数で呼ばれることを確認する。クラスタタップ時のズーム展開挙動、実際のクラスタリング描画はDev Build環境完了後に確認する。
- 状態: 完了
- フォローアップ: Dev Build環境が整い次第、実機/シミュレータで密集ピンのクラスタ化・タップ時のズームイン展開を確認する。

### T-30: `CurrentLocationMarker` コンポーネント

- レイヤー: mobile
- 内容: T-16で取得した現在地に現在地ピンを描画するコンポーネントを実装。許可なしの場合は非描画にする。
- 対応AC: AC-18
- 依存タスク: T-16, T-10
- サイズ: S
- テスト観点: propsに応じた描画/非描画切替ロジックをJestでユニットテストする。
- 状態: 完了
- フォローアップ: Dev Build環境が整い次第、実機/シミュレータで現在地ピンの描画位置を確認する。

### T-31: ローカル開発用 地図スタイル/タイル 暫定対応

- レイヤー: mobile
- 内容: `EXPO_PUBLIC_MAP_STYLE_URL`環境変数でスタイルJSON URLを外出しし、`.env.example`に追記する。ローカル開発時に参照する暫定スタイル/タイル（例: 一時的な公開デモタイル、または空のベーススタイル＋オーバーレイ機能のみ動作確認する構成）の方針を決定し、READMEまたは`docs/works/`配下に暫定運用メモを残す。本番/自宅サーバ用のPMTiles配置（Cloudflare R2/MinIO `triplog-tiles`バケットへの実ファイル配置）は本タスクのスコープ外。
- 対応AC: 無し（`plan.md`「技術的リスク・懸念点」に記載の、ローカル開発用暫定タイル対応というインフラ整備タスク。T-27〜T-30・T-32の実描画確認の前提）
- 依存タスク: T-10
- サイズ: S
- テスト観点: `EXPO_PUBLIC_MAP_STYLE_URL`未設定時にアプリがクラッシュせずフォールバック（空スタイル等）で起動できること。設定値の環境変数化がコード上で確認できること（ハードコードされたURLが無いこと）。
- 状態: 完了
- フォローアップ: 暫定スタイル/タイルの具体的な選定（公開デモタイル利用の可否等）はライセンス・利用規約の確認が必要な場合があるため、着手時に不明点があればユーザーに確認する。

### T-32: `MapScreen` 状態機械オーケストレーション（統合）

- レイヤー: mobile
- 内容: T-16〜T-31で作成したフック・コンポーネントを`MapScreen`に統合し、「ローディング／エラー／データ空／通常」の4状態遷移（AC-25,26）、初期表示フロー（AC-1、AC-36）、各操作（フィルタ・レイヤートグル・写真ピン・FAB・タブ・位置許可バナー・エラー再試行）を結線する。
- 対応AC: AC-1, AC-3, AC-5, AC-16, AC-17, AC-18, AC-19, AC-20, AC-23, AC-24, AC-25, AC-26, AC-27, AC-28, AC-29, AC-30, AC-31, AC-32, AC-33, AC-34, AC-35, AC-36
- 依存タスク: T-16, T-17, T-18, T-19, T-20, T-21, T-22, T-23, T-24, T-25, T-26, T-27, T-28, T-29, T-30, T-31
- サイズ: L
- テスト観点: RTL＋react-query test utilsで、5状態（通常/位置許可未取得/データ空/ローディング/エラー）それぞれのレンダリング結果が spec.md の該当ACと一致することを確認する結合テストを作成する。位置許可未取得バナーがローディング/エラー状態と独立に表示されること（AC-19条件）も含める。
- 状態: 完了
- フォローアップ: Dev Build環境が整い次第、実機/シミュレータで画面全体の動作（地図描画・現在地・タップ操作）を確認する。

### T-33: spec.md 受け入れ基準の結合確認・是正

- レイヤー: mobile / api（横断）
- 内容: AC-1〜AC-36を1件ずつ突き合わせ、Given/When/Thenが実装（T-1〜T-32）で満たされているかをレビュー・必要なら手動/自動テストで検証する。満たされていないACがあれば該当タスクを修正する。
- 対応AC: AC-1〜AC-36（全件）
- 依存タスク: T-4, T-5, T-6, T-7, T-8, T-9, T-32
- サイズ: M
- テスト観点: spec.mdのAC一覧をチェックリスト化し、各ACについて「対応するテスト（api/mobileの自動テスト、または該当タスクの手動確認結果）」を記録する。未充足のACが無いことを確認する。
- 状態: 完了

## 実装スケジュール（フェーズ分け）

### Phase 1: 基盤整備（並行可）

- 対象タスク: T-1（shared scaffold）, T-3（api CurrentUserProvider）, T-10（mobile lib + test基盤）

### Phase 2: API実装 / shared検証層 / mobile基盤（Phase1完了後、並行可）

- 対象タスク: T-2（shared yupスキーマ）, T-4, T-5, T-6, T-7, T-8, T-9（api 5エンドポイント。api内では並行可）, T-11（mobile APIクライアント）, T-16（useLocationPermission）, T-19（RootNavigator+placeholder）, T-20, T-21, T-22, T-23, T-24, T-25（presentationalコンポーネント）, T-31（ローカル地図スタイル暫定対応）

### Phase 3: mobile データ取得層・地図レイヤー（Phase2完了後、並行可）

- 対象タスク: T-12, T-13, T-14, T-15（api連携フック）, T-17（useInitialViewport）, T-26（TripSelectionDialog）, T-27, T-28, T-29, T-30（地図レイヤーコンポーネント）

### Phase 4: 状態集約・統合

- 対象タスク: T-18（useMapScreenQueries、T-12〜T-15完了後）→ T-32（MapScreen統合、Phase1〜4の全mobileタスク完了後）

### Phase 5: 受け入れ確認

- 対象タスク: T-33（T-4〜T-9・T-32完了後）

## 未解決事項（要確認）

- T-31（ローカル開発用地図スタイル/タイルの暫定対応）で、具体的にどの暫定タイル/スタイルを使うか（例: 公開デモタイルの利用可否、ライセンス条件）は本tasks.mdでは決定していない。着手時にユーザーへ確認すること。
- Dev Build環境構築（`docs/works/mobile_dev_build_setup.md`）における方式（ローカル完結 or EAS Build）は未決定（Apple Developer Program登録有無が未確認）。本tasks.mdのスコープ外だが、T-27・T-28・T-29・T-30・T-32のフォローアップ（実機/シミュレータ確認）の着手可否に影響するため、並行して解決される必要がある。
- api側のテスト実行方式（Testcontainers利用か、既存のDocker Compose `db`コンテナに対して実行するか）は`plan.md`・既存リポジトリに明記が無い。T-4〜T-9の実装着手時（`implement-agent`）に確認・決定すること。
