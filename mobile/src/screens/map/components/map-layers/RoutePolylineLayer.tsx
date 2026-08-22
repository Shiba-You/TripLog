// AC-6, AC-7: 経路ポリラインレイヤー。
// フィルタON旅行のtrack_pointsを trips.color でポリライン描画する。
// track_pointsが0件（geometryがnull/coordinates空）のトラックは描画をスキップする（AC-7）。
//
// 実装メモ: `@maplibre/maplibre-react-native` はExpo Go非対応・ネイティブモジュール必須のため、
// Jest実行時は `mobile/__mocks__/@maplibre/maplibre-react-native.tsx` の手動モックが自動適用される。
// 本コンポーネントのGeoJSON/スタイル生成ロジック（buildRouteFeatureCollection）は
// ネイティブ描画に依存せず単体テスト可能。
// TODO: Dev Build環境が整い次第、実機/シミュレータでポリラインが正しい色・経路で描画されることを確認する。
import { GeoJSONSource, Layer } from '@maplibre/maplibre-react-native';
import type { Feature, FeatureCollection, LineString } from 'geojson';

export interface RouteEntry {
  tripId: string;
  color: string;
  /** GET /api/tracks/{trackId}/points のレスポンス相当 */
  feature: { geometry: { type: 'LineString'; coordinates: number[][] } | null | undefined } | undefined;
}

export interface RoutePolylineLayerProps {
  routes: RouteEntry[];
  visible: boolean;
}

export function buildRouteFeatureCollection(routes: RouteEntry[]): FeatureCollection<LineString> {
  const features: Feature<LineString>[] = routes
    .filter((route) => (route.feature?.geometry?.coordinates?.length ?? 0) > 0)
    .map((route) => ({
      type: 'Feature',
      geometry: route.feature!.geometry as LineString,
      properties: { tripId: route.tripId, color: route.color },
    }));
  return { type: 'FeatureCollection', features };
}

export function RoutePolylineLayer({ routes, visible }: RoutePolylineLayerProps) {
  if (!visible) return null;

  const collection = buildRouteFeatureCollection(routes);
  if (collection.features.length === 0) return null;

  return (
    <GeoJSONSource id="route-polyline-source" data={collection}>
      <Layer
        id="route-polyline-line"
        type="line"
        paint={{ 'line-color': ['get', 'color'], 'line-width': 3 }}
        layout={{ 'line-cap': 'round', 'line-join': 'round' }}
      />
    </GeoJSONSource>
  );
}
