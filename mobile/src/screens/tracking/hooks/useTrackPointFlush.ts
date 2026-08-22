// S-002 AC-13, AC-15, AC-24: バッファ→POSTのフラッシュループ。
// 一定間隔／ネットワーク復帰イベントを内部トリガーとして持ち、加えて呼び出し元（TrackingScreen、T-24）が
// 「一定件数到達」時に手動で `flush()` を呼べるようにする（plan.md「位置情報バッチ送信と画面反映」）。
// 送信失敗時はバッファを保持し何もしない（次回サイクルで再試行、spec.md「対象外」の専用エラーUIなし方針）。
import { useCallback, useEffect, useRef } from 'react';

import { useIngestTrackPoints } from '../../../api/tracks';
import type { UseTrackPointsBufferResult } from './useTrackPointsBuffer';

/** バッチ送信の定期フラッシュ間隔。後から調整しやすいよう名前付き定数として定義する（tasks.md T-12参照）。 */
export const FLUSH_INTERVAL_MS = 30_000;

/** バッファ件数がこの値に達したら定期フラッシュを待たず送信を試みる目安値（呼び出し元が利用）。 */
export const FLUSH_BUFFER_SIZE_THRESHOLD = 20;

export interface UseTrackPointFlushOptions {
  trackId: string;
  /** status==='recording'のときのみtrue（AC-15: 一時停止中はflush()を呼んでも送信しない）。 */
  enabled: boolean;
  isConnected: boolean | null;
  buffer: UseTrackPointsBufferResult;
}

export interface UseTrackPointFlushResult {
  /** バッファ内の未送信点をまとめて送信する。呼び出し元が「一定件数到達」トリガーとして能動的に呼べる。 */
  flush: () => Promise<void>;
}

export function useTrackPointFlush({
  trackId,
  enabled,
  isConnected,
  buffer,
}: UseTrackPointFlushOptions): UseTrackPointFlushResult {
  const ingestMutation = useIngestTrackPoints();
  const isFlushingRef = useRef(false);

  const flush = useCallback(async () => {
    if (!enabled || isFlushingRef.current) return;

    isFlushingRef.current = true;
    try {
      const points = await buffer.getAll();
      if (points.length === 0) return;

      await ingestMutation.mutateAsync({
        trackId,
        points: points.map((p) => ({
          lng: p.lng,
          lat: p.lat,
          elevationM: p.elevationM,
          speedMps: p.speedMps,
          accuracyM: p.accuracyM,
          recordedAt: p.recordedAt,
        })),
      });

      await buffer.deleteByIds(points.map((p) => p.id));
    } catch {
      // 送信失敗（ApiError）: バッファはそのまま保持し、次回フラッシュサイクルで再試行する。
    } finally {
      isFlushingRef.current = false;
    }
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [enabled, buffer, trackId]);

  // 定期フラッシュ。
  useEffect(() => {
    if (!enabled) return;
    const intervalId = setInterval(() => {
      void flush();
    }, FLUSH_INTERVAL_MS);
    return () => clearInterval(intervalId);
  }, [enabled, flush]);

  // ネットワーク復帰トリガー（false→trueへの遷移を検知した瞬間のみ発火）。
  const previousIsConnectedRef = useRef(isConnected);
  useEffect(() => {
    const previous = previousIsConnectedRef.current;
    previousIsConnectedRef.current = isConnected;
    if (enabled && previous === false && isConnected === true) {
      void flush();
    }
  }, [isConnected, enabled, flush]);

  return { flush };
}
