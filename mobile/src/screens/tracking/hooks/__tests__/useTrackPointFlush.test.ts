import { renderHook, waitFor, act } from '@testing-library/react-native';

import { useTrackPointFlush } from '../useTrackPointFlush';
import type { BufferedTrackPoint, UseTrackPointsBufferResult } from '../useTrackPointsBuffer';
import { createQueryClientWrapper, createTestQueryClient } from '../../../../test-utils/queryClientWrapper';

const TRACK_ID = '22222222-2222-4222-8222-222222222222';

function makeBufferedPoint(id: number): BufferedTrackPoint {
  return {
    id,
    trackId: TRACK_ID,
    lng: 139.0 + id * 0.01,
    lat: 35.0 + id * 0.01,
    elevationM: null,
    speedMps: null,
    accuracyM: null,
    recordedAt: '2026-01-01T00:00:00Z',
  };
}

function makeMockBuffer(initialPoints: BufferedTrackPoint[]): UseTrackPointsBufferResult & { points: BufferedTrackPoint[] } {
  const state = { points: [...initialPoints] };
  return {
    points: state.points,
    addPoint: jest.fn(),
    getAll: jest.fn(async () => state.points),
    count: jest.fn(async () => state.points.length),
    deleteByIds: jest.fn(async (ids: number[]) => {
      state.points = state.points.filter((p) => !ids.includes(p.id));
    }),
  };
}

describe('useTrackPointFlush', () => {
  const originalFetch = global.fetch;

  afterEach(() => {
    global.fetch = originalFetch;
    jest.restoreAllMocks();
  });

  it('AC-13, AC-24: 送信成功時にバッファが空になりキャッシュがinvalidateされる', async () => {
    const buffer = makeMockBuffer([makeBufferedPoint(1), makeBufferedPoint(2)]);
    const fetchMock = jest.fn().mockResolvedValue({
      ok: true,
      status: 202,
      json: async () => ({ accepted: 2, newlyVisitedRegionIds: [] }),
    });
    global.fetch = fetchMock as unknown as typeof fetch;

    const client = createTestQueryClient();
    const invalidateSpy = jest.spyOn(client, 'invalidateQueries');

    const { result } = await renderHook(
      () => useTrackPointFlush({ trackId: TRACK_ID, enabled: true, isConnected: true, buffer }),
      { wrapper: createQueryClientWrapper(client) }
    );

    await act(async () => {
      await result.current.flush();
    });

    expect(buffer.deleteByIds).toHaveBeenCalledWith([1, 2]);
    expect(invalidateSpy).toHaveBeenCalled();
  });

  it('送信失敗時はバッファを保持し削除しない（次回サイクルで再試行対象）', async () => {
    const buffer = makeMockBuffer([makeBufferedPoint(1)]);
    global.fetch = jest.fn().mockResolvedValue({
      ok: false,
      status: 500,
      json: async () => ({}),
    }) as unknown as typeof fetch;

    const { result } = await renderHook(
      () => useTrackPointFlush({ trackId: TRACK_ID, enabled: true, isConnected: true, buffer }),
      { wrapper: createQueryClientWrapper() }
    );

    await act(async () => {
      await result.current.flush();
    });

    expect(buffer.deleteByIds).not.toHaveBeenCalled();
  });

  it('バッファが0件のときは送信自体を行わない', async () => {
    const buffer = makeMockBuffer([]);
    const fetchMock = jest.fn();
    global.fetch = fetchMock as unknown as typeof fetch;

    const { result } = await renderHook(
      () => useTrackPointFlush({ trackId: TRACK_ID, enabled: true, isConnected: true, buffer }),
      { wrapper: createQueryClientWrapper() }
    );

    await act(async () => {
      await result.current.flush();
    });

    expect(fetchMock).not.toHaveBeenCalled();
  });

  it('AC-15: enabled=false（一時停止相当）のときflush()を呼んでも送信しない', async () => {
    const buffer = makeMockBuffer([makeBufferedPoint(1)]);
    const fetchMock = jest.fn();
    global.fetch = fetchMock as unknown as typeof fetch;

    const { result } = await renderHook(
      () => useTrackPointFlush({ trackId: TRACK_ID, enabled: false, isConnected: true, buffer }),
      { wrapper: createQueryClientWrapper() }
    );

    await act(async () => {
      await result.current.flush();
    });

    expect(fetchMock).not.toHaveBeenCalled();
  });

  it('AC-24: ネットワーク復帰（false→true）イベントで自動的にフラッシュが試行される', async () => {
    const buffer = makeMockBuffer([makeBufferedPoint(1)]);
    const fetchMock = jest.fn().mockResolvedValue({
      ok: true,
      status: 202,
      json: async () => ({ accepted: 1, newlyVisitedRegionIds: [] }),
    });
    global.fetch = fetchMock as unknown as typeof fetch;

    const { rerender } = await renderHook(
      ({ isConnected }: { isConnected: boolean | null }) =>
        useTrackPointFlush({ trackId: TRACK_ID, enabled: true, isConnected, buffer }),
      { wrapper: createQueryClientWrapper(), initialProps: { isConnected: false } }
    );

    await act(async () => {
      await rerender({ isConnected: true });
    });

    await waitFor(() => expect(buffer.deleteByIds).toHaveBeenCalledWith([1]));
  });
});
