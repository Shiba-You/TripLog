# S-002 トラッキング タスク分解

## 参照

- docs/spec/S-002/spec.md
- docs/spec/S-002/plan.md

## 前提・スコープメモ

- データモデル変更（マイグレーション）は無し。`plan.md`「データモデル」節の通り既存テーブル（`tracks`/`track_points`/`trips`/`regions`/`visited_regions`）のみで実現できるため、db層のタスクは存在しない。
- S-001で実装済みの以下の資産はそのまま再利用し、本tasks.mdでは再タスク化しない: `RoutePolylineLayer`・`CurrentLocationMarker`・`getMapStyleUrl()`（`mobile/src/screens/map/`配下）、`useTrips`（`mobile/src/api/trips.ts`）、`GET /api/tracks/{trackId}/points`（api実装済み・`useTrackPoints`/`fetchTrackPoints`）、`shared`の`trackSchema`/`trackPointsFeatureSchema`、`mobile/src/api/client.ts`（`apiFetch`）、`CurrentUserProvider`。
- `expo-sqlite`・`@react-native-community/netinfo`はネイティブモジュールであり、S-001が`@maplibre/maplibre-react-native`に対して行った手動モック（`mobile/__mocks__/`）と同様の対応が必要（T-5で実施）。これに依存するコンポーネント・フック（T-9, T-10, T-12, T-18, T-24）は、Jestでのユニット/コンポーネントテストの成功までを完了の定義とし、Dev Build環境（`docs/works/mobile_dev_build_setup.md`、S-001と同様に別タスク・未着手）が整い次第、実機/シミュレータでの動作確認を別途行う（S-001 tasks.mdと同方針）。
- 位置取得間隔・バッチ送信間隔・バッファサイズの具体値は`plan.md`の通り本tasks.mdでも確定しない。実装時はチューニング可能な暫定定数として扱う（T-11, T-12）。
- 終了時にローカルバッファの未送信点をベストエフォートで1回フラッシュしてから`PATCH {status: finished}`を呼ぶ挙動は、`plan.md`「技術的リスク・懸念点」に記載の推奨的な安全策でありAC化された必須要件ではない。T-24（TrackingScreen統合）の実装詳細として扱い、独立タスクは起こさない。

## タスク一覧

### T-1: `GET /api/tracks/{trackId}` 実装

- レイヤー: api
- 内容: `TrackDetailController`（新規、`/api/tracks/{trackId}`）/ `GetTrackUseCase`（新規）/ 既存`TrackRepository`への`findByIdAndUserId`追加（Hibernate/JPA） + 既存`TrackPointRepository.countByTrackIdAndUserId`を実装する。レスポンスは既存`TrackDto`をそのまま利用する。存在しない/他ユーザー所有の`trackId`は404（既存`ListPhotosUseCase`のパターンを踏襲）。
- 対応AC: AC-1, AC-2, AC-4, AC-5, AC-6
- 依存タスク: なし
- サイズ: S
- テスト観点: `@SpringBootTest`/MockMvcで、`tracks`が存在する`trackId`に対しレスポンス形状がOpenAPI `Track`スキーマ（`id`/`tripId`/`source`/`status`/`startedAt`/`endedAt`/`lastPointAt`/`pointCount`）と一致すること、`track_points`0件時に`pointCount=0`で返ること、存在しない`trackId`・他ユーザー所有の`trackId`で404が返ることを確認する。
- 状態: 完了

### T-2: `PATCH /api/tracks/{trackId}` 実装

- レイヤー: api
- 内容: `TrackDetailController`（T-1と同一クラス）に`@PatchMapping`を追加 / `UpdateTrackStatusUseCase`（新規） / `TrackEntity`へ状態遷移用のミューテータメソッド（`pause()`/`resume()`/`finish(Instant endedAt)`、`startLive`と同様のファクトリ/ミューテータパターン）を追加し、既存`TrackRepository`（UPDATE）で永続化する。リクエストボディは`{status: recording|paused|finished}`のみを受け付け、`status=finished`時は`ended_at`をサーバ側で`now()`により自動設定する（`endedAt`はリクエストに含めない、plan.md「API契約」参照）。
- 対応AC: AC-14, AC-16, AC-18
- 依存タスク: なし
- サイズ: S
- テスト観点: `@SpringBootTest`/MockMvcで、`{status: paused}`送信後に`tracks.status='paused'`になること、`{status: recording}`送信後に`'recording'`へ戻ること、`{status: finished}`送信後に`status='finished'`かつ`ended_at`が非NULLで設定されレスポンスに含まれること、存在しない/他ユーザー所有の`trackId`で404が返ることを確認する。
- 状態: 完了

