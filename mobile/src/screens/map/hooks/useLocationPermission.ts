// 位置情報許可状態の判定と現在地取得（AC-16, AC-17, AC-18, AC-36の入力）。
//
// AC-16: 許可状態が「未確認」の場合、画面表示時に自動でOSネイティブダイアログを表示する。
// AC-17: 「使用中のみ許可」「常に許可」→ 許可あり。「未確認」「拒否」「制限」→ 許可なし。
//   expo-location の PermissionStatus は GRANTED/UNDETERMINED/DENIED の3値であり、
//   iOSの「制限（Restricted）」はこのAPI層ではDENIED相当として扱われる（expo-locationの仕様上、
//   本フックではこれ以上の区別ができないための妥当な解釈）。
//
// フォローアップ: 実機/シミュレータでのOSダイアログ実表示確認はDev Build環境構築
// （docs/works/mobile_dev_build_setup.md）完了後に行う。
import { useEffect, useRef, useState } from 'react';
import * as Location from 'expo-location';

export type LocationPermissionState = 'undetermined' | 'granted' | 'denied';

export interface CurrentLocation {
  lat: number;
  lng: number;
}

export interface UseLocationPermissionResult {
  /** AC-17の判定結果（3値正規化） */
  permissionState: LocationPermissionState;
  /** AC-17: 許可状態が「使用中のみ許可」または「常に許可」のときtrue */
  isPermissionGranted: boolean;
  /** AC-18: 許可ありの場合に取得された現在地。未取得/失敗時はnull */
  currentLocation: CurrentLocation | null;
  /** 許可状態・現在地の初回解決が完了しているか */
  isResolving: boolean;
}

const CURRENT_POSITION_TIMEOUT_MS = 5000;

function withTimeout<T>(promise: Promise<T>, timeoutMs: number): Promise<T> {
  return new Promise((resolve, reject) => {
    const timer = setTimeout(() => reject(new Error('timeout')), timeoutMs);
    promise
      .then((value) => {
        clearTimeout(timer);
        resolve(value);
      })
      .catch((error) => {
        clearTimeout(timer);
        reject(error);
      });
  });
}

export function useLocationPermission(): UseLocationPermissionResult {
  const [permissionState, setPermissionState] = useState<LocationPermissionState>('undetermined');
  const [currentLocation, setCurrentLocation] = useState<CurrentLocation | null>(null);
  const [isResolving, setIsResolving] = useState(true);
  const hasRunRef = useRef(false);

  useEffect(() => {
    if (hasRunRef.current) return;
    hasRunRef.current = true;
    let cancelled = false;

    async function resolvePermissionAndLocation() {
      let response = await Location.getForegroundPermissionsAsync();
      if (response.status === Location.PermissionStatus.UNDETERMINED) {
        // AC-16: 未確認の場合、画面表示のタイミングでOSダイアログを自動表示する。
        response = await Location.requestForegroundPermissionsAsync();
      }
      if (cancelled) return;

      const granted = response.granted;
      setPermissionState(granted ? 'granted' : response.status === Location.PermissionStatus.UNDETERMINED ? 'undetermined' : 'denied');

      if (granted) {
        try {
          const position = await withTimeout(
            Location.getCurrentPositionAsync({ accuracy: Location.Accuracy.Balanced }),
            CURRENT_POSITION_TIMEOUT_MS
          );
          if (!cancelled) {
            setCurrentLocation({ lat: position.coords.latitude, lng: position.coords.longitude });
          }
        } catch {
          // 取得失敗/タイムアウト時は現在地なし扱いとし、AC-36優先順位2以降へフォールバックさせる。
          if (!cancelled) setCurrentLocation(null);
        }
      }

      if (!cancelled) setIsResolving(false);
    }

    void resolvePermissionAndLocation();

    return () => {
      cancelled = true;
    };
  }, []);

  return {
    permissionState,
    isPermissionGranted: permissionState === 'granted',
    currentLocation,
    isResolving,
  };
}
