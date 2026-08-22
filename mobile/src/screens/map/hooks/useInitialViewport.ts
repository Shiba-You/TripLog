// AC-36: 地図初期表示範囲の決定（フォールバック優先順位）。
//
// 優先順位:
//   1. 位置情報許可あり かつ 現在地取得成功 → 現在地を中心に表示
//   2. 上記が満たされない場合 → 直近のトラックポイント座標を中心に表示
//   3. 上記も満たされない場合 → 全トラックポイントのbounding boxにフィット
//   4. トラックポイントが1件も無い → 日本全体が収まる範囲
//
// plan.md「技術的リスク・懸念点」の通り、優先順位2/3は同一の
// 「全track_pointsのbounding boxへのfitBounds」処理に一本化する
// （1点のみの場合はbounding boxがその点そのものになるため、優先順位2の意図も自然に満たされる）。
import { useMemo } from 'react';

export interface LngLat {
  lng: number;
  lat: number;
}

/** [west, south, east, north] 順（@maplibre/maplibre-react-native の LngLatBounds と同順） */
export type LngLatBounds = [west: number, south: number, east: number, north: number];

export type InitialViewport =
  | { kind: 'currentLocation'; center: LngLat; zoomLevel: number }
  | { kind: 'trackBounds'; bounds: LngLatBounds }
  | { kind: 'japan'; bounds: LngLatBounds };

/** 日本全体が収まる範囲（沖縄〜北海道を包含する概算bbox）。AC-36優先順位4。 */
export const JAPAN_BOUNDS: LngLatBounds = [122.8, 24.0, 153.99, 45.7];

export const DEFAULT_POINT_ZOOM_LEVEL = 14;

/**
 * 現在地・単一点を中心にした際の写真取得用bboxの概算半幅（度）。
 * 実際に描画されたMapViewの可視範囲を使うのが理想だが（plan.md データフロー6.）、
 * Dev Build環境未整備でネイティブ描画確認ができないため、初期表示範囲決定ロジックから
 * 決定的に導出する（要確認事項: 実機確認後、必要であれば実際のカメラ可視範囲に置き換える）。
 */
const POINT_BBOX_HALF_WIDTH_DEG = 0.05;

export type TrackPointsLike = {
  // 実データはyupスキーマ検証済みの `number[][]`（各点2要素以上）。
  // タプル型にはせず、呼び出し側で要素数を検証してから扱う。
  geometry: { type: 'LineString'; coordinates: number[][] } | null | undefined;
} | null | undefined;

function collectCoordinates(features: TrackPointsLike[]): Array<[number, number]> {
  const coords: Array<[number, number]> = [];
  for (const feature of features) {
    const lineCoords = feature?.geometry?.coordinates;
    if (!lineCoords) continue;
    for (const c of lineCoords) {
      if (Array.isArray(c) && c.length >= 2 && Number.isFinite(c[0]) && Number.isFinite(c[1])) {
        coords.push([c[0], c[1]]);
      }
    }
  }
  return coords;
}

function boundingBoxOf(coords: Array<[number, number]>): LngLatBounds {
  let minLng = coords[0][0];
  let maxLng = coords[0][0];
  let minLat = coords[0][1];
  let maxLat = coords[0][1];
  for (const [lng, lat] of coords) {
    if (lng < minLng) minLng = lng;
    if (lng > maxLng) maxLng = lng;
    if (lat < minLat) minLat = lat;
    if (lat > maxLat) maxLat = lat;
  }
  return [minLng, minLat, maxLng, maxLat];
}

export function computeInitialViewport(
  currentLocation: LngLat | null,
  trackPointFeatures: TrackPointsLike[]
): InitialViewport {
  if (currentLocation) {
    return { kind: 'currentLocation', center: currentLocation, zoomLevel: DEFAULT_POINT_ZOOM_LEVEL };
  }

  const coords = collectCoordinates(trackPointFeatures);
  if (coords.length === 0) {
    return { kind: 'japan', bounds: JAPAN_BOUNDS };
  }

  return { kind: 'trackBounds', bounds: boundingBoxOf(coords) };
}

/** AC-1/AC-36: 確定した初期表示範囲から `GET /api/photos?bbox=...` に使うbboxを導出する。 */
export function viewportToBbox(viewport: InitialViewport): LngLatBounds {
  if (viewport.kind === 'currentLocation') {
    const { lng, lat } = viewport.center;
    return [
      lng - POINT_BBOX_HALF_WIDTH_DEG,
      lat - POINT_BBOX_HALF_WIDTH_DEG,
      lng + POINT_BBOX_HALF_WIDTH_DEG,
      lat + POINT_BBOX_HALF_WIDTH_DEG,
    ];
  }
  return viewport.bounds;
}

export function useInitialViewport(
  currentLocation: LngLat | null,
  trackPointFeatures: TrackPointsLike[]
): InitialViewport {
  return useMemo(
    () => computeInitialViewport(currentLocation, trackPointFeatures),
    // trackPointFeaturesは呼び出し側で安定した配列参照を渡すこと（useMapScreenQueries側で集約）
    [currentLocation, trackPointFeatures]
  );
}
