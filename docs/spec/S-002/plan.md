# S-002 トラッキング 実装計画

## 参照

- docs/spec/S-002/spec.md（AC-1〜AC-25、Q1解消済み）
- docs/domain/01_基本設計/03_アーキテクチャと技術選定.md
- docs/domain/01_基本設計/04_データモデル.md
- docs/domain/01_基本設計/06_API設計.md（OpenAPI全文、`shared/openapi.yaml` と同一内容）
- docs/domain/01_基本設計/07_基盤設計.md
- docs/domain/02_画面定義書/S-002_トラッキング.md
- docs/domain/02_画面定義書/S-004_旅行詳細.md（終了時遷移先。spec/plan未着手のためplaceholder化の要否確認に参照）
- docs/spec/S-001/spec.md, docs/spec/S-001/plan.md（mobile基盤・命名規約・reactナビゲーション契約の前例）
- リポジトリ現況（`api/src/main/java/com/triplog/api/` 配下の trip/track/trackpoint/photo/coverage/common 各パッケージ、`mobile/src/` のnavigation/api/screens/map 一式、`shared/src/` のapi-types.ts・schemas。S-001実装により react-navigation・react-query・expo-location・MapLibre・`@triplog/shared` は導入済み）

## アーキテクチャ概要

### 関係するレイヤー

- `mobile`: 本画面の主戦場。新規画面コンポーネント・端末ローカルの位置監視/バッファリング・API呼び出し。
- `api`: S-002が使う3エンドポイントのうち未実装の3つ（後述）をController/UseCase/Repositoryの三層で実装する。新規エンドポイントの追加は無い（すべてOpenAPI定義済み）。
- `shared`: 既存の型生成・yupスキーマの枠組みに、S-002が新たに必要とするレスポンス1件分（`POST /points` の受理サマリ）のスキーマを追加する。
- `web` は対象外（spec.mdのスコープ外）。

### 既存の仕組みをどう再利用するか（簡潔性チェック）

- **地図プレビュー**: S-001で実装済みの `RoutePolylineLayer`・`CurrentLocationMarker`・`getMapStyleUrl()` をそのまま再利用する。S-002の地図プレビューは「1トラックのみを描画する小さな読み取り専用地図」であり、S-001のコンポーネントが受け取るprops（`routes: RouteEntry[]`、`location`）の形をそのまま満たせるため、新規の地図描画コンポーネントは作らない。
- **取得点数・距離・軌跡**: S-001で実装済みの `GET /api/tracks/{trackId}/points`（`useTrackPoints`/`fetchTrackPoints`、`trackPointsFeatureSchema`）をそのまま再利用する。バッチ送信成功後に react-query の該当クエリを invalidate/refetch することで、取得点数（レスポンスの `properties.pointCount`）と軌跡（`geometry.coordinates`）を「サーバに保存済みの `track_points`」から取得する（AC-7〜10, AC-13）。距離はこの `coordinates` からクライアント側でhaversine計算する小関数を新設するのみで、サーバ側に新たな集計エンドポイントは追加しない。
- **旅行一覧（トラック開始時に選択された旅行の名前・色）**: S-001で実装済みの `useTrips()`（`GET /api/trips`、staleTime 60秒でキャッシュ済み）を再利用し、`GET /api/tracks/{trackId}` で取得した `tripId` に一致する旅行をキャッシュから引く。S-002は必ずS-001のFABフロー（旅行選択→トラック開始→即座にS-002へ遷移）を経由してのみ表示される前提（spec.md「対象外」）であるため、直前に取得済みの `trips` キャッシュが有効である。`GET /api/trips/{tripId}`（単一旅行取得）という新規/未実装エンドポイントは追加しない。
- **API基盤**: `mobile/src/api/client.ts`（`apiFetch`、`ApiError`）、`shared` のyup検証パターン、react-queryの `retry: false` 方針をそのまま踏襲する。
- 上記以外の新規ライブラリ（状態管理ライブラリ全般、フォームライブラリ等）は不要と判断し導入しない。

### mobile: 新規導入ライブラリと採用理由

