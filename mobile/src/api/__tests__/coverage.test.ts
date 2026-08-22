import { renderHook, waitFor } from '@testing-library/react-native';

import { useCoverage } from '../coverage';
import { createQueryClientWrapper } from '../../test-utils/queryClientWrapper';

describe('useCoverage', () => {
  const originalFetch = global.fetch;

  afterEach(() => {
    global.fetch = originalFetch;
    jest.restoreAllMocks();
  });

  it('正常系: geojsonが非空のとき statsとgeojsonを返す（AC-8, AC-21）', async () => {
    const response = {
      stats: { visitedCount: 3, totalCount: 10, coverageRate: 30 },
      geojson: {
        type: 'FeatureCollection',
        features: [{ type: 'Feature', geometry: { type: 'Polygon', coordinates: [] }, properties: {} }],
      },
    };
    global.fetch = jest.fn().mockResolvedValue({
      ok: true,
      status: 200,
      json: async () => response,
    }) as unknown as typeof fetch;

    const { result } = await renderHook(() => useCoverage(), { wrapper: createQueryClientWrapper() });

    await waitFor(() => expect(result.current.isSuccess).toBe(true));
    expect(result.current.data?.stats.totalCount).toBe(10);
    expect(result.current.data?.geojson.features).toHaveLength(1);
  });

  it('正常系: regions未投入（totalCount=0, geojson空）でもエラーにならない（AC-9, AC-22）', async () => {
    const response = {
      stats: { visitedCount: 0, totalCount: 0, coverageRate: 0 },
      geojson: { type: 'FeatureCollection', features: [] },
    };
    global.fetch = jest.fn().mockResolvedValue({
      ok: true,
      status: 200,
      json: async () => response,
    }) as unknown as typeof fetch;

    const { result } = await renderHook(() => useCoverage(), { wrapper: createQueryClientWrapper() });

    await waitFor(() => expect(result.current.isSuccess).toBe(true));
    expect(result.current.data?.stats.totalCount).toBe(0);
    expect(result.current.data?.geojson.features).toHaveLength(0);
  });

  it('regionType=cityクエリを付与して呼び出す', async () => {
    const fetchMock = jest.fn().mockResolvedValue({
      ok: true,
      status: 200,
      json: async () => ({
        stats: { visitedCount: 0, totalCount: 0, coverageRate: 0 },
        geojson: { type: 'FeatureCollection', features: [] },
      }),
    });
    global.fetch = fetchMock as unknown as typeof fetch;

    await renderHook(() => useCoverage(), { wrapper: createQueryClientWrapper() });

    await waitFor(() => expect(fetchMock).toHaveBeenCalled());
    const calledUrl = fetchMock.mock.calls[0][0] as string;
    expect(calledUrl).toContain('regionType=city');
  });
});
