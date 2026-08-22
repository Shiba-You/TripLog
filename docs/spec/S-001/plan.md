# S-001 マップ（ホーム） 実装計画

## 参照

- docs/spec/S-001/spec.md
- docs/domain/01_基本設計/03_アーキテクチャと技術選定.md
- docs/domain/01_基本設計/04_データモデル.md
- docs/domain/01_基本設計/06_API設計.md（OpenAPI全文）
- docs/domain/01_基本設計/07_基盤設計.md（ローカル開発インフラ・現状のスケルトン構成）
- docs/domain/02_画面定義書/S-001_マップホーム.md
- docs/works/mobile_dev_build_setup.md（本plan.mdの前提となる別タスク。下記「前提タスクへの依存」参照）
- リポジトリ現況（`api/`・`mobile/`・`web/` は骨組みのみ。`api` は `HealthController` のみ実装済み、`mobile` はAPIヘルスチェック画面のみでナビゲーション/地図/状態管理ライブラリ未導入。`shared` ワークスペースは未作成）

## 前提タスクへの依存

- 本画面は地図レンダラとして `@maplibre/maplibre-react-native` を用いるが、これは Expo Go 非対応で Dev Build/EAS Build が必須（`docs/domain/01_基本設計/03_アーキテクチャと技術選定.md`）。Dev Build環境構築（`expo-dev-client` 導入、`prebuild`/EAS Build、実機・シミュレータでの動作確認）は `docs/works/mobile_dev_build_setup.md` に切り出し済みの別タスクであり、**本plan.md／後続のtasks.mdのスコープには含めない**。
- 本plan.mdおよびtasks.mdのスコープは「MapLibreを用いたコンポーネント・画面ロジックの実装まで」とする。実装したコンポーネントが実機/シミュレータ上で実際に描画・動作することの確認（Dev Build上での起動確認）は、上記前提タスク完了後に別途行う。実装フェーズでは、型チェック・ユニットテスト・（Jest等での）コンポーネントテストまでを完了の目安とし、ネイティブ実行確認はブロッカーとしない。
- tasks-agent は、上記前提タスクが未着手/未完了であることを踏まえ、MapLibre依存タスクに「Dev Build環境が整い次第、実機/シミュレータ確認を行う」旨の後続フォローアップを明記すること。

## アーキテクチャ概要

### 関係するレイヤー

- `mobile`（React Native / Expo）: 本画面の主戦場。画面コンポーネント・状態管理・API呼び出し。
- `api`（Java + Spring）: 本画面が利用する既存OpenAPIエンドポイントのうち、現時点で未実装のものを実装する（後述）。新規エンドポイントは追加しない。
- `shared`: OpenAPI契約から生成する型、および共通の実行時スキーマ検証（yup）の置き場所として新規に作成する（`docs/domain/01_基本設計/03_アーキテクチャと技術選定.md`のリポジトリ構成・API契約方針で既に位置付けられているが未作成のため、本画面実装で最小限の内容を用意する）。
- `web` は対象外（spec.mdのスコープ外）。

### mobile: 新規導入ライブラリと採用理由（簡潔性チェック）

| ライブラリ | 用途 | 採用理由 |
|---|---|---|
| `@maplibre/maplibre-react-native` | 地図レンダラ | アーキテクチャ方針で確定済み。代替なし |
| `expo-location` | 位置情報許可・現在地取得 | Q3で確定。AC-16/17/18/19/36の実現に必須 |
| `expo-linking` | OS設定アプリを開く（`Linking.openSettings()`） | AC-20の実現に必須。Expo標準ライブラリで追加コスト小 |
| `@react-navigation/native` + `@react-navigation/bottom-tabs` + `@react-navigation/native-stack` | 画面遷移・下部タブバー | AC-15,24,32,33,34,35で複数画面（S-002/S-003/S-005/S-006/S-009）への遷移とタブハイライトが必須要件。自前実装するより既存の標準ナビゲーションライブラリを使う方が実装量・保守コストが小さい |
| `@tanstack/react-query` | API取得状態管理（loading/error/retry/cache） | AC-25〜28（ローディング／エラー／再試行）を満たすには複数APIの並行呼び出しと状態集約が必要。自前のuseState/useEffectでの手組みより、実績のあるライブラリで宣言的に扱う方が複雑度・バグ混入リスクが小さい |
| `openapi-typescript`（devDependency, `shared`側） | OpenAPI定義からTypeScript型を生成 | アーキテクチャ方針「API契約はOpenAPIを正とし、クライアントはこれを参照して型を生成する」を実現するのに必須 |
| `yup`（`shared`側、mobile/webで共用） | APIレスポンスの実行時スキーマ検証 | アーキテクチャ方針で選定済みの技術。型生成だけでは実行時の不正レスポンス検知ができないため、S-001が呼ぶ5エンドポイント分のスキーマを`shared`に定義し検証する |

