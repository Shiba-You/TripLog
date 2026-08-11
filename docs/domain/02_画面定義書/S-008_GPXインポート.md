# S-008 GPXインポート

## 画面イメージURL(Figma)

- ベースファイル: https://www.figma.com/design/JeilqxYLk7NZeWFPo5wh9q/Untitled
- 詳細URL（Mobileフレームセット内 `S-008_GPXインポート` フレーム）: 未作成（Figma MCPツール呼び出し上限のため中断中。状況・再開手順は [docs/works/figma_prototype_progress.md](../../works/figma_prototype_progress.md) を参照）

## 目的

既存のGPX軌跡を取り込む。（`docs/01_基本設計/05_画面設計.md` S-008参照）

## 画面項目

| No | 項目 | 種別 | 内容・バリデーション | 参照元（テーブル.カラム） | 欠損値・空値時の表示 |
|---|---|---|---|---|---|
| 1 | ファイル選択ボタン | ボタン | `.gpx`拡張子のみ許可。上限サイズを超える場合はエラー表示 | - | - |
| 2 | 取込先旅行選択 | プルダウン（必須） | 「新規作成」または既存旅行から選択 | `trips.id` / `trips.name` | S-004からの遷移時は当該`tripId`を初期選択 |
| 2-1 | ├（新規作成を選んだ場合）名称・色入力 | テキスト入力＋カラーパレット | 名称1〜50文字必須、色必須 | `trips.name` / `trips.color` | - |
| 3 | プレビュー | カード（点数・距離） | ファイル解析後に表示 | クライアント側解析結果（GPXファイルのパース） | 解析失敗時はエラーメッセージ表示 |
| 4 | 取込ボタン | プライマリボタン | プレビュー確認後に活性化 | - | - |
| 5 | 進捗表示 | プログレスバー | 取込中に表示 | - | - |

## 状態

選択前 / 解析中 / 取込確認 / 完了 / 失敗（不正なGPX形式）

## 処理

| No | トリガー | 処理内容 | 呼び出しAPI | クエリ（相当のSQL） |
|---|---|---|---|---|
| 1 | 画面表示 | 取込先旅行の選択肢を取得 | `GET /api/trips` | `SELECT id, name, color FROM trips WHERE user_id = $1 ORDER BY started_on DESC NULLS LAST;` |
| 2 | 「新規作成」選択で新規旅行を確定 | 旅行を新規作成し取込先として選択状態にする | `POST /api/trips` | `INSERT INTO trips (id, user_id, name, description, color, started_on, ended_on) VALUES (gen_random_uuid(), $1, $2, NULL, $3, NULL, NULL) RETURNING id, name, color;` |
| 3 | ファイル選択後 | GPXファイルをクライアント側で解析し、点数・総距離をプレビュー表示 | - | - |
| 4 | 取込ボタンのタップ | GPXファイルをサーバへ送信し、トラック・トラックポイントとして取り込む。あわせて訪問区画の判定を全取込点に対して実行 | `POST /api/trips/{tripId}/import/gpx`（multipart/form-data） | `INSERT INTO tracks (id, trip_id, user_id, source, status, started_at, ended_at) VALUES (gen_random_uuid(), $1, $2, 'gpx', 'finished', $3, $4) RETURNING id;`<br>`INSERT INTO track_points (track_id, user_id, geom, elevation_m, recorded_at) SELECT $1, $2, ST_MakePoint(p.lng, p.lat)::geography, p.elevation_m, p.recorded_at FROM unnest($3::gpx_point[]) AS p;`<br>`INSERT INTO visited_regions (id, user_id, region_id, first_visited_at, first_trip_id) SELECT gen_random_uuid(), $2, r.id, min(tp.recorded_at), $1 FROM track_points tp JOIN regions r ON ST_Contains(r.geom, tp.geom::geometry) WHERE tp.track_id = $4 GROUP BY r.id ON CONFLICT (user_id, region_id) DO NOTHING;` |
| 5 | 取込成功 | 完了トーストを表示し、S-004（該当旅行詳細）へ遷移 | - | - |
| 6 | 取込失敗（不正な形式・400エラー） | エラーメッセージを表示し再選択を促す | - | - |
