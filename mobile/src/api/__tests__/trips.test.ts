import { renderHook, waitFor } from '@testing-library/react-native';

import { useTrips } from '../trips';
import { createQueryClientWrapper } from '../../test-utils/queryClientWrapper';

describe('useTrips', () => {
  const originalFetch = global.fetch;

  afterEach(() => {
    global.fetch = originalFetch;
    jest.restoreAllMocks();
  });

  it('正常系: dataにtrips配列を返す', async () => {
    const trip = {
      id: '11111111-1111-4111-8111-111111111111',
      name: '北海道旅行',
      description: null,
      color: '#E8833A',
      startedOn: '2026-01-01',
      endedOn: null,
      createdAt: '2026-01-01T00:00:00Z',
    };
    global.fetch = jest.fn().mockResolvedValue({
      ok: true,
      status: 200,
      json: async () => [trip],
    }) as unknown as typeof fetch;

    const { result } = await renderHook(() => useTrips(), { wrapper: createQueryClientWrapper() });

    await waitFor(() => expect(result.current.isSuccess).toBe(true));
    expect(result.current.data).toEqual([trip]);
  });

  it('異常系: レスポンスがスキーマ不一致（colorが欠落）のときエラー扱いになる', async () => {
    const invalidTrip = {
      id: '11111111-1111-4111-8111-111111111111',
      name: '北海道旅行',
      // color が無い
      createdAt: '2026-01-01T00:00:00Z',
    };
    global.fetch = jest.fn().mockResolvedValue({
      ok: true,
      status: 200,
      json: async () => [invalidTrip],
    }) as unknown as typeof fetch;

    const { result } = await renderHook(() => useTrips(), { wrapper: createQueryClientWrapper() });

    await waitFor(() => expect(result.current.isError).toBe(true));
  });

  it('異常系: 5xxエラー時にisErrorがtrueになる（AC-27の前提）', async () => {
    global.fetch = jest.fn().mockResolvedValue({
      ok: false,
      status: 500,
      json: async () => ({}),
    }) as unknown as typeof fetch;

    const { result } = await renderHook(() => useTrips(), { wrapper: createQueryClientWrapper() });

    await waitFor(() => expect(result.current.isError).toBe(true));
  });
});