上記以外の新規ライブラリ（状態管理ライブラリ全般としてのRedux/Zustand等、フォームライブラリ等）は本画面には不要と判断し導入しない。フィルタチップ・レイヤートグルのON/OFFは画面コンポーネントローカルな`useState`/`useReducer`で完結させる（AC-5,29-31は画面内の再描画のみでAPI再取得を伴わないため、グローバル状態管理は過剰）。

### mobile: ディレクトリ構成（新規追加分の方針）

```
mobile/src/
  navigation/
    RootNavigator.tsx        # BottomTab: マップ/旅行/家計簿/設定（AC-34,35）
  screens/
    map/
      MapScreen.tsx           # 状態機械（loading/error/empty/normal）のオーケストレーション
      components/
        FilterChipBar.tsx     # AC-2〜5
        LayerToggleControl.tsx# AC-10,29〜31
        TrophyBadge.tsx       # AC-21,22
        LocationPermissionBanner.tsx # AC-19,20
        EmptyStateCta.tsx     # AC-23,24
        ErrorBanner.tsx       # AC-27,28
        TripSelectionDialog.tsx # AC-32,33
        map-layers/
          RoutePolylineLayer.tsx   # AC-6,7
          VisitedRegionFillLayer.tsx # AC-8,9
          PhotoPinLayer.tsx        # AC-10〜14（clusterプロパティ有効化）
          CurrentLocationMarker.tsx # AC-18
      hooks/
        useInitialViewport.ts # AC-36のフォールバック優先順位ロジック
        useLocationPermission.ts # AC-16,17
        useMapScreenQueries.ts   # trips/coverage/tracks/points/photosのreact-query統合、loading/error集約
    placeholder/
      TrackingScreenPlaceholder.tsx  # S-002 未実装のための仮遷移先
      TripListScreenPlaceholder.tsx  # S-003
      PhotoDetailScreenPlaceholder.tsx # S-005
      ExpensesScreenPlaceholder.tsx  # S-006
      SettingsScreenPlaceholder.tsx  # S-009
  api/
    client.ts     # fetchラッパー（EXPO_PUBLIC_API_BASE_URL、エラー正規化）
    trips.ts / coverage.ts / photos.ts / tracks.ts  # shared生成型 + yupスキーマを使うreact-queryフック
App.tsx            # QueryClientProvider + RootNavigator を差し込む
```

上記の `placeholder/` 配下は、S-001から遷移可能にする必要があるがそれぞれの画面自体は本specのスコープ外（各々のspec.mdで実装）であるため、遷移確認ができる最小限の空画面（タイトルのみ表示等）として用意する。各placeholder画面は該当画面のspecが作成・実装され次第、本物のコンポーネントに置き換えられる（本plan.mdの責務ではない）。

### shared: 新規ワークスペース

- `pnpm-workspace.yaml` に `shared` を追加。
- `shared/openapi.yaml`: `docs/domain/01_基本設計/06_API設計.md` に埋め込まれているOpenAPI全文と同一内容を抽出したファイル（機械可読の実体。ドキュメント側は人間可読の写しとして維持し、エンドポイント追加・変更時は両方を更新する運用は変えない）。
- `shared/src/api-types.ts`: `openapi-typescript` により `shared/openapi.yaml` から自動生成。
- `shared/src/schemas/`: S-001が利用する5エンドポイント分のレスポンスに対するyupスキーマ（`tripSchema`, `coverageSchema`, `photoSchema`, `trackSchema`, `trackPointsFeatureSchema`）。web側の将来利用も見据え、画面固有ロジックを含めない。
- 本ワークスペースの新設はS-001固有の要件ではなく、アーキテクチャ方針で既に位置付けられているものを初めて具体化するもの。今後の画面はここに追加していく想定。

