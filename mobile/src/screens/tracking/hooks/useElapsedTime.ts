// S-002 AC-5, AC-6: 経過時間表示。`now() - startedAt` を1秒ごとに再計算し「HH:MM:SS」文字列を返す。
// startedAtがNULL/undefinedのときは常に「00:00:00」を返す。
// 対象外セクション: 一時停止区間を差し引かない単純計算のため、statusは入力に取らない。
import { useEffect, useState } from 'react';

const ZERO_ELAPSED = '00:00:00';

function pad2(value: number): string {
  return value.toString().padStart(2, '0');
}

function formatElapsed(startedAtMs: number, nowMs: number): string {
  const totalSeconds = Math.max(0, Math.floor((nowMs - startedAtMs) / 1000));
  const hours = Math.floor(totalSeconds / 3600);
  const minutes = Math.floor((totalSeconds % 3600) / 60);
  const seconds = totalSeconds % 60;
  return `${pad2(hours)}:${pad2(minutes)}:${pad2(seconds)}`;
}

export function useElapsedTime(startedAt: string | null | undefined): string {
  const [elapsed, setElapsed] = useState<string>(ZERO_ELAPSED);

  useEffect(() => {
    if (!startedAt) {
      setElapsed(ZERO_ELAPSED);
      return;
    }

    const startedAtMs = new Date(startedAt).getTime();
    setElapsed(formatElapsed(startedAtMs, Date.now()));

    const intervalId = setInterval(() => {
      setElapsed(formatElapsed(startedAtMs, Date.now()));
    }, 1000);

    return () => clearInterval(intervalId);
  }, [startedAt]);

  return elapsed;
}
