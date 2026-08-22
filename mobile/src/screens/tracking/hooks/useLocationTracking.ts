// S-002 AC-13, AC-15, AC-16: 位置情報の定期取得。`status='recording'`のときのみ`enabled=true`として
// 呼び出す想定で、取得ごとに `onPosition` コールバックへ通知しつつ「最終GPS取得時刻」を保持する
// （AC-21の断絶警告バナー判定基準、plan.md「位置情報バッチ送信と画面反映」データフロー）。
import { useEffect, useRef, useState } from 'react';
import * as Location from 'expo-location';

/**
 * 位置取得間隔。要件定義書の非機能要件（性能・バッテリー消費とのバランス）を踏まえた暫定値。
 * 後から調整しやすいよう名前付き定数として定義する（tasks.md未解決事項T-11参照）。
 */
export const LOCATION_UPDATE_INTERVAL_MS = 10_000;

export interface TrackedPosition {
  lng: number;
  lat: number;
  elevationM: number | null;
  speedMps: number | null;
  accuracyM: number | null;
  /** ISO8601文字列（UTC）。 */
  recordedAt: string;
}

export interface UseLocationTrackingOptions {
  /** trueの間のみ位置取得を行う（AC-15: 一時停止中はfalseにして購読を止める）。 */
  enabled: boolean;
  onPosition: (position: TrackedPosition) => void;
}

export interface UseLocationTrackingResult {
  /** AC-21の断絶警告バナー判定基準となる、端末ローカルで最後にGPSから位置を取得できた時刻。 */
  lastGpsFixAt: string | null;
}

export function useLocationTracking({ enabled, onPosition }: UseLocationTrackingOptions): UseLocationTrackingResult {
  const [lastGpsFixAt, setLastGpsFixAt] = useState<string | null>(null);
  const onPositionRef = useRef(onPosition);
  onPositionRef.current = onPosition;

  useEffect(() => {
    if (!enabled) return;

    let subscription: Location.LocationSubscription | null = null;
    let cancelled = false;

    Location.watchPositionAsync(
      {
        accuracy: Location.Accuracy.Balanced,
        timeInterval: LOCATION_UPDATE_INTERVAL_MS,
        distanceInterval: 0,
      },
      (location) => {
        const recordedAt = new Date(location.timestamp).toISOString();
        setLastGpsFixAt(recordedAt);
        onPositionRef.current({
          lng: location.coords.longitude,
          lat: location.coords.latitude,
          elevationM: location.coords.altitude ?? null,
          speedMps: location.coords.speed ?? null,
          accuracyM: location.coords.accuracy ?? null,
          recordedAt,
        });
      }
    ).then((sub) => {
      if (cancelled) {
        sub.remove();
      } else {
        subscription = sub;
      }
    });

    return () => {
      cancelled = true;
      subscription?.remove();
    };
  }, [enabled]);

  return { lastGpsFixAt };
}