### api: 未実装エンドポイントの実装

現在の `api/` は `HealthController` のみで、S-001が呼ぶ以下5エンドポイントは未実装（OpenAPI定義済み・新規追加ではない）。Controller/UseCase/Repositoryの三層構成（`docs/domain/01_基本設計/03_アーキテクチャと技術選定.md`）に従い実装する。

| エンドポイント | Controller | UseCase | データアクセス層 | 理由 |
|---|---|---|---|---|
| `GET /api/trips` | `TripController` | `ListTripsUseCase` | Hibernate(JPA) `TripRepository`（単一テーブル、JOINなし） | JOIN無し |
| `GET /api/trips/{tripId}/tracks` | `TrackController` | `ListTracksUseCase` | Hibernate(JPA) `TrackRepository`（単一テーブル） | JOIN無し |
| `POST /api/trips/{tripId}/tracks` | `TrackController` | `StartTrackUseCase` | Hibernate(JPA) `TrackRepository`（INSERT） | JOIN無し |
| `GET /api/tracks/{trackId}/points` | `TrackPointController` | `GetTrackPointsUseCase` | Hibernate `TrackPointRepository`（`@Query(nativeQuery=true)`でPostGIS `ST_Simplify`/`ST_AsGeoJSON`を使用。単一テーブル） | JOINは無いが空間関数を使うためネイティブクエリ |
| `GET /api/photos` | `PhotoController` | `ListPhotosUseCase` | Hibernate `PhotoRepository`（`@Query(nativeQuery=true)`で`ST_MakeEnvelope`によるbboxフィルタ。単一テーブル） | JOIN無し |
| `GET /api/coverage` | `CoverageController` | `GetCoverageUseCase` | MyBatis `CoverageMapper`（`visited_regions` と `regions` のJOIN、および件数集計2クエリ） | JOINあり（アーキテクチャ方針でMyBatis指定） |

- `api/build.gradle.kts` に `mybatis-spring-boot-starter` を追加する（現状は未導入）。
- 認証は無し（Q2で確定）。全UseCaseは固定シードユーザーID `00000000-0000-0000-0000-000000000001`（`V2__seed_user.sql` で投入済み）を `user_id` として扱う。将来の認証導入時に差し替えやすいよう、`AppConstants.SEED_USER_ID` のような単一箇所の定数として定義し、Controller/UseCaseへ「現在のユーザーID解決」を担う小さなコンポーネント（例: `CurrentUserProvider`）経由で渡す（直接定数参照を各所に埋め込まない）。
- レスポンスDTOは既存OpenAPIスキーマ（`Trip`/`Track`/`Photo`/`GeoJsonFeature`/`GeoJsonFeatureCollection`と`stats`オブジェクト）にそのまま合わせ、新規フィールドは追加しない。
- `GET /api/trips` の並び順（`started_on DESC NULLS LAST, created_at DESC`）は画面定義書の相当SQL通りリポジトリ層で実装する（OpenAPIスキーマ自体に変更は不要）。

## データモデル

- 新規テーブル・カラムの追加は無し。すべて既存テーブルで表現できる。
- 利用する既存テーブル/カラム:
  - `trips`: `id`, `name`, `color`, `started_on`, `ended_on`, `created_at`（AC-1〜5, AC-32, AC-33）
  - `tracks`: `id`, `trip_id`, `status`, `source`, `started_at`（AC-6,7,33）
  - `track_points`: `geom`, `recorded_at`（AC-6,7, AC-36のフォールバック計算）
  - `regions` / `visited_regions`: `region_type='city'` 固定、`geom`, `first_visited_at`（AC-8,9,21,22）
  - `photos`: `geom`, `location_source`, `thumbnail_key`, `trip_id`（AC-10〜14）
- `docs/domain/01_基本設計/04_データモデル.md` との整合性確認結果: 全項目が既存カラムで充足しており、追加・変更は不要。

