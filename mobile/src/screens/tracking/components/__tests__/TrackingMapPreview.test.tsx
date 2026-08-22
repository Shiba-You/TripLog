import { render, screen } from '@testing-library/react-native';

import { TrackingMapPreview } from '../TrackingMapPreview';

describe('TrackingMapPreview', () => {
  it('AC-11: track_pointsが1件以上のとき軌跡ポリラインが描画される', async () => {
    await render(
      <TrackingMapPreview
        currentLocation={{ lng: 139.0, lat: 35.0 }}
        coordinates={[
          [139.0, 35.0],
          [139.1, 35.1],
        ]}
        tripColor="#E8833A"
      />
    );

    expect(screen.getByTestId('mock-maplibre-map')).toBeTruthy();
    // RoutePolylineLayer（S-001既存資産）を再利用しており、そのGeoJSONSourceのidは固定
    // 'route-polyline-source' である（mobile/src/screens/map/components/map-layers/RoutePolylineLayer.tsx）。
    expect(screen.getByTestId('mock-maplibre-geojson-source-route-polyline-source')).toBeTruthy();
  });

  it('AC-12: track_pointsが0件のとき軌跡は描画されず現在地のみ表示される', async () => {
    await render(<TrackingMapPreview currentLocation={{ lng: 139.0, lat: 35.0 }} coordinates={[]} tripColor="#E8833A" />);

    expect(screen.queryByTestId('mock-maplibre-geojson-source-route-polyline-source')).toBeNull();
    // CurrentLocationMarker（S-001既存資産）を再利用しており、そのMarkerのidは固定
    // 'current-location-marker' である（mobile/src/screens/map/components/map-layers/CurrentLocationMarker.tsx）。
    expect(screen.getByTestId('mock-maplibre-marker-current-location-marker')).toBeTruthy();
  });

  it('AC-12: 現在地が未取得のときcurrent locationマーカーも描画しない', async () => {
    await render(<TrackingMapPreview currentLocation={null} coordinates={[]} tripColor="#E8833A" />);

    expect(screen.queryByTestId('mock-maplibre-marker-current-location-marker')).toBeNull();
  });
});
