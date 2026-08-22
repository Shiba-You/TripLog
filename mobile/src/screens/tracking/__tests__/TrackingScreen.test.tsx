// S-002 T-24: TrackingScreen統合テスト。5状態（記録中/一時停止/断絶警告/終了確認モーダル/圏外ローカル
// 蓄積中）それぞれのレンダリング結果がspec.mdの該当ACと一致することを確認する結合テスト。
import { render, screen, waitFor, fireEvent, act } from '@testing-library/react-native';
import { QueryClientProvider } from '@tanstack/react-query';

let capturedWatchCallback: ((location: unknown) => void) | undefined;
const watchRemoveMock = jest.fn();
const mockWatchPositionAsync = jest.fn(async (_options: unknown, callback: (location: unknown) => void) => {
  capturedWatchCallback = callback;
  return { remove: watchRemoveMock };
});
jest.mock('expo-location', () => ({
  Accuracy: { Balanced: 3 },
  watchPositionAsync: (...args: [unknown, (location: unknown) => void]) => mockWatchPositionAsync(...args),
}));

import TrackingScreen from '../TrackingScreen';
import { createTestQueryClient } from '../../../test-utils/queryClientWrapper';
import { __setMockNetworkState, __resetMockNetInfo } from '../../../../__mocks__/@react-native-community/netinfo';
import { __resetMockDatabases } from '../../../../__mocks__/expo-sqlite';

const TRIP_ID = '11111111-1111-4111-8111-111111111111';
const TRACK_ID = '22222222-2222-4222-8222-222222222222';

function jsonResponse(status: number, body: unknown) {
  return { ok: status >= 200 && status < 300, status, json: async () => body };
}

function makeTrack(overrides: Partial<Record<string, unknown>> = {}) {
  return {
    id: TRACK_ID,
    tripId: TRIP_ID,
    source: 'live',
    status: 'recording',
    startedAt: '2026-01-01T00:00:00Z',
    endedAt: null,
    lastPointAt: null,
    pointCount: 0,
    ...overrides,
  };
}

function makeEmptyPointsFeature() {
  return { type: 'Feature', geometry: null, properties: { trackId: TRACK_ID, pointCount: 0 } };
}

function makeTrip() {
  return {
    id: TRIP_ID,
    name: '京都旅行',
    description: null,
    color: '#E8833A',
    startedOn: null,
    endedOn: null,
    createdAt: '2026-01-01T00:00:00Z',
  };
}

function mockNavigation() {
  return { navigate: jest.fn() } as unknown as import('@react-navigation/native-stack').NativeStackNavigationProp<
    import('../../../navigation/RootNavigator').RootStackParamList,
    'Tracking'
  >;
}

function mockRoute() {
  return { key: 'Tracking-1', name: 'Tracking' as const, params: { trackId: TRACK_ID } };
}

function renderTrackingScreen(
  fetchRouter: (url: string, init?: RequestInit) => Promise<unknown>,
  navigation = mockNavigation()
) {
  const client = createTestQueryClient();
  global.fetch = jest.fn((url: string, init?: RequestInit) => fetchRouter(url, init)) as unknown as typeof fetch;
  const utils = render(
    <QueryClientProvider client={client}>
      <TrackingScreen route={mockRoute()} navigation={navigation} />
    </QueryClientProvider>
  );
  return { ...utils, navigation };
}

function defaultFetchRouter(overrides: Partial<{ track: ReturnType<typeof makeTrack> }> = {}) {
  return async (url: string, init?: RequestInit) => {
    if (url.includes('/api/tracks/') && url.includes('/points') && (!init || init.method === undefined)) {
      return jsonResponse(200, makeEmptyPointsFeature());
    }
    if (url.includes('/api/tracks/') && url.includes('/points') && init?.method === 'POST') {
      return jsonResponse(202, { accepted: 1, newlyVisitedRegionIds: [] });
    }
    if (url.includes('/api/tracks/') && init?.method === 'PATCH') {
      const body = JSON.parse(init.body as string) as { status: string };
      return jsonResponse(
        200,
        makeTrack({ status: body.status, endedAt: body.status === 'finished' ? '2026-01-01T00:10:00Z' : null })
      );
    }
    if (url.includes('/api/tracks/')) {
      return jsonResponse(200, overrides.track ?? makeTrack());
    }
    if (url.includes('/api/trips')) {
      return jsonResponse(200, [makeTrip()]);
    }
    throw new Error(`unexpected url: ${url}`);
  };
}

