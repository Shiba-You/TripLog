// S-002 AC-11, AC-12: 地図プレビュー。1トラックのみを描画する小さな読み取り専用地図。
// S-001既存の RoutePolylineLayer・CurrentLocationMarker・getMapStyleUrl をそのまま合成する
// （plan.md「既存の仕組みをどう再利用するか」）。track_pointsが0件のときはRoutePolylineLayer側の
// 既存フィルタにより軌跡が描画されず、現在地のみが表示される（AC-12）。
//
// TODO: Dev Build環境が整い次第、実機/シミュレータで軌跡・現在地が正しく描画されることを確認する。
import { StyleSheet, View } from 'react-native';
import { Map, Camera } from '@maplibre/maplibre-react-native';

import { getMapStyleUrl } from '../../map/mapStyle';
import { RoutePolylineLayer, type RouteEntry } from '../../map/components/map-layers/RoutePolylineLayer';
import { CurrentLocationMarker } from '../../map/components/map-layers/CurrentLocationMarker';

export interface TrackingMapPreviewProps {
  currentLocation: { lng: number; lat: number } | null;
  /** GET /api/tracks/{trackId}/points のGeoJSON coordinates相当。 */
  coordinates: number[][] | null | undefined;
  tripColor: string;
}

export function TrackingMapPreview({ currentLocation, coordinates, tripColor }: TrackingMapPreviewProps) {
  const routes: RouteEntry[] = [
    {
      tripId: 'current-track',
      color: tripColor,
      feature: { geometry: coordinates && coordinates.length > 0 ? { type: 'LineString', coordinates } : null },
    },
  ];

  const cameraCenter: [number, number] = currentLocation
    ? [currentLocation.lng, currentLocation.lat]
    : (coordinates?.[coordinates.length - 1] as [number, number] | undefined) ?? [139.767, 35.681];

  return (
    <View style={styles.container} testID="tracking-map-preview">
      <Map style={styles.map} mapStyle={getMapStyleUrl()}>
        <Camera initialViewState={{ center: cameraCenter, zoom: 14 }} />
        <RoutePolylineLayer routes={routes} visible />
        <CurrentLocationMarker location={currentLocation} isPermissionGranted={true} />
      </Map>
    </View>
  );
}

const styles = StyleSheet.create({
  container: { height: 160, borderRadius: 12, overflow: 'hidden' },
  map: { flex: 1 },
});