## API契約

### 利用する既存エンドポイント（変更なし）

- `GET /api/trips`
- `GET /api/coverage?regionType=city`
- `GET /api/photos?bbox=...&hasLocation=true`
- `GET /api/trips/{tripId}/tracks`
- `GET /api/tracks/{trackId}/points?simplify=...`
- `POST /api/trips/{tripId}/tracks`

### 新規/変更提案

なし。spec.mdの全ACは上記6エンドポイントの組み合わせで実現可能であり、新規エンドポイント・スキーマ変更は不要と判断した。

### `docs/domain/01_基本設計/06_API設計.md`（OpenAPI）との整合性確認結果

- 上記6エンドポイントのリクエスト/レスポンス形状は、AC-1〜36の要求を満たすために必要な情報（`trips.color`、`stats.visitedCount/totalCount/coverageRate`、`Photo.thumbnailUrl`のnullable、`GeoJsonFeature`/`FeatureCollection`等）をすべて含んでいる。
- 更新要否: 無し。ドキュメント上のOpenAPI定義自体の変更は発生しない。実体としての `shared/openapi.yaml` は、この定義内容をそのまま抽出したものとして新規作成する（内容の変更ではなくファイル分離）。

## データフロー

### 初期表示（通常/データ空/ローディング/エラー状態の分岐、AC-1,23,25,26,27）

1. `MapScreen` マウント時、`useLocationPermission` が現在の許可状態を確認し、未確認なら `expo-location` の `requestForegroundPermissionsAsync()` を呼び自動でOSダイアログを表示する（AC-16）。結果を「許可あり/許可なし」に正規化する（AC-17）。
2. 許可ありの場合、`getCurrentPositionAsync()` を試行する（タイムアウト付き）。成功すれば初期ビューポート中心＝現在地（AC-36 優先順位1）。
3. `react-query` で `GET /api/trips` と `GET /api/coverage?regionType=city` を並行実行する。
4. `trips` 取得成功後、初期状態で全旅行がON（AC-3）のため、各旅行について `GET /api/trips/{tripId}/tracks` → 各トラックの `GET /api/tracks/{trackId}/points?simplify=...` を実行する（フィルタON旅行数×トラック数のN+1は既知の許容事項、非機能要件参照）。
5. 手順2で現在地が得られなかった場合、手順4で取得済みの全track_pointsから初期ビューポートを算出する（AC-36 優先順位2・3）。実装上は「全track_pointsのbounding boxにMapLibreカメラをfitさせる」処理に一本化する（1点しか無い場合はfitBounds操作の結果として自然にその点を中心にした表示になるため、優先順位2「直近点を中心表示」と優先順位3「bboxにフィット」を単一のfitBounds呼び出しで両立できる。詳細は「技術的リスク・懸念点」参照）。track_pointsが1件も存在しない場合は日本全体が収まる固定範囲を使う（AC-36 優先順位4）。
6. 初期ビューポート確定後、実際に描画されたMapViewの可視範囲（bbox）を取得し、`GET /api/photos?bbox=...&hasLocation=true` を実行する（AC-1, AC-36末尾）。
7. 上記すべて（trips, coverage, 各tracks/points, photos）が成功した時点でローディング終了。`trips`が0件なら「データ空」状態（AC-23）、1件以上なら「通常」状態（AC-1）に遷移する。
8. いずれかが通信エラー/5xxで失敗した場合は即座に「エラー」状態へ遷移し、失敗したクエリ以外のリクエストは（既に成功していれば結果を保持しつつ）ローディング終了、エラーバナーを表示する（AC-27）。react-queryの`retry`は無効化し、AC-28の「再試行」ボタン押下時にのみ失敗したクエリを`refetch`する。

### フィルタ/レイヤー操作（AC-5, 29〜31）

- フィルタチップ・レイヤートグルの状態は`MapScreen`のローカル状態。トグル操作はAPIを再呼び出しせず、取得済みデータに対するクライアント側フィルタリング（描画対象の絞り込み）のみで反映する。

### 写真ピンタップ・クラスタタップ（AC-11,12,15）