### T-3: `POST /api/tracks/{trackId}/points` 実装

- レイヤー: api
- 内容: `api/build.gradle.kts`に`mybatis-spring-boot-starter`を追加（未追加の場合。S-001 T-9で追加済みなら不要）。既存`TrackPointController`に`@PostMapping`を追加 / `IngestTrackPointsUseCase`（新規、`@Transactional`） / `TrackPointMapper`（新規、MyBatis全アノテーション方式）を実装し、(1) `track_points`へのバッチINSERT（`<script>`+`<foreach>`）、(2) `tracks.last_point_at`の再計算UPDATE、(3) `regions`とのST_Contains突合による`visited_regions`への未訪問区画INSERT（`ON CONFLICT (user_id, region_id) DO NOTHING RETURNING region_id`）を1トランザクションで行う。リクエストDTO（`TrackPointBatchRequestDto`/`TrackPointInputDto`）・レスポンスDTO（`TrackPointBatchResultDto{accepted, newlyVisitedRegionIds}`）をOpenAPIの`TrackPointBatch`/`TrackPoint`スキーマに対応させて新規作成する。
- 対応AC: AC-13, AC-24
- 依存タスク: なし
- サイズ: L
- テスト観点: `@SpringBootTest`/MockMvc（+`JdbcTemplate`での`regions`前処理）で、複数点のバッチ送信後に`track_points`が全件追加され`tracks.last_point_at`が最新の`recorded_at`に更新されること、`regions`にテストデータを投入したうえで新規訪問区画が`visited_regions`へ挿入され`newlyVisitedRegionIds`に含まれること、`regions`未投入時（空）は例外にならず`newlyVisitedRegionIds`が空配列になること、存在しない/他ユーザー所有の`trackId`で404が返ることを確認する。
- 状態: 完了

### T-4: shared `POST /points` レスポンススキーマ

- レイヤー: shared
- 内容: `shared/src/schemas/`に`trackPointBatchResultSchema`（`{accepted, newlyVisitedRegionIds}`）を追加し、`shared/src/api-types.ts`の型と整合させる。単体テスト（正常系・`newlyVisitedRegionIds`が空配列の場合を含む）を作成する。
- 対応AC: 無し（AC-13/24を支えるAPIレスポンスの実行時検証基盤）
- 依存タスク: なし
- サイズ: S
- テスト観点: Jestで、`accepted`件数・`newlyVisitedRegionIds`（空配列/非空）双方のレスポンス例に対しバリデーションが成功することを確認する。
- 状態: 完了

### T-5: mobile 新規ライブラリ導入 + ネイティブモジュールモック整備

- レイヤー: mobile
- 内容: `expo-sqlite`, `@react-native-community/netinfo`を導入。S-001の`mobile/__mocks__/@maplibre/maplibre-react-native.tsx`と同様の手動モック（`mobile/__mocks__/expo-sqlite.ts`, `mobile/__mocks__/@react-native-community/netinfo.ts`）を作成し、Jest設定（`moduleNameMapper`等）に反映する。
- 対応AC: 無し（後続のmobileタスク（T-9, T-10, T-12, T-18, T-24）の前提となる基盤整備）
- 依存タスク: なし
- サイズ: S
- テスト観点: `pnpm --filter mobile test`で、`expo-sqlite`/`netinfo`をimportするダミーコンポーネントのサンプルテストがモック経由でエラー無く成功すること。`pnpm --filter mobile tsc --noEmit`が通ること。
- 状態: 完了

### T-6: `mobile/src/api/tracks.ts` 拡張（`useTrack`/`useUpdateTrackStatus`/`useIngestTrackPoints`）