| ライブラリ | 用途 | 採用理由 |
|---|---|---|
| `expo-sqlite` | 圏外時のローカル点バッファ永続化 | 画面定義書 補足「端末ローカル（SQLite等）へ一時保存」に対応。圏外が長時間続く旅行シナリオ（山間部・洋上等）ではバッファ件数が数百〜数千件に達し得るため、AsyncStorageのJSON全体読み書きではなく行単位の追記・件数取得・削除ができるSQLiteを採用する。Expo SDK標準モジュールでDev Build上で動作し、S-001が既に前提とするDev Build環境（`docs/works/mobile_dev_build_setup.md`）に追加の制約を課さない |
| `@react-native-community/netinfo` | ネットワーク到達可能性のリアルタイム検出 | AC-23〜25は「端末がネットワーク不通を検出する」というイベント駆動の状態遷移を要求しており、APIリクエスト失敗の事後検知だけでは断絶警告バナー（AC-21, GPS起因）と圏外表示（AC-23, ネットワーク起因）を排他的に描き分けられない（AC-25）。React Native標準的なネットワーク状態検出ライブラリであり、自前のポーリング実装より確実・低コスト |

`expo-location` の `watchPositionAsync`（定期位置取得、AC-13〜16）は既存依存で追加不要。`@tanstack/react-query`・`@react-navigation/*` も同様に既存依存を利用する。

### mobile: ディレクトリ構成（新規追加分の方針）

```
mobile/src/
  screens/
    tracking/
      TrackingScreen.tsx              # 状態統合・画面本体（AC-1〜25のオーケストレーション）
      components/
        StatusHeader.tsx              # AC-2,3,4: ステータス表示・記録中インジケータ・旅行ラベル
        ElapsedTimeText.tsx           # AC-5,6: 経過時間（1秒毎更新）
        DistanceText.tsx              # AC-7,8: 距離（累計）
        PointCountText.tsx            # AC-9,10: 取得点数
        TrackingMapPreview.tsx        # AC-11,12: RoutePolylineLayer/CurrentLocationMarker/getMapStyleUrlを合成した小地図
        DisruptionBanner.tsx          # AC-21,22,25: 断絶警告バナー
        OfflineBufferIndicator.tsx    # AC-23,24,25: 圏外時ローカル蓄積表示
        TrackingControls.tsx          # AC-14,16,17: 一時停止／再開／終了ボタン
        EndConfirmModal.tsx           # AC-17,18,19: 終了確認モーダル
      hooks/
        useElapsedTime.ts             # AC-5,6
        useLocationTracking.ts        # 位置監視の開始/停止、GPS取得時刻の記録（AC-13,15,16）。watchPositionAsyncのラップ
        useTrackPointsBuffer.ts       # ローカルSQLiteバッファの読み書き・件数取得（AC-23,24）。expo-sqliteラッパー
        useNetworkStatus.ts           # @react-native-community/netinfo のラップ（AC-23〜25）
        useTrackPointFlush.ts         # バッファ→POSTのフラッシュループ（一定間隔/一定件数/オンライン復帰トリガー、AC-13,24）
        useDisruptionWarning.ts       # AC-21,22,25: 最終GPS取得時刻とネットワーク状態からのバナー判定
      lib/
        distance.ts                   # haversine距離計算（AC-7）
      TrackingScreen.tsx 以下、コンポーネント/フックは全てS-001の `screens/map/` と同一の粒度・命名規約に揃える
  screens/
    placeholder/
      TripDetailScreenPlaceholder.tsx # 新規: S-004（旅行詳細、spec/plan未着手）への遷移確認用placeholder（AC-18）
  api/
    tracks.ts                         # 拡張: useTrack（GET /api/tracks/{trackId}）, useUpdateTrackStatus（PATCH）,
                                       #        useIngestTrackPoints（POST /points）を追加
  navigation/
    RootNavigator.tsx                 # 変更: `Tracking` ルートの component を TrackingScreenPlaceholder → TrackingScreen に置換。
                                       #        新規 `TripDetail: { tripId: string }` ルートを追加しplaceholderへ紐付け（AC-18）
```

`Tracking` ルートの型（`RootStackParamList['Tracking'] = { trackId: string }`）は変更しない。S-002は `trackId` のみから自己完結的に必要な情報（トラック状態・所属旅行）を取得する設計とし、S-001側のナビゲーション呼び出し箇所（`navigation.navigate('Tracking', { trackId })`）には一切手を入れない。

## データモデル

