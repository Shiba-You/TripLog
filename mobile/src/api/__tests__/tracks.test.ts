import { renderHook, waitFor, act } from '@testing-library/react-native';

import {
  useTripTracks,
  useTrackPoints,
  useStartTrack,
  useTrack,
  useUpdateTrackStatus,
  useIngestTrackPoints,
} from '../tracks';
import { createQueryClientWrapper } from '../../test-utils/queryClientWrapper';

const TRIP_ID = '11111111-1111-4111-8111-111111111111';
const TRACK_ID = '22222222-2222-4222-8222-222222222222';

describe('useTripTracks', () => {
  const originalFetch = global.fetch;

  afterEach(() => {
    global.fetch = originalFetch;
    jest.restoreAllMocks();
  });

  it('正常系: 複数トラックを取得する（AC-6）', async () => {
    const track = {
      id: TRACK_ID,
      tripId: TRIP_ID,
      source: 'live',
      status: 'finished',
      startedAt: '2026-01-01T00:00:00Z',
      endedAt: '2026-01-01T01:00:00Z',
      lastPointAt: '2026-01-01T01:00:00Z',
      pointCount: 120,
    };
    global.fetch = jest.fn().mockResolvedValue({
      ok: true,
      status: 200,
      json: async () => [track],
    }) as unknown as typeof fetch;

    const { result } = await renderHook(() => useTripTracks(TRIP_ID), {
      wrapper: createQueryClientWrapper(),
    });

    await waitFor(() => expect(result.current.isSuccess).toBe(true));
    expect(result.current.data).toEqual([track]);
  });

  it('track が0件の旅行に対しては空配列を返す（AC-7の前提）', async () => {
    global.fetch = jest.fn().mockResolvedValue({
      ok: true,
      status: 200,
      json: async () => [],
    }) as unknown as typeof fetch;

    const { result } = await renderHook(() => useTripTracks(TRIP_ID), {
      wrapper: createQueryClientWrapper(),
    });

    await waitFor(() => expect(result.current.isSuccess).toBe(true));
    expect(result.current.data).toEqual([]);
  });

  it('tripIdが未指定のときクエリを実行しない', async () => {
    const fetchMock = jest.fn();
    global.fetch = fetchMock as unknown as typeof fetch;

    const { result } = await renderHook(() => useTripTracks(undefined), {
      wrapper: createQueryClientWrapper(),
    });

    expect(result.current.fetchStatus).toBe('idle');
    expect(fetchMock).not.toHaveBeenCalled();
  });
});

describe('useTrackPoints', () => {
  const originalFetch = global.fetch;

  afterEach(() => {
    global.fetch = originalFetch;
    jest.restoreAllMocks();
  });

  it('正常系: track_pointsが存在するトラックでLineStringを取得する（AC-6）', async () => {
    const feature = {
      type: 'Feature',
      geometry: { type: 'LineString', coordinates: [[139.7, 35.6], [139.8, 35.7]] },
      properties: null,
    };
    global.fetch = jest.fn().mockResolvedValue({
      ok: true,
      status: 200,
      json: async () => feature,
    }) as unknown as typeof fetch;

    const { result } = await renderHook(() => useTrackPoints(TRACK_ID, 10), {
      wrapper: createQueryClientWrapper(),
    });

    await waitFor(() => expect(result.current.isSuccess).toBe(true));
    expect(result.current.data?.geometry?.coordinates).toHaveLength(2);
  });

  it('track_pointsが0件のとき geometry が null でもエラーにならない（AC-7）', async () => {
    const feature = { type: 'Feature', geometry: null, properties: null };
    global.fetch = jest.fn().mockResolvedValue({
      ok: true,
      status: 200,
      json: async () => feature,
    }) as unknown as typeof fetch;

    const { result } = await renderHook(() => useTrackPoints(TRACK_ID), {
      wrapper: createQueryClientWrapper(),
    });

    await waitFor(() => expect(result.current.isSuccess).toBe(true));
    expect(result.current.data?.geometry).toBeNull();
  });

  it('simplifyパラメータをクエリに付与する', async () => {
    const fetchMock = jest.fn().mockResolvedValue({
      ok: true,
      status: 200,
      json: async () => ({ type: 'Feature', geometry: null, properties: null }),
    });
    global.fetch = fetchMock as unknown as typeof fetch;

    await renderHook(() => useTrackPoints(TRACK_ID, 25), { wrapper: createQueryClientWrapper() });

    await waitFor(() => expect(fetchMock).toHaveBeenCalled());
    expect(fetchMock.mock.calls[0][0]).toContain('simplify=25');
  });
});

