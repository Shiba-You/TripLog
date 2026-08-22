// S-002 AC-23〜25: ネットワーク到達可能性のリアルタイム検出。
// APIリクエスト失敗の事後検知だけでは断絶警告バナー（GPS起因）と圏外表示（ネットワーク起因）を
// 排他的に描き分けられないため、`@react-native-community/netinfo` のイベント駆動検出を使う
// （plan.md「mobile: 新規導入ライブラリと採用理由」）。
import { useEffect, useState } from 'react';
import NetInfo from '@react-native-community/netinfo';

export interface UseNetworkStatusResult {
  /** true: 接続あり, false: 圏外/不通, null: 未解決（初回イベント到達前） */
  isConnected: boolean | null;
}

export function useNetworkStatus(): UseNetworkStatusResult {
  const [isConnected, setIsConnected] = useState<boolean | null>(null);

  useEffect(() => {
    const unsubscribe = NetInfo.addEventListener((state) => {
      setIsConnected(state.isConnected);
    });
    return () => unsubscribe();
  }, []);

  return { isConnected };
}
