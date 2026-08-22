import { renderHook, act } from '@testing-library/react-native';

import { useElapsedTime } from '../useElapsedTime';

describe('useElapsedTime', () => {
  beforeEach(() => {
    jest.useFakeTimers();
    jest.setSystemTime(new Date('2026-01-01T00:00:00Z'));
  });

  afterEach(() => {
    jest.useRealTimers();
  });

  it('startedAt未定義のとき常に00:00:00を返す（AC-6）', async () => {
    const { result } = await renderHook(() => useElapsedTime(undefined));
    expect(result.current).toBe('00:00:00');

    await act(async () => {
      jest.advanceTimersByTime(5000);
    });
    expect(result.current).toBe('00:00:00');
  });

  it('startedAtがnullのとき常に00:00:00を返す（AC-6）', async () => {
    const { result } = await renderHook(() => useElapsedTime(null));
    expect(result.current).toBe('00:00:00');
  });

  it('1秒ごとにHH:MM:SS表示が更新される（AC-5）', async () => {
    const { result } = await renderHook(() => useElapsedTime('2026-01-01T00:00:00Z'));
    expect(result.current).toBe('00:00:00');

    await act(async () => {
      jest.advanceTimersByTime(1000);
    });
    expect(result.current).toBe('00:00:01');

    await act(async () => {
      jest.advanceTimersByTime(60_000);
    });
    expect(result.current).toBe('00:01:01');
  });

  it('status=pausedであっても計算が継続する（一時停止区間を差し引かない、AC-5の対象外セクション）', async () => {
    const { result } = await renderHook(() => useElapsedTime('2026-01-01T00:00:00Z'));

    await act(async () => {
      jest.advanceTimersByTime(3000);
    });
    expect(result.current).toBe('00:00:03');
  });

  it('1時間を超える経過時間もHH:MM:SS形式で表示する', async () => {
    const { result } = await renderHook(() => useElapsedTime('2026-01-01T00:00:00Z'));

    await act(async () => {
      jest.advanceTimersByTime(60 * 60 * 1000 + 2000);
    });
    expect(result.current).toBe('01:00:02');
  });
});
