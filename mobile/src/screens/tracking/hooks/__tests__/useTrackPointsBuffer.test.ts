import { renderHook, waitFor } from '@testing-library/react-native';

import { useTrackPointsBuffer } from '../useTrackPointsBuffer';
// __resetMockDatabases はモック専用ヘルパーのため、実ライブラリの型に存在しない。
// T-5のexpo-sqliteモックへ相対importで直接アクセスする。
import { __resetMockDatabases } from '../../../../../__mocks__/expo-sqlite';

const TRACK_ID = '22222222-2222-4222-8222-222222222222';

describe('useTrackPointsBuffer', () => {
  afterEach(() => {
    __resetMockDatabases();
  });

  it('AC-23: 点を追加すると件数取得が増分を反映する', async () => {
    const { result } = await renderHook(() => useTrackPointsBuffer(TRACK_ID));

    await waitFor(async () => expect(await result.current.count()).toBe(0));

    await result.current.addPoint({
      lng: 139.0,
      lat: 35.0,
      elevationM: null,
      speedMps: null,
      accuracyM: 5,
      recordedAt: '2026-01-01T00:00:00Z',
    });
    await result.current.addPoint({
      lng: 139.1,
      lat: 35.1,
      elevationM: 10,
      speedMps: 1.5,
      accuracyM: 4,
      recordedAt: '2026-01-01T00:00:10Z',
    });

    expect(await result.current.count()).toBe(2);
  });

  it('AC-24: 全件取得したのちの削除で件数が0に戻る', async () => {
    const { result } = await renderHook(() => useTrackPointsBuffer(TRACK_ID));

    await result.current.addPoint({
      lng: 139.0,
      lat: 35.0,
      elevationM: null,
      speedMps: null,
      accuracyM: null,
      recordedAt: '2026-01-01T00:00:00Z',
    });

    const all = await result.current.getAll();
    expect(all).toHaveLength(1);
    expect(all[0].trackId).toBe(TRACK_ID);
    expect(all[0].lng).toBe(139.0);

    await result.current.deleteByIds(all.map((p) => p.id));

    expect(await result.current.count()).toBe(0);
  });

  it('初期化前（テーブル未作成）でもクラッシュせず0件として扱える', async () => {
    const { result } = await renderHook(() => useTrackPointsBuffer(TRACK_ID));

    await expect(result.current.count()).resolves.toBe(0);
    await expect(result.current.getAll()).resolves.toEqual([]);
  });

  it('異なるtrackId間でバッファが混在しない', async () => {
    const otherTrackId = '33333333-3333-4333-8333-333333333333';
    const { result: bufferA } = await renderHook(() => useTrackPointsBuffer(TRACK_ID));
    const { result: bufferB } = await renderHook(() => useTrackPointsBuffer(otherTrackId));

    await bufferA.current.addPoint({
      lng: 139.0,
      lat: 35.0,
      elevationM: null,
      speedMps: null,
      accuracyM: null,
      recordedAt: '2026-01-01T00:00:00Z',
    });

    expect(await bufferA.current.count()).toBe(1);
    expect(await bufferB.current.count()).toBe(0);
  });
});
