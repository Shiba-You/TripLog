import { renderHook } from '@testing-library/react-native';

import {
  useInitialViewport,
  computeInitialViewport,
  viewportToBbox,
  JAPAN_BOUNDS,
  DEFAULT_POINT_ZOOM_LEVEL,
  type TrackPointsLike,
} from '../useInitialViewport';

function feature(coords: Array<[number, number]> | null): TrackPointsLike {
  if (coords === null) return { geometry: null };
  return { geometry: { type: 'LineString', coordinates: coords } };
}

describe('computeInitialViewport (AC-36)', () => {
  it('優先順位1: 現在地ありのとき現在地中心になる', () => {
    const viewport = computeInitialViewport({ lng: 139.767, lat: 35.681 }, [feature([[140, 36]])]);
    expect(viewport).toEqual({
      kind: 'currentLocation',
      center: { lng: 139.767, lat: 35.681 },
      zoomLevel: DEFAULT_POINT_ZOOM_LEVEL,
    });
  });

  it('優先順位2/3統合: 現在地なし・track_pointsが複数点のときbounding boxになる', () => {
    const viewport = computeInitialViewport(null, [
      feature([
        [139.0, 35.0],
        [140.0, 36.0],
      ]),
      feature([[141.0, 34.0]]),
    ]);
    expect(viewport).toEqual({ kind: 'trackBounds', bounds: [139.0, 34.0, 141.0, 36.0] });
  });

  it('優先順位2/3統合: 現在地なし・track_pointsが1点のときその点がbounding boxになる（優先順位2相当）', () => {
    const viewport = computeInitialViewport(null, [feature([[139.5, 35.5]])]);
    expect(viewport).toEqual({ kind: 'trackBounds', bounds: [139.5, 35.5, 139.5, 35.5] });
  });

  it('優先順位4: track_pointsが1件も無いとき日本全体の固定範囲になる', () => {
    const viewport = computeInitialViewport(null, []);
    expect(viewport).toEqual({ kind: 'japan', bounds: JAPAN_BOUNDS });
  });

  it('優先順位4: 全trackのgeometryがnull（track_points0件）のときも日本全体になる（AC-7と両立）', () => {
    const viewport = computeInitialViewport(null, [feature(null), feature(null)]);
    expect(viewport).toEqual({ kind: 'japan', bounds: JAPAN_BOUNDS });
  });
});

describe('viewportToBbox (AC-1, AC-36末尾: 写真取得bboxの導出)', () => {
  it('currentLocationのとき中心点を囲むbboxを返す', () => {
    const bbox = viewportToBbox({ kind: 'currentLocation', center: { lng: 139.0, lat: 35.0 }, zoomLevel: 14 });
    expect(bbox[0]).toBeLessThan(139.0);
    expect(bbox[2]).toBeGreaterThan(139.0);
    expect(bbox[1]).toBeLessThan(35.0);
    expect(bbox[3]).toBeGreaterThan(35.0);
  });

  it('trackBounds/japanのときboundsをそのまま返す', () => {
    expect(viewportToBbox({ kind: 'japan', bounds: JAPAN_BOUNDS })).toEqual(JAPAN_BOUNDS);
    const bounds: [number, number, number, number] = [139, 35, 140, 36];
    expect(viewportToBbox({ kind: 'trackBounds', bounds })).toEqual(bounds);
  });
});

describe('useInitialViewport (フック統合)', () => {
  it('現在地とtrack_pointsを渡すとcomputeInitialViewportと同じ結果を返す', async () => {
    const { result } = await renderHook(() =>
      useInitialViewport({ lng: 139.7, lat: 35.6 }, [feature([[140, 36]])])
    );
    expect(result.current.kind).toBe('currentLocation');
  });
});