- 新規テーブル・カラムの追加は無し。すべて既存テーブルで表現できる。
- 利用する既存テーブル/カラム:
  - `tracks`: `id`, `trip_id`, `status`, `started_at`, `ended_at`, `last_point_at`（AC-1〜6, 14, 16, 18, 21, 22）
  - `track_points`: `geom`, `elevation_m`, `speed_mps`, `accuracy_m`, `recorded_at`（AC-7〜13, 24）
  - `trips`: `name`, `color`（`tracks.trip_id` 経由、AC-4）
  - `regions` / `visited_regions`: 画面定義書 処理No.2のSQL相当（未訪問区画の記録）。S-002画面には直接表示しないが、`POST /api/tracks/{trackId}/points` の契約（`newlyVisitedRegionIds`）を満たすために内部的に参照する。`regions` は `docs/domain/01_基本設計/07_基盤設計.md`のスコープ外整理により未投入（空）のため、当面この処理は実質的に何も挿入しない（構造は正しく実装するが、実データが無い限り無害な no-op）
- `docs/domain/01_基本設計/04_データモデル.md` との整合性確認結果: 全項目が既存カラムで充足しており、追加・変更は不要。

## API契約

### 利用する既存エンドポイント（すべてOpenAPI定義済み・一部未実装）

| エンドポイント | 現状 | S-002での用途 |
|---|---|---|
| `GET /api/tracks/{trackId}` | **未実装**（新規実装が必要） | 画面表示時、trackIdからトラックのメタ情報（`tripId`, `status`, `startedAt`, `endedAt`, `lastPointAt`, `pointCount`）を取得（AC-1, 2, 4, 5, 6） |
| `PATCH /api/tracks/{trackId}` | **未実装**（新規実装が必要） | 一時停止（AC-14）・再開（AC-16）・終了（AC-18）の状態更新 |
| `POST /api/tracks/{trackId}/points` | **未実装**（新規実装が必要） | 位置情報バッチ送信・再送（AC-13, 24） |
| `GET /api/tracks/{trackId}/points` | 実装済み（S-001） | 地図プレビュー・距離・取得点数の表示更新（再利用、AC-7〜13） |
| `GET /api/trips` | 実装済み（S-001） | 旅行名・色の表示（キャッシュ再利用、AC-4） |

`GET /api/tracks/{trackId}` は、ユーザーからの実装依頼で明示された `PATCH`/`POST` 2エンドポイントには含まれていないが、OpenAPI定義には既に存在する「トラック取得（メタ情報）」エンドポイントであり、S-001の実装方針（既存定義だが未実装のエンドポイントを実装する）と同じ扱いとする。これが無いと、S-002は`trackId`のみから`tripId`・`status`・`startedAt`を解決できず、AC-1/4/5を自己完結的に満たせない（詳細は「他機能との重複・競合チェック結果」参照）。

### 新規/変更提案

なし。上記5エンドポイントはすべてOpenAPI定義済みであり、リクエスト/レスポンス形状の変更は発生しない。

- `PATCH /api/tracks/{trackId}` のリクエストボディはOpenAPI定義上 `{ status: recording|paused|finished }` のみを受け付ける（`endedAt` はリクエストに含まれるプロパティとして定義されていない）。spec.md AC-18の文言「`{status: finished, endedAt}` が呼び出され」は、画面定義書 処理No.5のSQL相当（`UPDATE tracks SET status='finished', ended_at=now() ...`）が示す通り、**`ended_at` はサーバ側が `now()` で自動設定する**という意味であり、クライアントが`endedAt`をリクエストボディに含めて送信するという意味ではないと解釈する。OpenAPIとと画面定義書のSQLが一致しているため、この解釈でAC-18を実現する（クライアント実装は `{status: 'finished'}` のみ送信）。
- `POST /api/tracks/{trackId}/points` のレスポンス（`{ accepted, newlyVisitedRegionIds }`）はそのまま利用する。S-002はこのレスポンスを画面表示の直接の入力にはしない（取得点数・距離は再利用する`GET /points`から取り直すため、詳細は「データフロー」参照）が、契約通りのDTOをAPI側で返す。

### `docs/domain/01_基本設計/06_API設計.md`（OpenAPI）との整合性確認結果

