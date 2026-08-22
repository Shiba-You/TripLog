import { renderHook, act } from '@testing-library/react-native';

import { useDisruptionWarning } from '../useDisruptionWarning';

describe('useDisruptionWarning', () => {
  beforeEach(() => {
    jest.useFakeTimers();
    jest.setSystemTime(new Date('2026-01-01T00:00:00Z'));
  });

  afterEach(() => {
    jest.useRealTimers();
  });

  it('AC-21: オンライン+5分超過でtrueを返す', async () => {
    const { result, rerender } = await renderHook(
      ({ lastGpsFixAt }: { lastGpsFixAt: string | null }) =>
        useDisruptionWarning(lastGpsFixAt, true, 'recording'),
      { initialProps: { lastGpsFixAt: '2026-01-01T00:00:00Z' } }
    );
    expect(result.current.isWarningVisible).toBe(false);

    await act(async () => {
      jest.setSystemTime(new Date('2026-01-01T00:05:01Z'));
      jest.advanceTimersByTime(1000);
    });
    await rerender({ lastGpsFixAt: '2026-01-01T00:00:00Z' });

    expect(result.current.isWarningVisible).toBe(true);
    expect(result.current.elapsedMinutes).toBeGreaterThanOrEqual(5);
  });

  it('AC-21: オンライン+5分未満はfalseを返す', async () => {
    const { result } = await renderHook(() =>
      useDisruptionWarning('2026-01-01T00:00:00Z', true, 'recording')
    );

    await act(async () => {
      // advanceTimersByTimeは疑似クロックも同時に進めるため、setSystemTimeの目標時刻から
      // さらにadvance分（1000ms）進んだ時刻になる点に注意して1分未満の余裕を持たせる。
      jest.setSystemTime(new Date('2026-01-01T00:04:58Z'));
      jest.advanceTimersByTime(1000);
    });

    expect(result.current.isWarningVisible).toBe(false);
  });

  it('AC-25: オフライン（GPS取得可否によらず）は常にfalseを返す', async () => {
    const { result } = await renderHook(() =>
      useDisruptionWarning('2026-01-01T00:00:00Z', false, 'recording')
    );

    await act(async () => {
      jest.setSystemTime(new Date('2026-01-01T00:10:00Z'));
      jest.advanceTimersByTime(1000);
    });

    expect(result.current.isWarningVisible).toBe(false);
  });

  it('AC-22: 新規GPS取得でlastGpsFixAtが更新されると経過時間がリセットされfalseに戻る', async () => {
    const { result, rerender } = await renderHook(
      ({ lastGpsFixAt }: { lastGpsFixAt: string | null }) =>
        useDisruptionWarning(lastGpsFixAt, true, 'recording'),
      { initialProps: { lastGpsFixAt: '2026-01-01T00:00:00Z' } }
    );

    await act(async () => {
      jest.setSystemTime(new Date('2026-01-01T00:06:00Z'));
      jest.advanceTimersByTime(1000);
    });
    await rerender({ lastGpsFixAt: '2026-01-01T00:00:00Z' });
    expect(result.current.isWarningVisible).toBe(true);

    await rerender({ lastGpsFixAt: '2026-01-01T00:06:00Z' });
    expect(result.current.isWarningVisible).toBe(false);
  });

  it('status!==recordingのときは常にfalseを返す（例: paused）', async () => {
    const { result } = await renderHook(() =>
      useDisruptionWarning('2026-01-01T00:00:00Z', true, 'paused')
    );

    await act(async () => {
      jest.setSystemTime(new Date('2026-01-01T00:10:00Z'));
      jest.advanceTimersByTime(1000);
    });

    expect(result.current.isWarningVisible).toBe(false);
  });

  it('lastGpsFixAtがnull（未取得）のときも経過時間の起点として扱い5分超過でtrueになる', async () => {
    const { result } = await renderHook(() => useDisruptionWarning(null, true, 'recording'), {});

    // 初期マウント時点をGPS未取得の起点として扱う設計（実装コメント参照）。
    await act(async () => {
      jest.setSystemTime(new Date('2026-01-01T00:05:01Z'));
      jest.advanceTimersByTime(1000);
    });

    expect(result.current.isWarningVisible).toBe(true);
  });
});