- レイヤー: mobile
- 内容: 既存`mobile/src/api/tracks.ts`に、`GET /api/tracks/{trackId}`を呼ぶ`useTrack`、`PATCH /api/tracks/{trackId}`を呼ぶ`useUpdateTrackStatus`ミューテーション、`POST /api/tracks/{trackId}/points`を呼ぶ`useIngestTrackPoints`ミューテーションを追加する。`useTrack`は既存`trackSchema`、`useIngestTrackPoints`はT-4の`trackPointBatchResultSchema`でレスポンスを検証する。
- 対応AC: AC-1, AC-2, AC-4, AC-5, AC-6, AC-13, AC-14, AC-16, AC-18, AC-24
- 依存タスク: T-4
- サイズ: M
- テスト観点: モックした`apiFetch`に対し、`useTrack`が`data`/`isLoading`/`isError`を正しく返すこと、`useUpdateTrackStatus`実行で`{status}`ボディが送信されること、`useIngestTrackPoints`実行でバッチ点配列が送信されレスポンス（`accepted`/`newlyVisitedRegionIds`）を受け取れること、いずれも不正レスポンス時にエラー扱いになることをJestで確認する。
- 状態: 完了

### T-7: `lib/distance.ts`（haversine距離計算）

- レイヤー: mobile
- 内容: `mobile/src/screens/tracking/lib/distance.ts`に、GeoJSON `coordinates`（経度緯度の配列）から累計距離（km）を算出するhaversine関数を実装する。
- 対応AC: AC-7
- 依存タスク: なし
- サイズ: S
- テスト観点: Jestで、既知の2点間距離が期待値（許容誤差内）になること、点が0件・1件の場合に距離0を返すことを確認する。
- 状態: 完了

### T-8: `useElapsedTime` フック

- レイヤー: mobile
- 内容: `mobile/src/screens/tracking/hooks/useElapsedTime.ts`に、`startedAt`（`Instant`文字列）を入力に`now() - startedAt`を1秒ごとに再計算し「HH:MM:SS」文字列を返すフックを実装する。`startedAt`がNULL/undefinedの場合は「00:00:00」を返す。
- 対応AC: AC-5, AC-6
- 依存タスク: なし
- サイズ: S
- テスト観点: Jestのフェイクタイマーで、1秒経過ごとに表示文字列が更新されること、`status='paused'`であっても計算が継続すること（対象外セクション通り一時停止を差し引かないこと）、`startedAt`未定義時に常に「00:00:00」を返すことを確認する。
- 状態: 完了

### T-9: `useNetworkStatus` フック

- レイヤー: mobile
- 内容: `mobile/src/screens/tracking/hooks/useNetworkStatus.ts`に、`@react-native-community/netinfo`の`addEventListener`をラップし`isConnected: boolean`を返すフックを実装する。
- 対応AC: AC-23, AC-25
- 依存タスク: T-5
- サイズ: S
- テスト観点: T-5のnetinfoモックを用い、接続あり/接続不通イベント発火時にフックの戻り値が追随して変化することをJestで確認する。
- 状態: 完了

### T-10: `useTrackPointsBuffer` フック（SQLiteローカルバッファ）

- レイヤー: mobile
- 内容: `mobile/src/screens/tracking/hooks/useTrackPointsBuffer.ts`に、`expo-sqlite`を用いた未送信点バッファのテーブル初期化・行追加・全件取得・件数取得・送信成功分の削除を行うフックを実装する。
- 対応AC: AC-23, AC-24
- 依存タスク: T-5
- サイズ: M
- テスト観点: T-5のexpo-sqliteモックを用い、点の追加後に件数取得が増分を反映すること、全件取得したのちの削除で件数が0に戻ること、初期化前（テーブル未作成）でもクラッシュしないことをJestで確認する。
- 状態: 完了

### T-11: `useLocationTracking` フック

- レイヤー: mobile
- 内容: `mobile/src/screens/tracking/hooks/useLocationTracking.ts`に、`expo-location`の`watchPositionAsync`をラップし、`status='recording'`のときのみ位置取得を開始し、取得ごとに「最終GPS取得時刻」を更新するフックを実装する（開始/停止はフックのenable引数で制御、AC-15の一時停止時停止に対応）。
- 対応AC: AC-13, AC-15, AC-16
- 依存タスク: なし
- サイズ: M
- テスト観点: `expo-location`をモックし、`enabled=true`のとき`watchPositionAsync`が呼ばれ位置取得コールバックで「最終GPS取得時刻」が更新されること、`enabled=false`（一時停止相当）のとき購読が解除され新たな取得コールバックが発火しないことをJestで確認する。
- 状態: 完了

### T-12: `useTrackPointFlush` フック

