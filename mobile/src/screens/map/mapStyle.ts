// T-31: ローカル開発用 地図スタイル/タイル 暫定対応。
//
// MapLibreのスタイルJSON URLは環境変数 `EXPO_PUBLIC_MAP_STYLE_URL` で外出しする
// （CLAUDE.md「絶対に守るべき制約」: 接続先はすべて環境変数化する）。
// 本番/自宅サーバ用のPMTiles配置（Cloudflare R2/MinIO `triplog-tiles`バケット）は
// 別タスク（未着手）であり、未設定時はローカル開発用の暫定フォールバックとして
// MapLibre公式の公開デモスタイルを使う（plan.md「技術的リスク・懸念点」参照）。
// 本番運用時は `.env` に実URLを設定するだけで切り替わる。
const FALLBACK_MAP_STYLE_URL = 'https://demotiles.maplibre.org/style.json';

export function getMapStyleUrl(): string {
  return process.env.EXPO_PUBLIC_MAP_STYLE_URL ?? FALLBACK_MAP_STYLE_URL;
}