- 上記5エンドポイントのリクエスト/レスポンス形状は、AC-1〜25の要求を満たすために必要な情報をすべて含んでいる。
- 更新要否: 無し。`shared/openapi.yaml` / `docs/domain/01_基本設計/06_API設計.md` 双方の変更は発生しない。

## API層の実装方針（Controller/UseCase/Repository）

| エンドポイント | Controller | UseCase | データアクセス層 | 層選定理由 |
|---|---|---|---|---|
| `GET /api/tracks/{trackId}` | `TrackDetailController`（新規、`/api/tracks/{trackId}` にマッピング。既存`TrackController`は`/api/trips/{tripId}/tracks`配下専用のため別クラスとする） | `GetTrackUseCase`（新規） | Hibernate(JPA) 既存`TrackRepository`（`findById`+`userId`検証） + 既存`TrackPointRepository.countByTrackIdAndUserId` | 単一テーブル参照、JOIN無し |
| `PATCH /api/tracks/{trackId}` | `TrackDetailController`（同上） | `UpdateTrackStatusUseCase`（新規） | Hibernate(JPA) 既存`TrackRepository`（UPDATE）。`TrackEntity`に状態遷移用のミューテータメソッドを追加（`startLive`と同様のファクトリ/ミューテータパターンを踏襲） | 単一テーブル更新、JOIN無し |
| `POST /api/tracks/{trackId}/points` | 既存`TrackPointController`に`@PostMapping`を追加（クラスは維持、パスプレフィックス無しの既存流儀を踏襲） | `IngestTrackPointsUseCase`（新規） | MyBatis `TrackPointMapper`（新規）: (1) `track_points`へのバッチINSERT（アノテーション内`<script>`によるMyBatis動的SQL `<foreach>`、CoverageMapperと同じ全アノテーション方式を踏襲しXMLマッパーは追加しない）、(2) `tracks.last_point_at`の再計算UPDATE、(3) `regions`とのST_Contains突合による`visited_regions`への未訪問区画INSERT（`ON CONFLICT (user_id, region_id) DO NOTHING RETURNING region_id`で新規訪問idを収集） | (3)が`regions`テーブルを参照する実質的なJOIN相当処理であるため、既存`CoverageMapper`と同じくMyBatisを採用し、(1)(2)(3)を1トランザクション（UseCase層`@Transactional`）でまとめて扱う |

- いずれも`CurrentUserProvider`経由で現在のユーザーIDを解決し、`trackId`が存在しない/他ユーザー所有の場合は既存`ListPhotosUseCase`のパターン（`org.springframework.web.server.ResponseStatusException`）を踏襲し`404`を返す。
- `TrackDto`（既存、`id/tripId/source/status/startedAt/endedAt/lastPointAt/pointCount`）をGET/PATCH双方のレスポンスDTOとしてそのまま再利用する（新規DTOは作らない）。
- `POST /points`のリクエストDTO（`TrackPointBatchRequestDto{ points: List<TrackPointInputDto> }`、`TrackPointInputDto{ lng, lat, elevationM?, speedMps?, accuracyM?, recordedAt }`）とレスポンスDTO（`TrackPointBatchResultDto{ accepted, newlyVisitedRegionIds }`）はOpenAPIの`TrackPointBatch`/`TrackPoint`スキーマにそのまま対応させて新規作成する。

## データフロー

### 画面表示直後の初期化（AC-1, 4, 5, 6）

1. `TrackingScreen`マウント時、`navigation`の`route.params.trackId`を用いて`GET /api/tracks/{trackId}`（`useTrack`、react-query）を実行する。
2. 成功したら`tripId`を得て、既にキャッシュ済みの`useTrips()`結果から一致する旅行（`name`・`color`）を解決する（AC-4）。
3. `status`（`recording`/`paused`）・`startedAt`（`useElapsedTime`の入力、AC-5/6）を初期状態として画面に反映する。
4. 並行して`GET /api/tracks/{trackId}/points`（`useTrackPoints`、既存フック再利用）を実行し、地図プレビュー・距離・取得点数の初期値を得る（AC-1のtrackId確定済み前提のため、`track_points`が既に存在するケースは稀だが0件でもAC-8/10/12通り正しく表示される）。

### 位置情報バッチ送信と画面反映（AC-13）