- クラスタは`PhotoPinLayer`の`ShapeSource`に`cluster`プロパティを有効化（MapLibre標準デフォルトのradius/zoomのまま、上書きしない）。
- クラスタタップ時は`ShapeSource`から`getClusterExpansionZoom`相当のAPIでズームレベルを取得し、該当座標へカメラをアニメーションさせる（画面遷移は発生しない）。
- 個別ピンタップ時は`navigation.navigate('PhotoDetail', { photoId })`でplaceholder画面（将来S-005実装に置換）へ遷移する。

### トラッキング開始（AC-32,33）

- FABタップ → `TripSelectionDialog`表示（`GET /api/trips`は既に取得済みのキャッシュを再利用、react-queryの再取得は発生しない）。
- 旅行選択 → `POST /api/trips/{tripId}/tracks` 実行 → 成功時 `navigation.navigate('Tracking', { trackId })`（placeholder、将来S-002実装に置換）。

### 位置許可バナー操作（AC-20）

- 「設定を開く」タップ → `expo-linking`の`Linking.openSettings()`を呼ぶ。

### 下部タブ（AC-34,35）

- `@react-navigation/bottom-tabs`のタブそのものをUIとして採用し、マップタブが選択中であることをナビゲーションのアクティブ状態としてハイライトする（AC-34）。他タブタップで各placeholder画面（将来S-003/S-006/S-009実装に置換）へ遷移する（AC-35）。

## 他機能との重複・競合チェック結果

- 確認したドキュメント/plan一覧:
  - `docs/spec/*/plan.md` を横断検索した結果、既存の他画面plan.mdは存在しない（S-001が最初のspec-driven実装対象）。
  - `docs/domain/01_基本設計/04_データモデル.md`: 本plan.mdが提案する変更（無し）は既存定義と矛盾しない。
  - `docs/domain/01_基本設計/06_API設計.md`: 本plan.mdが利用する6エンドポイントは既存定義通りで、リクエスト/レスポンス形状の変更提案は無い。
- 見つかった重複・競合: 無し。

## 技術的リスク・懸念点

- **地図ベースタイル/スタイルJSONの供給元が未整備**: `docs/domain/01_基本設計/03_アーキテクチャと技術選定.md`の絶対制約により、MapLibreのスタイルJSON・PMTiles URLは環境変数化する方針だが、Cloudflare R2（本番）/MinIO（ローカル、`docs/domain/01_基本設計/07_基盤設計.md`で`triplog-tiles`バケットは予約済み）への実際のPMTilesファイル配置は本plan.mdのスコープ外（未着手のインフラタスク）。本画面の実装自体は`EXPO_PUBLIC_MAP_STYLE_URL`のような環境変数でスタイルURLを外出しする形で進めるが、tasks-agent側でローカル開発用の暫定スタイル/タイル（例: 一時的に公開デモタイルを使う、または空スタイルでオーバーレイ機能のみ動作確認する）の扱いを別途タスク化する必要がある。
- **AC-36の優先順位2/3の実装上の統合**: spec.mdは「直近のトラックポイントを中心表示」（優先順位2）と「全トラックポイントのbounding boxにフィット」（優先順位3）を別ステップとして規定しているが、いずれも同一の取得済みtrack_pointsデータセットから導出されるため、実装では「bounding boxへのfitBounds」に一本化する（1点のみの場合はfitBoundsの結果が実質的にその点を中心にした表示になるため、挙動として優先順位2の意図も満たす）。これはspec.mdのAC文言を変更するものではなく実装方針上の解釈であることを明記する。
- **N+1呼び出し**: 既にspec.mdの非機能要件で許容事項として明記済み。旅行数が多い場合の応答遅延は本plan.mdでも対応しない（将来の集約エンドポイント検討は別タスク）。
- **`shared`ワークスペースの新設**: 他画面のplanが存在しない現時点でS-001が最初に作る形になるため、ここで決めるディレクトリ構成・命名規約が以後の画面実装の事実上の前例になる。tasks-agent/implement-agentは、将来画面固有のロジックをshared配下に混入させないよう注意する必要がある。

## 未解決事項（要確認）

なし（spec.mdのQ1〜Q6は解消済み。本plan策定にあたり新たに発生した確認事項は無い）。
