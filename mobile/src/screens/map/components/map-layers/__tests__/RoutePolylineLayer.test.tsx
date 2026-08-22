import { render } from '@testing-library/react-native';

import { RoutePolylineLayer, buildRouteFeatureCollection, type RouteEntry } from '../RoutePolylineLayer';

describe('buildRouteFeatureCollection', () => {
  it('AC-6: track_pointsがあるトラックのみFeatureに変換しcolorをpropertiesに含める', () => {
    const routes: RouteEntry[] = [
      {
        tripId: 'trip-1',
        color: '#E8833A',
        feature: { geometry: { type: 'LineString', coordinates: [[139, 35], [140, 36]] } },
      },
    ];

    const collection = buildRouteFeatureCollection(routes);
    expect(collection.features).toHaveLength(1);
    expect(collection.features[0].properties).toEqual({ tripId: 'trip-1', color: '#E8833A' });
    expect(collection.features[0].geometry.coordinates).toEqual([[139, 35], [140, 36]]);
  });

  it('AC-7: track_pointsが0件（geometryがnull）のトラックはスキップする', () => {
    const routes: RouteEntry[] = [
      { tripId: 'trip-1', color: '#E8833A', feature: { geometry: null } },
      { tripId: 'trip-2', color: '#3AA0E8', feature: undefined },
      {
        tripId: 'trip-3',
        color: '#22C55E',
        feature: { geometry: { type: 'LineString', coordinates: [] } },
      },
    ];

    const collection = buildRouteFeatureCollection(routes);
    expect(collection.features).toHaveLength(0);
  });

  it('複数トラックが混在する場合、有効なもののみ含める', () => {
    const routes: RouteEntry[] = [
      { tripId: 'trip-1', color: '#E8833A', feature: { geometry: { type: 'LineString', coordinates: [[139, 35]] } } },
      { tripId: 'trip-2', color: '#3AA0E8', feature: { geometry: null } },
    ];

    const collection = buildRouteFeatureCollection(routes);
    expect(collection.features).toHaveLength(1);
    expect(collection.features[0].properties?.tripId).toBe('trip-1');
  });
});

describe('RoutePolylineLayer', () => {
  const routes: RouteEntry[] = [
    { tripId: 'trip-1', color: '#E8833A', feature: { geometry: { type: 'LineString', coordinates: [[139, 35], [140, 36]] } } },
  ];

  it('visible=falseのとき何も描画しない', async () => {
    const result = await render(<RoutePolylineLayer routes={routes} visible={false} />);
    expect(result.toJSON()).toBeNull();
  });

  it('描画対象の経路が0件のとき何も描画しない', async () => {
    const result = await render(
      <RoutePolylineLayer routes={[{ tripId: 'trip-1', color: '#000', feature: { geometry: null } }]} visible />
    );
    expect(result.toJSON()).toBeNull();
  });

  it('visible=trueかつ経路があるときGeoJSONSource/Layerを描画する', async () => {
    const result = await render(<RoutePolylineLayer routes={routes} visible />);
    expect(result.toJSON()).not.toBeNull();
  });
});