1. `status='recording'`の間、`useLocationTracking`が`expo-location`の`watchPositionAsync`で位置を定期取得する（間隔はS-001同様チューニング対象の暫定値とし、後続の実装/検証で調整可能にする。spec.md「対象外」参照）。
2. 取得した点は都度`useTrackPointsBuffer`経由でSQLiteの未送信バッファへ追記する（オンライン/オフラインを問わず一貫してバッファ経由にすることで、圏外時と平常時のコード経路を統一する）。同時に「最終GPS取得時刻」を`useDisruptionWarning`向けに更新する（AC-21の判定基準）。
3. `useTrackPointFlush`が一定間隔／一定バッファ件数到達／ネットワーク復帰イベントをトリガーに、バッファ内の未送信点をまとめて`POST /api/tracks/{trackId}/points`へ送信する（`useIngestTrackPoints`ミューテーション）。
4. 送信成功時: バッファから該当行を削除し、`GET /api/tracks/{trackId}/points`のreact-queryキャッシュを`invalidate`して再取得する。再取得結果（`pointCount`・`coordinates`）で取得点数（AC-9）・距離（`lib/distance.ts`でcoordinatesから算出、AC-7）・地図プレビューの軌跡（AC-11）を更新する。
5. 送信失敗時（`ApiError`）: バッファはそのまま保持し、次回フラッシュサイクルで再試行する（専用のエラーUIは設けない。spec.md「対象外」参照）。

### 一時停止／再開（AC-14〜16）

1. 一時停止ボタンタップ → `useUpdateTrackStatus`ミューテーションで`PATCH {status: paused}`実行 → 成功後、`useLocationTracking`の位置監視と`useTrackPointFlush`のフラッシュループの両方を停止する（AC-15: 一時停止中は新規取得・バッファ追加・バッチ送信のいずれも行わない。既にバッファに残っている未送信点があっても送信しない）。
2. 再開ボタンタップ → `PATCH {status: recording}` → 成功後、位置監視とフラッシュループを再開する。

### 終了（AC-17〜19）

1. 終了ボタンタップ → `EndConfirmModal`表示のみ（API呼び出し無し、AC-17）。
2. 「終了する」→ `PATCH {status: finished}` 実行 → 成功後、位置監視・フラッシュループを停止し、モーダルを閉じ、レスポンスの`tripId`で`navigation.navigate('TripDetail', { tripId })`（placeholder、将来S-004実装に置換）。
3. 「キャンセル」→ API呼び出し無し、モーダルを閉じるのみ（AC-19）。

### 断絶警告バナー・圏外表示（AC-21〜25）

- `useDisruptionWarning(lastGpsFixAt, isNetworkConnected, status)`: `status==='recording'`のときのみ評価する。`isNetworkConnected===false`なら常にバナーを非表示にし（AC-25優先）、`isNetworkConnected===true`かつ`now - lastGpsFixAt >= 5分`ならバナーを表示する（AC-21）。新しいGPS取得（`lastGpsFixAt`更新）またはネットワーク切断への遷移で非表示になる（AC-22）。
- `OfflineBufferIndicator`: `useNetworkStatus`が`isConnected===false`を検知している間、`useTrackPointsBuffer`の未送信件数を表示する（AC-23）。ネットワーク復帰検知時に`useTrackPointFlush`が即座にフラッシュを試行し、成功後バッファ件数が0になった時点で表示を消す（AC-24）。

## 他機能との重複・競合チェック結果

- 確認したドキュメント/plan一覧:
  - `docs/spec/S-001/plan.md`: S-002が利用・拡張する`mobile/src/api/tracks.ts`、`mobile/src/navigation/RootNavigator.tsx`、`mobile/src/screens/map/components/map-layers/{RoutePolylineLayer,CurrentLocationMarker}.tsx`、`mobile/src/screens/map/mapStyle.ts`の実装内容を確認。S-002はこれらを「変更せず再利用」または「`RootNavigator.tsx`にルートを追加（既存`Tracking`ルートの型・呼び出し箇所は変更しない）」のみであり、矛盾する変更提案は無い。
  - `docs/domain/01_基本設計/04_データモデル.md`: 本plan.mdが提案する変更（無し）は既存定義と矛盾しない。
  - `docs/domain/01_基本設計/06_API設計.md`: 本plan.mdが実装対象とする3エンドポイント（`GET`/`PATCH /api/tracks/{trackId}`, `POST /api/tracks/{trackId}/points`）は既存定義通りのリクエスト/レスポンス形状で実装し、変更提案は無い。
  - `api/src/main/java/com/triplog/api/`配下の既存実装（trip/track/trackpoint/photo/coverage/common）を確認し、`TrackController`（`/api/trips/{tripId}/tracks`専用）・`TrackPointController`（`GET /points`のみ）・`TrackRepository`・`TrackEntity`・`TrackPointRepository`・`TrackPointEntity`・`CurrentUserProvider`・`AppConstants`のいずれも本plan.mdが新規追加する3エンドポイントと衝突しないことを確認した（既存メソッド/フィールドの変更は無く、`TrackEntity`へのミューテータメソッド追加、`TrackPointController`への`@PostMapping`追加、`TrackPointRepository`への書き込み系メソッド追加のみ）。
