import { renderHook, act } from '@testing-library/react-native';

import { useNetworkStatus } from '../useNetworkStatus';
// __setMockNetworkState/__resetMockNetInfo はモック専用ヘルパーのため、実ライブラリの型に存在しない。
// T-5のnetinfoモックへ相対importで直接アクセスする（テストファイル内で解決先パスが一致し状態を共有できる）。
import {
  __setMockNetworkState,
  __resetMockNetInfo,
} from '../../../../../__mocks__/@react-native-community/netinfo';

describe('useNetworkStatus', () => {
  afterEach(() => {
    __resetMockNetInfo();
  });

  it('AC-23〜25: 初期状態はisConnected=trueとして解決される', async () => {
    __setMockNetworkState({ isConnected: true, isInternetReachable: true });

    const { result } = await renderHook(() => useNetworkStatus());

    expect(result.current.isConnected).toBe(true);
  });

  it('AC-23: ネットワーク不通イベント発火でisConnectedがfalseに追随する', async () => {
    const { result } = await renderHook(() => useNetworkStatus());
    expect(result.current.isConnected).toBe(true);

    await act(async () => {
      __setMockNetworkState({ isConnected: false, isInternetReachable: false });
    });

    expect(result.current.isConnected).toBe(false);
  });

  it('AC-24: 接続復帰イベント発火でisConnectedがtrueに戻る', async () => {
    __setMockNetworkState({ isConnected: false, isInternetReachable: false });
    const { result } = await renderHook(() => useNetworkStatus());
    expect(result.current.isConnected).toBe(false);

    await act(async () => {
      __setMockNetworkState({ isConnected: true, isInternetReachable: true });
    });

    expect(result.current.isConnected).toBe(true);
  });
});