describe('useStartTrack', () => {
  const originalFetch = global.fetch;

  afterEach(() => {
    global.fetch = originalFetch;
    jest.restoreAllMocks();
  });

  it('正常系: POST /api/trips/{tripId}/tracks を呼びsource=live/status=recordingのトラックを返す（AC-33）', async () => {
    const createdTrack = {
      id: TRACK_ID,
      tripId: TRIP_ID,
      source: 'live',
      status: 'recording',
      startedAt: '2026-01-01T00:00:00Z',
      endedAt: null,
      lastPointAt: null,
      pointCount: 0,
    };
    const fetchMock = jest.fn().mockResolvedValue({
      ok: true,
      status: 201,
      json: async () => createdTrack,
    });
    global.fetch = fetchMock as unknown as typeof fetch;

    const { result } = await renderHook(() => useStartTrack(), { wrapper: createQueryClientWrapper() });

    await act(async () => {
      result.current.mutate({ tripId: TRIP_ID });
    });

    await waitFor(() => expect(result.current.isSuccess).toBe(true));
    expect(result.current.data).toEqual(createdTrack);
    expect(fetchMock.mock.calls[0][0]).toContain(`/api/trips/${TRIP_ID}/tracks`);
    expect(fetchMock.mock.calls[0][1]?.method).toBe('POST');
  });

  it('異常系: 失敗時にisErrorになる', async () => {
    global.fetch = jest.fn().mockResolvedValue({
      ok: false,
      status: 500,
      json: async () => ({}),
    }) as unknown as typeof fetch;

    const { result } = await renderHook(() => useStartTrack(), { wrapper: createQueryClientWrapper() });

    await act(async () => {
      result.current.mutate({ tripId: TRIP_ID });
    });

    await waitFor(() => expect(result.current.isError).toBe(true));
  });
});

describe('useTrack', () => {
  const originalFetch = global.fetch;

  afterEach(() => {
    global.fetch = originalFetch;
    jest.restoreAllMocks();
  });

  it('正常系: GET /api/tracks/{trackId} を呼びトラックのメタ情報を返す（AC-1, AC-2, AC-4, AC-5, AC-6）', async () => {
    const track = {
      id: TRACK_ID,
      tripId: TRIP_ID,
      source: 'live',
      status: 'recording',
      startedAt: '2026-01-01T00:00:00Z',
      endedAt: null,
      lastPointAt: null,
      pointCount: 0,
    };
    const fetchMock = jest.fn().mockResolvedValue({
      ok: true,
      status: 200,
      json: async () => track,
    });
    global.fetch = fetchMock as unknown as typeof fetch;

    const { result } = await renderHook(() => useTrack(TRACK_ID), { wrapper: createQueryClientWrapper() });

    await waitFor(() => expect(result.current.isSuccess).toBe(true));
    expect(result.current.data).toEqual(track);
    expect(fetchMock.mock.calls[0][0]).toContain(`/api/tracks/${TRACK_ID}`);
  });

  it('trackIdが未指定のときクエリを実行しない', async () => {
    const fetchMock = jest.fn();
    global.fetch = fetchMock as unknown as typeof fetch;

    const { result } = await renderHook(() => useTrack(undefined), { wrapper: createQueryClientWrapper() });

    expect(result.current.fetchStatus).toBe('idle');
    expect(fetchMock).not.toHaveBeenCalled();
  });

  it('異常系: 404等の失敗時にisErrorになる', async () => {
    global.fetch = jest.fn().mockResolvedValue({
      ok: false,
      status: 404,
      json: async () => ({}),
    }) as unknown as typeof fetch;

    const { result } = await renderHook(() => useTrack(TRACK_ID), { wrapper: createQueryClientWrapper() });

    await waitFor(() => expect(result.current.isError).toBe(true));
  });
});