describe('TrackingScreen', () => {
  const originalFetch = global.fetch;

  beforeEach(() => {
    capturedWatchCallback = undefined;
  });

  afterEach(() => {
    global.fetch = originalFetch;
    jest.clearAllMocks();
    __resetMockNetInfo();
    __resetMockDatabases();
  });

  it('AC-1: 記録中状態の初期表示（ステータス・インジケータ・旅行ラベル・経過時間・距離・取得点数）', async () => {
    __setMockNetworkState({ isConnected: true, isInternetReachable: true });
    renderTrackingScreen(defaultFetchRouter());

    await waitFor(() => expect(screen.getByText('記録中')).toBeTruthy());
    expect(screen.getByTestId('status-header-indicator')).toBeTruthy();
    expect(screen.getByText('京都旅行')).toBeTruthy();
    // 経過時間の正確な値（00:00:00固定・1秒毎更新）はElapsedTimeText/useElapsedTimeの単体テスト
    // （T-8, T-15）で個別に検証済み（時刻固定なし環境で実行するため、ここでは実時計との差分になり得る
    // ことを踏まえ、TrackingScreenへの結線＝HH:MM:SS形式で表示されていることのみ確認する）。
    expect(screen.getByTestId('elapsed-time-text').props.children).toMatch(/^\d+:\d{2}:\d{2}$/);
    expect(screen.getByText('0.0km')).toBeTruthy();
    expect(screen.getByTestId('point-count-text').props.children).toBe(0);
    expect(screen.getByText('一時停止')).toBeTruthy();
    expect(screen.getByText('終了')).toBeTruthy();
    // AC-20: 開始ボタンはS-002の画面構成上そもそも描画されない（TrackingControlsは一時停止/再開・終了のみ）。
    expect(screen.queryByText('開始')).toBeNull();
  });

  it('AC-14: 一時停止ボタンタップでPATCH{status:paused}が呼ばれ表示が一時停止中に切り替わる', async () => {
    __setMockNetworkState({ isConnected: true, isInternetReachable: true });
    renderTrackingScreen(defaultFetchRouter());

    await waitFor(() => expect(screen.getByText('記録中')).toBeTruthy());

    await act(async () => {
      fireEvent.press(screen.getByTestId('tracking-controls-pause-resume'));
    });

    await waitFor(() => expect(screen.getByText('一時停止中')).toBeTruthy());
    expect(screen.queryByTestId('status-header-indicator')).toBeNull();
    expect(screen.getByText('再開')).toBeTruthy();
  });

  it('AC-17〜19: 終了ボタン→モーダル表示、キャンセルでAPI未呼び出し、終了するでPATCH+遷移', async () => {
    __setMockNetworkState({ isConnected: true, isInternetReachable: true });
    const { navigation } = renderTrackingScreen(defaultFetchRouter());

    await waitFor(() => expect(screen.getByText('記録中')).toBeTruthy());

    await act(async () => {
      fireEvent.press(screen.getByTestId('tracking-controls-end'));
    });
    expect(screen.getByText('トラッキングを終了しますか')).toBeTruthy();

    await act(async () => {
      fireEvent.press(screen.getByTestId('end-confirm-modal-cancel'));
    });
    expect(screen.queryByText('トラッキングを終了しますか')).toBeNull();
    expect(navigation.navigate).not.toHaveBeenCalled();

    await act(async () => {
      fireEvent.press(screen.getByTestId('tracking-controls-end'));
    });
    await act(async () => {
      fireEvent.press(screen.getByTestId('end-confirm-modal-confirm'));
    });

    await waitFor(() => expect(navigation.navigate).toHaveBeenCalledWith('TripDetail', { tripId: TRIP_ID }));
  });

  it('AC-23〜25: 圏外検知でローカル蓄積表示に切り替わり断絶警告バナーは表示されない', async () => {
    __setMockNetworkState({ isConnected: true, isInternetReachable: true });
    renderTrackingScreen(defaultFetchRouter());

    await waitFor(() => expect(screen.getByText('記録中')).toBeTruthy());

    await act(async () => {
      __setMockNetworkState({ isConnected: false, isInternetReachable: false });
    });

    // GPS取得コールバックを発火し、ローカルバッファへ1点追加させる。
    await act(async () => {
      capturedWatchCallback?.({
        coords: { longitude: 139.0, latitude: 35.0, altitude: null, speed: null, accuracy: 5 },
        timestamp: Date.now(),
      });
    });

    await waitFor(() => expect(screen.getByTestId('offline-buffer-indicator')).toBeTruthy());
    expect(screen.getByText('圏外: ローカルに1件保存中')).toBeTruthy();
    // AC-25: 圏外時は断絶警告バナーを表示しない（GPS自体は取得できていても排他）。
    expect(screen.queryByTestId('disruption-banner')).toBeNull();
  });

  it('AC-15: 一時停止中は取得点数・距離の表示が増加しない（新規位置取得・送信を行わない）', async () => {
    __setMockNetworkState({ isConnected: true, isInternetReachable: true });
    renderTrackingScreen(defaultFetchRouter());

    await waitFor(() => expect(screen.getByText('記録中')).toBeTruthy());

    await act(async () => {
      fireEvent.press(screen.getByTestId('tracking-controls-pause-resume'));
    });
    await waitFor(() => expect(screen.getByText('一時停止中')).toBeTruthy());

    // 一時停止後は購読が解除されるため、watchPositionAsyncが一時停止前の1回のみ呼ばれたままであることを確認する。
    expect(mockWatchPositionAsync).toHaveBeenCalledTimes(1);
    expect(watchRemoveMock).toHaveBeenCalled();
    expect(screen.getByTestId('point-count-text').props.children).toBe(0);
    expect(screen.getByText('0.0km')).toBeTruthy();
  });
});