- 見つかった重複・競合: 無し。

## 技術的リスク・懸念点

- **`GET /api/tracks/{trackId}` の追加実装スコープ**: ユーザーからの実装依頼で名指しされたのは`PATCH`/`POST`の2エンドポイントのみだが、上記の通りAC-1/4/5の自己完結的な実現にはこのGETが必須と判断した。tasks-agent/implement-agentは、本plan.mdのこの判断を前提にタスク化してよい（既存OpenAPI定義の範囲内であり、新規のAPI契約追加ではない）。
- **`regions`データ未投入**: `POST /points`の未訪問区画判定（`visited_regions`挿入、`newlyVisitedRegionIds`）は構造的に実装するが、`regions`が空のため実際には何も挿入されない（`docs/domain/01_基本設計/07_基盤設計.md`のスコープ外整理を踏襲）。動作確認（テスト）では`regions`にテストデータを直接INSERTして検証する（`TrackControllerTest`等の既存パターンと同様、`JdbcTemplate`での前処理）。
- **ネイティブモジュールのJestモック**: `expo-sqlite`・`@react-native-community/netinfo`はいずれもネイティブモジュールであり、S-001が`@maplibre/maplibre-react-native`に対して行った手動モック（`mobile/__mocks__/`）と同様の対応が必要になる見込み。tasks-agent側でタスク化する。
- **圏外・位置取得間隔等のチューニング値未確定**: spec.mdの「対象外」で明記の通り、位置取得間隔・バッチ送信間隔・バッファサイズの具体値は本plan.mdでも確定しない。実装時の暫定値（後続チューニング可能なコメント付きの定数）として扱う（S-001の`DEFAULT_SIMPLIFY_TOLERANCE_M`と同様のパターン）。
- **トラック終了時の未送信バッファの扱い**: 「終了する」実行時、ローカルバッファに未送信点が残っていてもAC-18は追加のUI/フローを規定していない（spec.md「対象外」のエラー状態同様、専用フローの定義なし）。実装時は、PATCH実行前にベストエフォートで最終フラッシュを1回試行すること（失敗しても終了自体は妨げない）を推奨するが、これはAC化されていない拡張的な安全策であり必須要件ではない。未送信のまま終了した場合のデータ欠落は本plan.mdでは許容する。
- **距離計算のクライアント/サーバ差異**: 距離はクライアント側でhaversine計算する（`GET /points`のGeoJSON coordinatesから算出）。画面定義書のSQL相当は`ST_Length`（球面上の測地線距離、PostGIS `geography`型）であり、haversine近似とは数m単位の誤差が生じ得るが、小数第1位km表示（AC-7）の精度要件を満たす範囲であり許容する。
- **Dev Build前提**: 本plan.mdの実装（`expo-sqlite`・`@react-native-community/netinfo`を含む）はS-001同様Dev Build上での実機/シミュレータ確認が必要（`docs/works/mobile_dev_build_setup.md`）。型チェック・ユニットテスト・コンポーネントテストまでを完了の目安とし、ネイティブ実行確認はブロッカーとしない（S-001 plan.mdと同方針）。

## 未解決事項（要確認）

なし。spec.mdのQ1は解消済み。本plan策定にあたり新たに発生した確認事項（`GET /api/tracks/{trackId}`追加実装の要否、`endedAt`のリクエスト解釈）はいずれもOpenAPI定義・画面定義書のSQL相当・S-001の既存実装から一意に導出できたため、ユーザーへの追加確認は行わなかった（判断根拠は上記各セクションに明記）。