- レイヤー: mobile
- 内容: `mobile/src/screens/tracking/hooks/useTrackPointFlush.ts`に、T-10のバッファ内容を一定間隔／一定件数到達／T-9のネットワーク復帰イベントをトリガーにT-6の`useIngestTrackPoints`へまとめて送信し、成功時にバッファから該当行を削除し`GET /api/tracks/{trackId}/points`のreact-queryキャッシュを`invalidate`するフックを実装する。送信失敗時はバッファを保持し次回サイクルで再試行する。
- 対応AC: AC-13, AC-15, AC-24
- 依存タスク: T-6, T-9, T-10
- サイズ: M
- テスト観点: モックした送信成功時にバッファが空になりキャッシュ`invalidate`が呼ばれること、送信失敗時にバッファが保持され再試行対象になること、ネットワーク復帰イベント発火時に即座にフラッシュが試行されること、`enabled=false`（一時停止相当）のときフラッシュが発生しないことをJestで確認する。
- 状態: 完了

### T-13: `useDisruptionWarning` フック

- レイヤー: mobile
- 内容: `mobile/src/screens/tracking/hooks/useDisruptionWarning.ts`に、`useDisruptionWarning(lastGpsFixAt, isNetworkConnected, status)`を実装する。`status!=='recording'`では常にfalse。`isNetworkConnected===false`のときは常にfalse（AC-25優先）。`isNetworkConnected===true`かつ`now - lastGpsFixAt >= 5分`（既定閾値、定数化）でtrueを返す。
- 対応AC: AC-21, AC-22, AC-25
- 依存タスク: T-9
- サイズ: S
- テスト観点: Jestのフェイクタイマーで、「オンライン+5分超過→true」「オンライン+5分未満→false」「オフライン（GPS取得可否によらず）→false」「新規GPS取得で経過時間がリセットされfalseに戻る」の各分岐を確認する。
- 状態: 完了

### T-14: `StatusHeader` コンポーネント

- レイヤー: mobile
- 内容: `mobile/src/screens/tracking/components/StatusHeader.tsx`に、`status`によるステータス文言切替（AC-2）、記録中インジケータの点滅ドット表示切替（AC-3）、旅行名+色チップ（AC-4）を実装する。
- 対応AC: AC-2, AC-3, AC-4
- 依存タスク: なし
- サイズ: S
- テスト観点: RTLで、`status='recording'`時「記録中」+インジケータ表示、`status='paused'`時「一時停止中」+インジケータ非表示、旅行名・色propsがチップのテキスト/背景色に反映されることを確認する。
- 状態: 完了

### T-15: `ElapsedTimeText` コンポーネント

- レイヤー: mobile
- 内容: `mobile/src/screens/tracking/components/ElapsedTimeText.tsx`に、T-8の`useElapsedTime`を用いて経過時間を描画するコンポーネントを実装する。
- 対応AC: AC-5, AC-6
- 依存タスク: T-8
- サイズ: S
- テスト観点: RTL+フェイクタイマーで、`startedAt`ありのとき「HH:MM:SS」形式が1秒毎に更新されること、`startedAt`未定義（NULL相当）のとき「00:00:00」が表示されることを確認する。
- 状態: 完了

### T-16: `DistanceText` コンポーネント

- レイヤー: mobile
- 内容: `mobile/src/screens/tracking/components/DistanceText.tsx`に、T-7の`distance.ts`を用いて`track_points`の座標配列から累計距離を「X.Xkm」形式で描画するコンポーネントを実装する。
- 対応AC: AC-7, AC-8
- 依存タスク: T-7
- サイズ: S
- テスト観点: RTLで、座標2点以上のとき算出距離が小数第1位で表示されること、座標0点・1点のとき「0.0km」が表示されることを確認する。
- 状態: 完了

### T-17: `PointCountText` コンポーネント

- レイヤー: mobile
- 内容: `mobile/src/screens/tracking/components/PointCountText.tsx`に、`pointCount`をそのまま数値表示するコンポーネントを実装する。
- 対応AC: AC-9, AC-10
- 依存タスク: なし
- サイズ: S
- テスト観点: RTLで、`pointCount>=1`のときその数値が表示されること、`pointCount=0`のとき「0」が表示されることを確認する。
- 状態: 完了

### T-18: `TrackingMapPreview` コンポーネント