// AC-21: 断絶警告バナーの表示判定は「最終GPS取得時刻からの経過時間」に依存する。
// fake timers + setSystemTime は他フック（バッファポーリング等）の実インターバルとの相性が悪く
// 不安定になりやすいため、GPS取得時刻を固定エポック値で確定させたうえで `Date.now` を直接スタブし、
// ネットワーク状態の再トグルで再描画を誘発するという決定的な手法で検証する。
describe('TrackingScreen（断絶警告バナー）', () => {
  const originalFetch = global.fetch;
  const GPS_FIX_EPOCH_MS = 1_000_000_000_000;

  beforeEach(() => {
    capturedWatchCallback = undefined;
  });

  afterEach(() => {
    global.fetch = originalFetch;
    jest.clearAllMocks();
    jest.restoreAllMocks();
    __resetMockNetInfo();
    __resetMockDatabases();
  });

  it('AC-21, AC-25: オンラインでGPSが5分取得できないと断絶警告バナーが表示される', async () => {
    __setMockNetworkState({ isConnected: true, isInternetReachable: true });
    renderTrackingScreen(defaultFetchRouter());

    await waitFor(() => expect(screen.getByText('記録中')).toBeTruthy());
    expect(screen.queryByTestId('disruption-banner')).toBeNull();

    // 最終GPS取得時刻を固定エポック値として確定させる（実時計に依存しない決定的な基準点）。
    await act(async () => {
      capturedWatchCallback?.({
        coords: { longitude: 139.0, latitude: 35.0, altitude: null, speed: null, accuracy: 5 },
        timestamp: GPS_FIX_EPOCH_MS,
      });
    });

    // 「5分1秒後」をDate.nowの返り値として直接スタブする。
    jest.spyOn(Date, 'now').mockReturnValue(GPS_FIX_EPOCH_MS + 5 * 60 * 1000 + 1000);

    // ネットワーク状態を一度falseへ倒してtrueへ戻すことで再描画を誘発し、
    // 断絶警告バナーの判定（Date.now基準）を新しい時刻で再評価させる。
    await act(async () => {
      __setMockNetworkState({ isConnected: false, isInternetReachable: false });
    });
    await act(async () => {
      __setMockNetworkState({ isConnected: true, isInternetReachable: true });
    });

    await waitFor(() => expect(screen.getByTestId('disruption-banner')).toBeTruthy());
    expect(screen.queryByTestId('offline-buffer-indicator')).toBeNull();
  });
});