describe('useUpdateTrackStatus', () => {
  const originalFetch = global.fetch;

  afterEach(() => {
    global.fetch = originalFetch;
    jest.restoreAllMocks();
  });

  it('正常系: PATCH /api/tracks/{trackId} に {status} ボディを送信する（AC-14, AC-16, AC-18）', async () => {
    const updated = {
      id: TRACK_ID,
      tripId: TRIP_ID,
      source: 'live',
      status: 'paused',
      startedAt: '2026-01-01T00:00:00Z',
      endedAt: null,
      lastPointAt: null,
      pointCount: 3,
    };
    const fetchMock = jest.fn().mockResolvedValue({
      ok: true,
      status: 200,
      json: async () => updated,
    });
    global.fetch = fetchMock as unknown as typeof fetch;

    const { result } = await renderHook(() => useUpdateTrackStatus(), { wrapper: createQueryClientWrapper() });

    await act(async () => {
      result.current.mutate({ trackId: TRACK_ID, status: 'paused' });
    });

    await waitFor(() => expect(result.current.isSuccess).toBe(true));
    expect(result.current.data).toEqual(updated);
    expect(fetchMock.mock.calls[0][0]).toContain(`/api/tracks/${TRACK_ID}`);
    expect(fetchMock.mock.calls[0][1]?.method).toBe('PATCH');
    expect(JSON.parse(fetchMock.mock.calls[0][1]?.body as string)).toEqual({ status: 'paused' });
  });

  it('異常系: 失敗時にisErrorになる', async () => {
    global.fetch = jest.fn().mockResolvedValue({
      ok: false,
      status: 404,
      json: async () => ({}),
    }) as unknown as typeof fetch;

    const { result } = await renderHook(() => useUpdateTrackStatus(), { wrapper: createQueryClientWrapper() });

    await act(async () => {
      result.current.mutate({ trackId: TRACK_ID, status: 'finished' });
    });

    await waitFor(() => expect(result.current.isError).toBe(true));
  });
});

describe('useIngestTrackPoints', () => {
  const originalFetch = global.fetch;

  afterEach(() => {
    global.fetch = originalFetch;
    jest.restoreAllMocks();
  });

  it('正常系: POST /api/tracks/{trackId}/points にバッチ点配列を送信しaccepted/newlyVisitedRegionIdsを受け取る（AC-13, AC-24）', async () => {
    const result202 = { accepted: 2, newlyVisitedRegionIds: [] as string[] };
    const fetchMock = jest.fn().mockResolvedValue({
      ok: true,
      status: 202,
      json: async () => result202,
    });
    global.fetch = fetchMock as unknown as typeof fetch;

    const points = [
      { lng: 139.0, lat: 35.0, recordedAt: '2026-01-01T00:00:00Z' },
      { lng: 139.1, lat: 35.1, recordedAt: '2026-01-01T00:01:00Z' },
    ];

    const { result } = await renderHook(() => useIngestTrackPoints(), { wrapper: createQueryClientWrapper() });

    await act(async () => {
      result.current.mutate({ trackId: TRACK_ID, points });
    });

    await waitFor(() => expect(result.current.isSuccess).toBe(true));
    expect(result.current.data).toEqual(result202);
    expect(fetchMock.mock.calls[0][0]).toContain(`/api/tracks/${TRACK_ID}/points`);
    expect(fetchMock.mock.calls[0][1]?.method).toBe('POST');
    expect(JSON.parse(fetchMock.mock.calls[0][1]?.body as string)).toEqual({ points });
  });

  it('異常系: 不正レスポンス時（スキーマ不一致）にisErrorになる', async () => {
    global.fetch = jest.fn().mockResolvedValue({
      ok: true,
      status: 202,
      json: async () => ({ accepted: 'not-a-number' }),
    }) as unknown as typeof fetch;

    const { result } = await renderHook(() => useIngestTrackPoints(), { wrapper: createQueryClientWrapper() });

    await act(async () => {
      result.current.mutate({
        trackId: TRACK_ID,
        points: [{ lng: 139.0, lat: 35.0, recordedAt: '2026-01-01T00:00:00Z' }],
      });
    });

    await waitFor(() => expect(result.current.isError).toBe(true));
  });

  it('異常系: 通信失敗時にisErrorになる', async () => {
    global.fetch = jest.fn().mockResolvedValue({
      ok: false,
      status: 500,
      json: async () => ({}),
    }) as unknown as typeof fetch;

    const { result } = await renderHook(() => useIngestTrackPoints(), { wrapper: createQueryClientWrapper() });

    await act(async () => {
      result.current.mutate({
        trackId: TRACK_ID,
        points: [{ lng: 139.0, lat: 35.0, recordedAt: '2026-01-01T00:00:00Z' }],
      });
    });

    await waitFor(() => expect(result.current.isError).toBe(true));
  });
});
