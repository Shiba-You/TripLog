// @react-native-community/netinfo の手動モック（Jest実行時のみ使用）。
//
// ネイティブモジュールのため、Jest環境では実際のOSネットワーク監視は行わない。
// S-002の `useNetworkStatus`（T-9）が使う `addEventListener`/`fetch` のみを最小実装し、
// テスト側から `__setMockNetworkState` で状態変化（接続断/復帰、AC-23〜25）をシミュレートできるようにする。
// S-001の `mobile/__mocks__/@maplibre/maplibre-react-native.tsx` と同じ方針。
// Dev Build環境が整い次第、実機/シミュレータで本物のネットワーク検出を確認する。

export interface MockNetInfoState {
  isConnected: boolean | null;
  isInternetReachable: boolean | null;
}

type Listener = (state: MockNetInfoState) => void;

let currentState: MockNetInfoState = { isConnected: true, isInternetReachable: true };
let listeners: Listener[] = [];

const addEventListener = jest.fn((listener: Listener): (() => void) => {
  listeners.push(listener);
  // 実ライブラリ同様、登録直後に現在の状態を1回通知する。
  listener(currentState);
  return () => {
    listeners = listeners.filter((l) => l !== listener);
  };
});

const fetch = jest.fn(async (): Promise<MockNetInfoState> => currentState);

/** テストヘルパー: ネットワーク状態を変更し登録済みリスナー全員へ通知する。 */
export function __setMockNetworkState(state: MockNetInfoState): void {
  currentState = state;
  listeners.forEach((listener) => listener(currentState));
}

/** テストヘルパー: モック状態・呼び出し履歴をリセットする（`afterEach`から呼ぶ想定）。 */
export function __resetMockNetInfo(): void {
  currentState = { isConnected: true, isInternetReachable: true };
  listeners = [];
  addEventListener.mockClear();
  fetch.mockClear();
}

const NetInfoMock = {
  addEventListener,
  fetch,
};

export default NetInfoMock;
