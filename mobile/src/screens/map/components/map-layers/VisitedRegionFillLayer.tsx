// AC-8, AC-9: 訪問エリア塗りつぶしレイヤー（市区町村単位）。
// `GET /api/coverage?regionType=city` の geojson をアクセント色半透明のFillレイヤーとして描画する。
// geojsonが空（regions未投入）の場合は何も描画しない（AC-9、エラー表示もしない）。
//
// TODO: Dev Build環境が整い次第、実機/シミュレータで塗りつぶしが正しく描画されることを確認する。
import { GeoJSONSource, Layer } from '@maplibre/maplibre-react-native';
import type { FeatureCollection, Geometry } from 'geojson';

/**
 * `GET /api/coverage` の geojson はyupの `coverageSchema` で検証済みだが、
 * yupの `mixed()`/`string()` は `@types/geojson` が要求するリテラル型（"FeatureCollection"等）を
 * 表現できないため、本コンポーネントの入力は構造的に緩い型として受け取り、
 * ネイティブ側に渡す直前でGeoJSON型にキャストする。
 */
export interface VisitedRegionGeoJson {
  type: string;
  features: Array<{ type: string; geometry: unknown; properties?: unknown }>;
}

export interface VisitedRegionFillLayerProps {
  geojson: VisitedRegionGeoJson | undefined;
  visible: boolean;
}

/** アクセント色半透明の塗りつぶし（spec.md AC-8「アクセント色半透明」） */
export const VISITED_REGION_FILL_COLOR = '#2563EB';
export const VISITED_REGION_FILL_OPACITY = 0.35;

export function VisitedRegionFillLayer({ geojson, visible }: VisitedRegionFillLayerProps) {
  if (!visible) return null;
  if (!geojson || geojson.features.length === 0) return null;

  return (
    <GeoJSONSource id="visited-region-source" data={geojson as unknown as FeatureCollection<Geometry>}>
      <Layer
        id="visited-region-fill"
        type="fill"
        paint={{ 'fill-color': VISITED_REGION_FILL_COLOR, 'fill-opacity': VISITED_REGION_FILL_OPACITY }}
      />
    </GeoJSONSource>
  );
}
