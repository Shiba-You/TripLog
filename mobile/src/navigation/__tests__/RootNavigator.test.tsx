import { render, screen, fireEvent, waitFor } from '@testing-library/react-native';
import { QueryClientProvider } from '@tanstack/react-query';

// MapScreen（マップタブ）はuseLocationPermission経由でexpo-locationを呼ぶため、
// タブ遷移確認（AC-34, AC-35）に不要な実ネイティブ呼び出しを避けるためモックする。
jest.mock('expo-location', () => ({
  PermissionStatus: { GRANTED: 'granted', UNDETERMINED: 'undetermined', DENIED: 'denied' },
  Accuracy: { Balanced: 3 },
  getForegroundPermissionsAsync: jest
    .fn()
    .mockResolvedValue({ status: 'denied', granted: false, canAskAgain: false, expires: 'never' }),
  requestForegroundPermissionsAsync: jest
    .fn()
    .mockResolvedValue({ status: 'denied', granted: false, canAskAgain: false, expires: 'never' }),
  getCurrentPositionAsync: jest.fn(),
}));

import RootNavigator from '../RootNavigator';
import { createTestQueryClient } from '../../test-utils/queryClientWrapper';

// MapScreen（マップタブ）はuseMapScreenQueries経由でAPIを呼ぶため、
// タブ遷移確認（AC-34, AC-35）に必要な最小限のレスポンスをモックする。
function mockFetchForMapScreen() {
  return jest.fn((url: string) => {
    if (url.includes('/api/trips')) return Promise.resolve({ ok: true, status: 200, json: async () => [] });
    if (url.includes('/api/coverage')) {
      return Promise.resolve({
        ok: true,
        status: 200,
        json: async () => ({ stats: { visitedCount: 0, totalCount: 0, coverageRate: 0 }, geojson: { type: 'FeatureCollection', features: [] } }),
      });
    }
    if (url.includes('/api/photos')) return Promise.resolve({ ok: true, status: 200, json: async () => [] });
    return Promise.reject(new Error(`unexpected url: ${url}`));
  });
}

function renderRootNavigator() {
  const client = createTestQueryClient();
  return render(
    <QueryClientProvider client={client}>
      <RootNavigator />
    </QueryClientProvider>
  );
}

describe('RootNavigator (AC-34, AC-35)', () => {
  const originalFetch = global.fetch;

  beforeEach(() => {
    global.fetch = mockFetchForMapScreen() as unknown as typeof fetch;
  });

  afterEach(() => {
    global.fetch = originalFetch;
    jest.restoreAllMocks();
  });

  it('AC-34: 初期表示でマップタブがハイライト（フォーカス）されマップ画面が表示される', async () => {
    await renderRootNavigator();
    await waitFor(() => expect(screen.getByTestId('mock-maplibre-map')).toBeTruthy());
  });

  it('AC-35: 「旅行」タブタップでTripListScreenPlaceholderへ遷移する', async () => {
    await renderRootNavigator();
    await waitFor(() => expect(screen.getByTestId('mock-maplibre-map')).toBeTruthy());

    await fireEvent.press(screen.getByText('旅行'));

    await waitFor(() => expect(screen.getByText('旅行一覧（準備中）')).toBeTruthy());
  });

  it('AC-35: 「家計簿」タブタップでExpensesScreenPlaceholderへ遷移する', async () => {
    await renderRootNavigator();
    await waitFor(() => expect(screen.getByTestId('mock-maplibre-map')).toBeTruthy());

    await fireEvent.press(screen.getByText('家計簿'));

    await waitFor(() => expect(screen.getByText('家計簿（準備中）')).toBeTruthy());
  });

  it('AC-35: 「設定」タブタップでSettingsScreenPlaceholderへ遷移する', async () => {
    await renderRootNavigator();
    await waitFor(() => expect(screen.getByTestId('mock-maplibre-map')).toBeTruthy());

    await fireEvent.press(screen.getByText('設定'));

    await waitFor(() => expect(screen.getByText('設定（準備中）')).toBeTruthy());
  });
});
