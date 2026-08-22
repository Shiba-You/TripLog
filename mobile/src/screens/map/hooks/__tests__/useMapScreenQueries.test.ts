import { renderHook, waitFor } from '@testing-library/react-native';

import { useMapScreenQueries } from '../useMapScreenQueries';
import { createQueryClientWrapper } from '../../../../test-utils/queryClientWrapper';

const TRIP_ID = '11111111-1111-4111-8111-111111111111';
const TRACK_ID = '22222222-2222-4222-8222-222222222222';

function jsonResponse(status: number, body: unknown) {
  return { ok: status >= 200 && status < 300, status, json: async () => body };
}

const EMPTY_COVERAGE = { stats: { visitedCount: 0, totalCount: 0, coverageRate: 0 }, geojson: { type: 'FeatureCollection', features: [] } };

describe('useMapScreenQueries', () => {
  const originalFetch = global.fetch;

  afterEach(() => {
    global.fetch = originalFetch;
    jest.restoreAllMocks();
  });

  it("AC-26: 全クエリ成功＋trips0件で状態が'empty'になる", async () => {
    const fetchMock = jest.fn((url: string) => {
      if (url.includes('/api/trips')) return Promise.resolve(jsonResponse(200, []));
      if (url.includes('/api/coverage')) return Promise.resolve(jsonResponse(200, EMPTY_COVERAGE));
      if (url.includes('/api/photos')) return Promise.resolve(jsonResponse(200, []));
      return Promise.reject(new Error(`unexpected url: ${url}`));
    });
    global.fetch = fetchMock as unknown as typeof fetch;

    const { result } = await renderHook(() => useMapScreenQueries(null), {
      wrapper: createQueryClientWrapper(),
    });

    await waitFor(() => expect(result.current.state).toBe('empty'));
    expect(result.current.trips).toEqual([]);
  });

  it("AC-1/AC-26: 全クエリ成功＋trips1件以上で状態が'normal'になり経路/トロフィー/写真が反映される", async () => {
    const trip = {
      id: TRIP_ID,
      name: '北海道旅行',
      description: null,
      color: '#E8833A',
      startedOn: '2026-01-01',
      endedOn: null,
      createdAt: '2026-01-01T00:00:00Z',
    };
    const track = {
      id: TRACK_ID,
      tripId: TRIP_ID,
      source: 'live',
      status: 'finished',
      startedAt: '2026-01-01T00:00:00Z',
      endedAt: '2026-01-01T01:00:00Z',
      lastPointAt: '2026-01-01T01:00:00Z',
      pointCount: 2,
    };
    const pointsFeature = {
      type: 'Feature',
      geometry: { type: 'LineString', coordinates: [[139.0, 35.0], [139.1, 35.1]] },
      properties: null,
    };
    const coverage = { stats: { visitedCount: 1, totalCount: 5, coverageRate: 20 }, geojson: { type: 'FeatureCollection', features: [] } };

    const fetchMock = jest.fn((url: string) => {
      if (url.includes(`/api/trips/${TRIP_ID}/tracks`)) return Promise.resolve(jsonResponse(200, [track]));
      if (url.includes('/api/trips')) return Promise.resolve(jsonResponse(200, [trip]));
      if (url.includes('/api/coverage')) return Promise.resolve(jsonResponse(200, coverage));
      if (url.includes(`/api/tracks/${TRACK_ID}/points`)) return Promise.resolve(jsonResponse(200, pointsFeature));
      if (url.includes('/api/photos')) return Promise.resolve(jsonResponse(200, []));
      return Promise.reject(new Error(`unexpected url: ${url}`));
    });
    global.fetch = fetchMock as unknown as typeof fetch;

    const { result } = await renderHook(() => useMapScreenQueries(null), {
      wrapper: createQueryClientWrapper(),
    });

    await waitFor(() => expect(result.current.state).toBe('normal'));
    expect(result.current.trips).toEqual([trip]);
    expect(result.current.coverage?.stats.totalCount).toBe(5);
    expect(result.current.routes).toHaveLength(1);
    expect(result.current.routes[0]).toMatchObject({ tripId: TRIP_ID, color: '#E8833A' });
    expect(result.current.photos).toEqual([]);
  });

  it("AC-27: いずれか1クエリ（coverage）が5xxで失敗すると状態が'error'になる", async () => {
    const fetchMock = jest.fn((url: string) => {
      if (url.includes('/api/trips')) return Promise.resolve(jsonResponse(200, []));
      if (url.includes('/api/coverage')) return Promise.resolve(jsonResponse(500, {}));
      if (url.includes('/api/photos')) return Promise.resolve(jsonResponse(200, []));
      return Promise.reject(new Error(`unexpected url: ${url}`));
    });
    global.fetch = fetchMock as unknown as typeof fetch;

    const { result } = await renderHook(() => useMapScreenQueries(null), {
      wrapper: createQueryClientWrapper(),
    });

    await waitFor(() => expect(result.current.state).toBe('error'));
  });

  it('AC-28: retry()呼び出しで失敗したクエリ（coverage）のみ再試行され、成功後は状態が正常化する', async () => {
    let coverageCallCount = 0;
    const fetchMock = jest.fn((url: string) => {
      if (url.includes('/api/trips')) return Promise.resolve(jsonResponse(200, []));
      if (url.includes('/api/coverage')) {
        coverageCallCount += 1;
        if (coverageCallCount === 1) return Promise.resolve(jsonResponse(500, {}));
        return Promise.resolve(jsonResponse(200, EMPTY_COVERAGE));
      }
      if (url.includes('/api/photos')) return Promise.resolve(jsonResponse(200, []));
      return Promise.reject(new Error(`unexpected url: ${url}`));
    });
    global.fetch = fetchMock as unknown as typeof fetch;

    const { result } = await renderHook(() => useMapScreenQueries(null), {
      wrapper: createQueryClientWrapper(),
    });

    await waitFor(() => expect(result.current.state).toBe('error'));
    const tripsCallCountBeforeRetry = fetchMock.mock.calls.filter((c) => (c[0] as string).includes('/api/trips') && !(c[0] as string).includes('tracks')).length;

    result.current.retry();

    await waitFor(() => expect(result.current.state).toBe('empty'));
    expect(coverageCallCount).toBe(2);
    // tripsは失敗していないため再試行時に再度呼ばれない。
    const tripsCallCountAfterRetry = fetchMock.mock.calls.filter((c) => (c[0] as string).includes('/api/trips') && !(c[0] as string).includes('tracks')).length;
    expect(tripsCallCountAfterRetry).toBe(tripsCallCountBeforeRetry);
  });
});
