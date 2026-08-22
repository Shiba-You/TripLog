// S-002 AC-21, AC-22, AC-25: 断絶警告バナーの表示判定。
// AC-25優先: ネットワーク不通中（isNetworkConnected===false、または未解決のnull）は
// GPS取得可否に関わらず常に非表示とする（圏外時ローカル蓄積表示が代わりに表示される）。
// isNetworkConnected===trueが確定していて、かつ最終GPS取得時刻からの経過が既定閾値（5分）を
// 超えた場合のみ表示する（plan.md「断絶警告バナー・圏外表示」データフロー）。
import { useEffect, useRef, useState } from 'react';

/** 断絶警告の既定しきい値。画面定義書・spec.md AC-21「既定5分」。 */
export const DISRUPTION_WARNING_THRESHOLD_MS = 5 * 60 * 1000;

const TICK_INTERVAL_MS = 1000;

export interface UseDisruptionWarningResult {
  isWarningVisible: boolean;
  elapsedMinutes: number;
}

export function useDisruptionWarning(
  lastGpsFixAt: string | null,
  isNetworkConnected: boolean | null,
  status: 'recording' | 'paused'
): UseDisruptionWarningResult {
  // lastGpsFixAtが一度も確定していない（GPS取得前）場合の起点。記録開始（本フックの初回マウント）を
  // 基準時刻として扱う。
  const mountedAtMsRef = useRef(Date.now());
  const [, forceTick] = useState(0);

  useEffect(() => {
    const intervalId = setInterval(() => forceTick((n) => n + 1), TICK_INTERVAL_MS);
    return () => clearInterval(intervalId);
  }, []);

  if (status !== 'recording' || isNetworkConnected !== true) {
    return { isWarningVisible: false, elapsedMinutes: 0 };
  }

  const baselineMs = lastGpsFixAt ? new Date(lastGpsFixAt).getTime() : mountedAtMsRef.current;
  const elapsedMs = Date.now() - baselineMs;
  const elapsedMinutes = Math.floor(elapsedMs / 60_000);
  const isWarningVisible = elapsedMs >= DISRUPTION_WARNING_THRESHOLD_MS;

  return { isWarningVisible, elapsedMinutes };
}
