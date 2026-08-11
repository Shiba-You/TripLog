# Figma画面プロトタイプ 作業状況

最終更新: 2026-08-11

## 概要

`docs/domain/01_基本設計/05_画面設計.md` の「各画面のFigma向け設計仕様」に基づき、Figma上に全14画面（S-001〜S-009, W-001〜W-005）のワイヤーフレームプロトタイプを作成する作業。**Figma MCP（Starterプラン）のツール呼び出し上限に到達したため、14画面中6画面で中断中。**

- 対象Figmaファイル: https://www.figma.com/design/JeilqxYLk7NZeWFPo5wh9q/Untitled
- fileKey: `JeilqxYLk7NZeWFPo5wh9q`
- 中断理由: `use_figma` / `get_metadata` / `get_screenshot` 呼び出しが `"You've reached the Figma MCP tool call limit on the Starter plan."` で拒否される状態（2026-08-11時点で未回復、`whoami` のみ動作）。再開にはプランのアップグレード、または上限リセット待ちが必要。

## 進捗ステータス

| 画面ID | 画面名 | 状態 | node-id | Figma URL |
|---|---|---|---|---|
| S-001 | マップ/ホーム | ✅完了 | `6:2` | https://www.figma.com/design/JeilqxYLk7NZeWFPo5wh9q/Untitled?node-id=6-2 |
| S-002 | トラッキング | ✅完了 | `7:14` | https://www.figma.com/design/JeilqxYLk7NZeWFPo5wh9q/Untitled?node-id=7-14 |
| S-003 | 旅行一覧 | ✅完了 | `8:14` | https://www.figma.com/design/JeilqxYLk7NZeWFPo5wh9q/Untitled?node-id=8-14 |
| S-004 | 旅行詳細 | ✅完了 | `9:26` | https://www.figma.com/design/JeilqxYLk7NZeWFPo5wh9q/Untitled?node-id=9-26 |
| S-005 | 写真ギャラリー | ✅完了 | `10:26` | https://www.figma.com/design/JeilqxYLk7NZeWFPo5wh9q/Untitled?node-id=10-26 |
| S-006 | 家計簿 | ✅完了 | `11:26` | https://www.figma.com/design/JeilqxYLk7NZeWFPo5wh9q/Untitled?node-id=11-26 |
| S-007 | AIチャット | ⏸未着手 | - | - |
| S-008 | GPXインポート | ⏸未着手 | - | - |
| S-009 | 設定 | ⏸未着手 | - | - |
| W-001 | ダッシュボード | ⏸未着手 | - | - |
| W-002 | 旅行ビュー | ⏸未着手 | - | - |
| W-003 | アップロード | ⏸未着手 | - | - |
| W-004 | 家計簿ビュー | ⏸未着手 | - | - |
| W-005 | 設定 | ⏸未着手 | - | - |

完了6画面分のFigma URLは `docs/domain/02_画面定義書/` 配下の各定義書（S-001〜S-006）に転記済み。S-007〜S-009・W-001〜W-005の定義書は内容（画面項目・処理・クエリ）は完成しているが、画面イメージURLが未転記（プレースホルダーのまま）。

## 完了した基盤（再開時にそのまま使える）

### デザイントークン（Figma Variables）

- コレクション名: `Colors`（モード: `Value` 1種類のみ）
- コレクションID: `VariableCollectionId:3:2`
- モードID: `3:0`

| トークン | 値 | Variable ID |
|---|---|---|
| color/primary | `#1B6B5B` | `VariableID:3:3` |
| color/accent | `#E8833A` | `VariableID:3:4` |
| color/bg | `#FBFAF6` | `VariableID:3:5` |
| color/surface | `#FFFFFF` | `VariableID:3:6` |
| color/text-primary | `#20292B` | `VariableID:3:7` |
| color/text-secondary | `#6B7472` | `VariableID:3:8` |
| color/success | `#2E9E6B` | `VariableID:3:9` |
| color/warning | `#E0A52E` | `VariableID:3:10` |
| color/danger | `#D1495B` | `VariableID:3:11` |
| color/label-teal | - | `VariableID:3:12` |
| color/label-orange | - | `VariableID:3:13` |
| color/label-blue | - | `VariableID:3:14` |
| color/label-purple | - | `VariableID:3:15` |
| color/label-green | - | `VariableID:3:16` |
| color/label-red | - | `VariableID:3:17` |
| color/label-yellow | - | `VariableID:3:18` |

補足: 8pxグリッド（4/8/16/24）・角丸12px（カード）/8px（ボタン）は数値としては適用済みだが、Variable化はされていない（未実施）。

### 共通コンポーネント

- `TabBar`（マップ/旅行/家計簿/設定の4タブ）: node-id `4:4`
  - S-001・S-003・S-006でインスタンスとして使用。アクティブタブは各インスタンス内の `tab-*` 子要素の塗りを直接上書きして表現。

### フレームグループ（Section）

- `Mobile` Section: node-id `4:2`（S-001〜S-006を格納。x座標は幅390pxフレームを48px間隔で並べる構成）
- `Web` Section: node-id `4:3`（y=1400開始、現時点でフレームは未配置）

### 未作成分の配置予定座標（再開時にそのまま使用可）

- Mobile（`4:2`内、y=40）: S-007→x=2628 / S-008→x=3066 / S-009→x=3504（フレーム幅390、間隔48）
- Web（`4:3`内、y=1400開始）: W-00(i+1)→x = i×1560（i=0..4、フレーム幅1440、間隔120）

## 仕様からの逸脱・簡略化（完了6画面分）

- コンポーネント化は時間優先のため `TabBar` のみ実施。ボタン/カード/チップ等は各画面で個別描画（複製）で対応。
- Variablesはカラートークンのみ整備。spacing/radiusは値のみ適用（変数化していない）。
- フォントは和文コンテンツが主のため `Noto Sans JP`（Regular/Medium/Bold）に統一。`Inter`自体は利用可能だが和文グリフの都合で未使用。
- S-004（旅行詳細）はコンテンツ量が多いため、`screen`フレーム高さを844pxではなく1200px（実コンテンツ高1138px）に拡張。
- S-003の旅行ラベル色ドットの一部（オレンジ/ブルー/パープル）はVariable未使用でハードコード近似色。

## 再開手順（次回この会話 or 別セッションで続きを作る場合）

1. Figma MCPのツール呼び出し上限が回復している（または上位プランにアップグレード済み）ことを `mcp__plugin_figma_figma__whoami` および軽い `get_metadata` 呼び出しで確認する。
2. `figma-use` → `figma-generate-design` スキルをロードしてから作業する（`figma-generate-library`は既に整備済みのトークンを参照するのみでよい）。
3. 上記「未作成分の配置予定座標」「コレクションID/Variable ID」「TabBarコンポーネントID」を使って、S-007〜S-009・W-001〜W-005 を同一ファイル・同一トークン/コンポーネントで作成する（画面ごとの仕様詳細は `docs/domain/01_基本設計/05_画面設計.md` を参照）。
4. 完了したら `docs/domain/02_画面定義書/S-007_AIチャット.md` 等、対象画面の定義書内「画面イメージURL(Figma)」欄にnode-id付きURLを追記し、本ファイルの進捗ステータス表も更新する。