- レイヤー: mobile
- 内容: `mobile/src/screens/tracking/components/TrackingMapPreview.tsx`に、S-001既存の`RoutePolylineLayer`・`CurrentLocationMarker`・`getMapStyleUrl()`を合成し、1トラックのみを描画する小さな読み取り専用地図を実装する。`track_points`0件時は軌跡なし・現在地のみを表示する。
- 対応AC: AC-11, AC-12
- 依存タスク: なし
- サイズ: M
- テスト観点: propsに応じたレイヤー合成ロジック（`track_points`有無での軌跡描画/非描画分岐）をJestでユニットテストする。MapLibreコンポーネント自体の実描画確認はDev Build環境完了後に行う。
- 状態: 完了
- フォローアップ: Dev Build環境が整い次第、実機/シミュレータで軌跡・現在地が正しく描画されることを確認する。

### T-19: `DisruptionBanner` コンポーネント

- レイヤー: mobile
- 内容: `mobile/src/screens/tracking/components/DisruptionBanner.tsx`に、T-13の`useDisruptionWarning`の判定結果（boolean）と経過分数を受け取り、危険色バナー＋「N分間位置が取得できていません」文言を表示するコンポーネントを実装する。
- 対応AC: AC-21, AC-22, AC-25
- 依存タスク: なし
- サイズ: S
- テスト観点: RTLで、表示propが`true`のとき経過分数を反映した文言でバナーが描画されること、`false`のとき何も描画されないことを確認する。
- 状態: 完了

### T-20: `OfflineBufferIndicator` コンポーネント

- レイヤー: mobile
- 内容: `mobile/src/screens/tracking/components/OfflineBufferIndicator.tsx`に、`isConnected===false`のときバッファ未送信件数を「圏外: ローカルに◯件保存中」の形式で表示するコンポーネントを実装する。
- 対応AC: AC-23, AC-24, AC-25
- 依存タスク: なし
- サイズ: S
- テスト観点: RTLで、`isConnected=false`+件数propに応じた文言が描画されること、`isConnected=true`のとき何も描画されないこと、件数propの増減に応じて表示が更新されることを確認する。
- 状態: 完了

### T-21: `TrackingControls` コンポーネント

- レイヤー: mobile
- 内容: `mobile/src/screens/tracking/components/TrackingControls.tsx`に、一時停止/再開ボタン（`status`に応じたラベル切替、AC-14, AC-16）と終了ボタン（AC-17、モーダル表示トリガーのコールバック呼び出しのみ）を実装する。
- 対応AC: AC-14, AC-16, AC-17
- 依存タスク: なし
- サイズ: S
- テスト観点: RTLで、`status='recording'`時ラベル「一時停止」、`status='paused'`時ラベル「再開」であること、各ボタンタップで対応するコールバックが呼ばれること、終了ボタンタップでAPI呼び出し無くモーダル表示コールバックのみが呼ばれることを確認する。
- 状態: 完了

### T-22: `EndConfirmModal` コンポーネント

- レイヤー: mobile
- 内容: `mobile/src/screens/tracking/components/EndConfirmModal.tsx`に、「トラッキングを終了しますか」見出し＋「終了する」「キャンセル」2ボタンのモーダルを実装する。
- 対応AC: AC-17, AC-18, AC-19
- 依存タスク: なし
- サイズ: S
- テスト観点: RTLで、表示propに応じたモーダル表示/非表示、「終了する」タップで確定コールバックが呼ばれること、「キャンセル」タップでAPI呼び出しに相当するコールボックが呼ばれず閉じるコールバックのみが呼ばれることを確認する。
- 状態: 完了

### T-23: `TripDetailScreenPlaceholder` 新規作成 + `RootNavigator`ルート追加

- レイヤー: mobile
- 内容: `mobile/src/screens/placeholder/TripDetailScreenPlaceholder.tsx`（S-004向け最小限placeholder、タイトルのみ）を新規作成する。`mobile/src/navigation/RootNavigator.tsx`の`RootStackParamList`に`TripDetail: { tripId: string }`を追加し、当該placeholderへ紐付ける。既存`Tracking`ルートの型・呼び出し箇所には手を入れない。
- 対応AC: AC-18（終了確認後の遷移先を確保するための前提。S-004本体の実装はスコープ外）
- 依存タスク: なし
- サイズ: S
- テスト観点: RTLで、`navigation.navigate('TripDetail', { tripId })`呼び出し（モック経由）で`TripDetailScreenPlaceholder`へ遷移することを確認する。
- 状態: 完了

### T-24: `TrackingScreen` 統合（状態オーケストレーション）

