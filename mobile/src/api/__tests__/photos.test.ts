import { renderHook, waitFor } from '@testing-library/react-native';

import { usePhotos, bboxToParam, type Bbox } from '../photos';
import { createQueryClientWrapper } from '../../test-utils/queryClientWrapper';

const TRIP_ID = '11111111-1111-4111-8111-111111111111';
const PHOTO_ID = '33333333-3333-4333-8333-333333333333';
const BBOX: Bbox = { minLng: 139.0, minLat: 35.0, maxLng: 140.0, maxLat: 36.0 };

describe('usePhotos', () => {
  const originalFetch = global.fetch;

  afterEach(() => {
    global.fetch = originalFetch;
    jest.restoreAllMocks();
  });

  it('正常系: thumbnailUrlがnullの写真も欠落なくdataに含まれる（AC-13）', async () => {
    const photoWithThumbnail = {
      id: PHOTO_ID,
      tripId: TRIP_ID,
      lng: 139.5,
      lat: 35.5,
      locationSource: 'exif',
      takenAt: '2026-01-01T00:00:00Z',
      objectKey: 'photos/1.jpg',
      thumbnailUrl: 'https://example.com/thumb.jpg',
      width: 100,
      height: 100,
    };
    const photoWithoutThumbnail = {
      ...photoWithThumbnail,
      id: '44444444-4444-4444-8444-444444444444',
      thumbnailUrl: null,
    };
    global.fetch = jest.fn().mockResolvedValue({
      ok: true,
      status: 200,
      json: async () => [photoWithThumbnail, photoWithoutThumbnail],
    }) as unknown as typeof fetch;

    const { result } = await renderHook(() => usePhotos(BBOX), { wrapper: createQueryClientWrapper() });

    await waitFor(() => expect(result.current.isSuccess).toBe(true));
    expect(result.current.data).toHaveLength(2);
    expect(result.current.data?.[1].thumbnailUrl).toBeNull();
  });

  it('bboxが変わるとクエリキーが変わり再取得される', async () => {
    const fetchMock = jest.fn().mockResolvedValue({
      ok: true,
      status: 200,
      json: async () => [],
    });
    global.fetch = fetchMock as unknown as typeof fetch;

    const client = createQueryClientWrapper();
    const { result, rerender } = await renderHook(({ bbox }: { bbox: Bbox }) => usePhotos(bbox), {
      wrapper: client,
      initialProps: { bbox: BBOX },
    });

    await waitFor(() => expect(result.current.isSuccess).toBe(true));
    expect(fetchMock).toHaveBeenCalledTimes(1);

    const nextBbox: Bbox = { minLng: 141.0, minLat: 37.0, maxLng: 142.0, maxLat: 38.0 };
    await rerender({ bbox: nextBbox });

    await waitFor(() => expect(fetchMock).toHaveBeenCalledTimes(2));
    expect(decodeURIComponent(fetchMock.mock.calls[1][0] as string)).toContain(bboxToParam(nextBbox));
  });

  it('bboxが未確定（undefined）の間はクエリを実行しない（AC-1, AC-36）', async () => {
    const fetchMock = jest.fn();
    global.fetch = fetchMock as unknown as typeof fetch;

    const { result } = await renderHook(() => usePhotos(undefined), {
      wrapper: createQueryClientWrapper(),
    });

    expect(result.current.fetchStatus).toBe('idle');
    expect(fetchMock).not.toHaveBeenCalled();
  });
});
