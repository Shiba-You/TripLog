import { apiFetch, ApiError } from '../client';

describe('apiFetch', () => {
  const originalFetch = global.fetch;

  afterEach(() => {
    global.fetch = originalFetch;
    jest.restoreAllMocks();
  });

  it('正常系: JSONレスポンスをパースして返す', async () => {
    global.fetch = jest.fn().mockResolvedValue({
      ok: true,
      status: 200,
      json: async () => ({ hello: 'world' }),
    }) as unknown as typeof fetch;

    const result = await apiFetch<{ hello: string }>('/api/trips');
    expect(result).toEqual({ hello: 'world' });
  });

  it('クエリパラメータを付与してfetchを呼ぶ', async () => {
    const fetchMock = jest.fn().mockResolvedValue({
      ok: true,
      status: 200,
      json: async () => [],
    });
    global.fetch = fetchMock as unknown as typeof fetch;

    await apiFetch('/api/photos', { query: { bbox: '1,2,3,4', hasLocation: true, tripId: undefined } });

    const calledUrl = fetchMock.mock.calls[0][0] as string;
    expect(calledUrl).toContain('/api/photos');
    expect(calledUrl).toContain('bbox=1%2C2%2C3%2C4');
    expect(calledUrl).toContain('hasLocation=true');
    expect(calledUrl).not.toContain('tripId');
  });

  it('異常系: 通信エラー時にkind=networkのApiErrorを投げる', async () => {
    global.fetch = jest.fn().mockRejectedValue(new TypeError('Network request failed')) as unknown as typeof fetch;

    await expect(apiFetch('/api/trips')).rejects.toMatchObject({
      name: 'ApiError',
      kind: 'network',
    });
    await expect(apiFetch('/api/trips')).rejects.toBeInstanceOf(ApiError);
  });

  it('異常系: 5xxレスポンス時にkind=httpのApiErrorを投げる', async () => {
    global.fetch = jest.fn().mockResolvedValue({
      ok: false,
      status: 500,
      json: async () => ({}),
    }) as unknown as typeof fetch;

    await expect(apiFetch('/api/trips')).rejects.toMatchObject({
      name: 'ApiError',
      kind: 'http',
      status: 500,
    });
  });

  it('204 No Contentのときundefinedを返す', async () => {
    global.fetch = jest.fn().mockResolvedValue({
      ok: true,
      status: 204,
      json: async () => {
        throw new Error('should not be called');
      },
    }) as unknown as typeof fetch;

    const result = await apiFetch('/api/trips/1');
    expect(result).toBeUndefined();
  });
});