- レイヤー: mobile
- 内容: T-6〜T-23で作成したフック・コンポーネントを`mobile/src/screens/tracking/TrackingScreen.tsx`に統合する。画面表示直後の初期化（`useTrack`+`useTrips`キャッシュ+`useTrackPoints`、AC-1, 4, 5, 6）、位置情報バッチ送信と画面反映（AC-13）、一時停止/再開時の位置監視・フラッシュループ制御（AC-14〜16）、終了確認モーダル〜`PATCH {status:finished}`〜`TripDetail`遷移（AC-17〜19）、断絶警告バナー・圏外表示の排他制御（AC-21〜25）を結線する。`mobile/src/navigation/RootNavigator.tsx`の`Tracking`ルートの`component`を`TrackingScreenPlaceholder`から`TrackingScreen`に置換する。
- 対応AC: AC-1〜AC-25（全件、統合担当。個別ACの主担当は各下位タスクを参照）
- 依存タスク: T-6, T-7, T-8, T-9, T-10, T-11, T-12, T-13, T-14, T-15, T-16, T-17, T-18, T-19, T-20, T-21, T-22, T-23
- サイズ: L
- テスト観点: RTL+react-query test utilsで、5状態（記録中/一時停止/断絶警告/終了確認モーダル/圏外ローカル蓄積中）それぞれのレンダリング結果がspec.mdの該当ACと一致する結合テストを作成する。断絶警告バナーと圏外時ローカル蓄積表示が同時に表示されないこと（AC-25）、一時停止中に取得点数・距離・地図プレビューが増加しないこと（AC-15）を含める。
- 状態: 完了
- フォローアップ: Dev Build環境が整い次第、実機/シミュレータで位置取得・圏外検知・画面全体の動作を確認する。

### T-25: spec.md受け入れ基準の結合確認・是正

- レイヤー: mobile / api（横断）
- 内容: AC-1〜AC-25を1件ずつ突き合わせ、Given/When/Thenが実装（T-1〜T-24）で満たされているかをレビュー・必要なら手動/自動テストで検証する。満たされていないACがあれば該当タスクを修正する。
- 対応AC: AC-1〜AC-25（全件）
- 依存タスク: T-1, T-2, T-3, T-24
- サイズ: M
- テスト観点: spec.mdのAC一覧をチェックリスト化し、各ACについて「対応するテスト（api/mobileの自動テスト、または該当タスクの手動確認結果）」を記録する。未充足のACが無いことを確認する。
- 状態: 完了

## 実装スケジュール（フェーズ分け）

### Phase 1: 基盤整備（並行可）

- 対象タスク: T-1, T-2, T-3（api 3エンドポイント、api内では並行可）, T-4（shared レスポンススキーマ）, T-5（mobile 新規ライブラリ導入+テストモック）

### Phase 2: mobile フック・コンポーネント層（Phase1完了後、並行可）

- 対象タスク: T-6（T-4依存）, T-7, T-8, T-9（T-5依存）, T-10（T-5依存）, T-11, T-14, T-15（T-8依存）, T-16（T-7依存）, T-17, T-18, T-19, T-20, T-21, T-22, T-23

### Phase 3: mobile 結合フック（Phase2完了後）

- 対象タスク: T-12（T-6, T-9, T-10完了後）, T-13（T-9完了後）

### Phase 4: 統合

- 対象タスク: T-24（T-6〜T-23の全mobileタスク完了後）

### Phase 5: 受け入れ確認

- 対象タスク: T-25（T-1, T-2, T-3, T-24完了後）

## 未解決事項（要確認）

- 位置取得間隔・バッチ送信間隔・バッファサイズの具体値（T-11, T-12）は本tasks.mdでも確定していない。plan.md「対象外」の通り、実装時のチューニング対象として着手時に暫定値を設定する（後続調整可能なコメント付き定数とする）。
- Dev Build環境構築（`docs/works/mobile_dev_build_setup.md`）の方式（ローカル完結 or EAS Build）はS-001時点から未決定（Apple Developer Program登録有無が未確認）。本tasks.mdのスコープ外だが、T-18・T-24のフォローアップ（実機/シミュレータ確認）の着手可否に影響するため、並行して解決される必要がある。
- api側のテスト実行方式（Testcontainers利用か、既存のDocker Compose `db`コンテナに対して実行するか）はS-001時点から未確定。T-1〜T-3の実装着手時（`implement-agent`）に確認・決定すること（S-001 tasks.mdの未解決事項を継承）。
