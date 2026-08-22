import { render, screen, waitFor, fireEvent, act } from '@testing-library/react-native';
import { QueryClientProvider } from '@tanstack/react-query';

const mockNavigate = jest.fn();
jest.mock('@react-navigation/native', () => ({
  ...jest.requireActual('@react-navigation/native'),
  useNavigation: () => ({ navigate: mockNavigate }),
}));

jest.mock('expo-linking', () => ({ openSettings: jest.fn().mockResolvedValue(undefined) }));

const mockGetForegroundPermissionsAsync = jest.fn();
const mockRequestForegroundPermissionsAsync = jest.fn();
const mockGetCurrentPositionAsync = jest.fn();
jest.mock('expo-location', () => ({
  PermissionStatus: { GRANTED: 'granted', UNDETERMINED: 'undetermined', DENIED: 'denied' },
  Accuracy: { Balanced: 3 },
  getForegroundPermissionsAsync: (...args: unknown[]) => mockGetForegroundPermissionsAsync(...args),
  requestForegroundPermissionsAsync: (...args: unknown[]) => mockRequestForegroundPermissionsAsync(...args),
  getCurrentPositionAsync: (...args: unknown[]) => mockGetCurrentPositionAsync(...args),
}));

import MapScreen from '../MapScreen';
import { createTestQueryClient } from '../../../test-utils/queryClientWrapper';

const TRIP_ID = '11111111-1111-4111-8111-111111111111';
const TRACK_ID = '22222222-2222-4222-8222-222222222222';

function jsonResponse(status: number, body: unknown) {
  return { ok: status >= 200 && status < 300, status, json: async () => body };
}

const EMPTY_COVERAGE = {
  stats: { visitedCount: 0, totalCount: 0, coverageRate: 0 },
  geojson: { type: 'FeatureCollection', features: [] },
};

function renderMapScreen() {
  const client = createTestQueryClient();
  return render(
    <QueryClientProvider client={client}>
      <MapScreen />
    </QueryClientProvider>
  );
}

function mockPermissionGranted() {
  mockGetForegroundPermissionsAsync.mockResolvedValue({
    status: 'granted',
    granted: true,
    canAskAgain: true,
    expires: 'never',
  });
  mockGetCurrentPositionAsync.mockResolvedValue({
    coords: { latitude: 35.6, longitude: 139.7, altitude: null, accuracy: 5, altitudeAccuracy: null, heading: null, speed: null },
    timestamp: Date.now(),
  });
}

function mockPermissionDenied() {
  mockGetForegroundPermissionsAsync.mockResolvedValue({
    status: 'denied',
    granted: false,
    canAskAgain: false,
    expires: 'never',
  });
}

describe('MapScreen (T-32 統合)', () => {
  const originalFetch = global.fetch;

  afterEach(() => {
    global.fetch = originalFetch;
    jest.clearAllMocks();
  });

  it('AC-25: ローディング中はスピナーのみ表示し、経路/データ空CTA/エラー表示は表示されない', async () => {
    mockPermissionGranted();
    // fetchを解決させないことでローディング状態を維持する。
    global.fetch = jest.fn(() => new Promise(() => {})) as unknown as typeof fetch;

    await renderMapScreen();

    await waitFor(() => expect(screen.getByTestId('map-screen-loading')).toBeTruthy());
    expect(screen.queryByTestId('empty-state-cta')).toBeNull();
    expect(screen.queryByTestId('error-banner')).toBeNull();
    expect(screen.queryByTestId('map-screen-fab')).toBeNull();
  });

  it('AC-23: データ空状態（trips0件）で「最初の旅行を作る」CTAが表示される', async () => {
    mockPermissionGranted();
    global.fetch = jest.fn((url: string) => {
      if (url.includes('/api/trips')) return Promise.resolve(jsonResponse(200, []));
      if (url.includes('/api/coverage')) return Promise.resolve(jsonResponse(200, EMPTY_COVERAGE));
      if (url.includes('/api/photos')) return Promise.resolve(jsonResponse(200, []));
      return Promise.reject(new Error(`unexpected url: ${url}`));
    }) as unknown as typeof fetch;

    await renderMapScreen();

    await waitFor(() => expect(screen.getByTestId('empty-state-cta')).toBeTruthy());
    expect(screen.getByText('最初の旅行を作る')).toBeTruthy();
    expect(screen.queryByTestId('map-screen-loading')).toBeNull();
  });

  it('AC-1: 通常状態（trips1件以上）でフィルタチップ・FABが表示される', async () => {
    mockPermissionGranted();
    const trip = {
      id: TRIP_ID,
      name: '北海道旅行',
      description: null,
      color: '#E8833A',
      startedOn: '2026-01-01',
      endedOn: null,
      createdAt: '2026-01-01T00:00:00Z',
    };
    const track = {
      id: TRACK_ID,
      tripId: TRIP_ID,
      source: 'live',
      status: 'finished',
      startedAt: '2026-01-01T00:00:00Z',
      endedAt: '2026-01-01T01:00:00Z',
      lastPointAt: '2026-01-01T01:00:00Z',
      pointCount: 1,
    };
    const pointsFeature = {
      type: 'Feature',
      geometry: { type: 'LineString', coordinates: [[139.0, 35.0], [139.1, 35.1]] },
      properties: null,
    };

    global.fetch = jest.fn((url: string) => {
      if (url.includes(`/api/trips/${TRIP_ID}/tracks`)) return Promise.resolve(jsonResponse(200, [track]));
      if (url.includes('/api/trips')) return Promise.resolve(jsonResponse(200, [trip]));
      if (url.includes('/api/coverage')) return Promise.resolve(jsonResponse(200, EMPTY_COVERAGE));
      if (url.includes(`/api/tracks/${TRACK_ID}/points`)) return Promise.resolve(jsonResponse(200, pointsFeature));
      if (url.includes('/api/photos')) return Promise.resolve(jsonResponse(200, []));
      return Promise.reject(new Error(`unexpected url: ${url}`));
    }) as unknown as typeof fetch;

    await renderMapScreen();

    await waitFor(() => expect(screen.getByTestId('map-screen-fab')).toBeTruthy());
    expect(screen.getByText('北海道旅行')).toBeTruthy();
    expect(screen.queryByTestId('empty-state-cta')).toBeNull();
    expect(screen.queryByTestId('error-banner')).toBeNull();
  });

  it('AC-27/AC-28: いずれかのAPIが失敗するとエラーバナーが表示され、再試行で回復できる', async () => {
    mockPermissionGranted();
    let coverageCallCount = 0;
    global.fetch = jest.fn((url: string) => {
      if (url.includes('/api/trips')) return Promise.resolve(jsonResponse(200, []));
      if (url.includes('/api/coverage')) {
        coverageCallCount += 1;
        return Promise.resolve(jsonResponse(coverageCallCount === 1 ? 500 : 200, EMPTY_COVERAGE));
      }
      if (url.includes('/api/photos')) return Promise.resolve(jsonResponse(200, []));
      return Promise.reject(new Error(`unexpected url: ${url}`));
    }) as unknown as typeof fetch;

    await renderMapScreen();

    await waitFor(() => expect(screen.getByTestId('error-banner')).toBeTruthy());
    expect(screen.queryByTestId('map-screen-loading')).toBeNull();
    expect(screen.queryByTestId('empty-state-cta')).toBeNull();

    await act(async () => {
      await fireEvent.press(screen.getByTestId('error-banner-retry'));
    });

    await waitFor(() => expect(screen.getByTestId('empty-state-cta')).toBeTruthy());
  });

  it('AC-19: 位置許可未取得バナーはローディング状態でも独立して表示される', async () => {
    mockPermissionDenied();
    global.fetch = jest.fn(() => new Promise(() => {})) as unknown as typeof fetch;

    await renderMapScreen();

    await waitFor(() => expect(screen.getByTestId('map-screen-loading')).toBeTruthy());
    expect(screen.getByTestId('location-permission-banner')).toBeTruthy();
    expect(screen.getByText('位置情報を許可してください')).toBeTruthy();
  });

  it('AC-19: 位置許可未取得バナーはエラー状態でも独立して表示される', async () => {
    mockPermissionDenied();
    global.fetch = jest.fn((url: string) => {
      if (url.includes('/api/trips')) return Promise.resolve(jsonResponse(500, {}));
      return Promise.reject(new Error(`unexpected url: ${url}`));
    }) as unknown as typeof fetch;

    await renderMapScreen();

    await waitFor(() => expect(screen.getByTestId('error-banner')).toBeTruthy());
    expect(screen.getByTestId('location-permission-banner')).toBeTruthy();
  });

  it('AC-18: 位置許可ありのとき位置許可未取得バナーが表示されない', async () => {
    mockPermissionGranted();
    global.fetch = jest.fn((url: string) => {
      if (url.includes('/api/trips')) return Promise.resolve(jsonResponse(200, []));
      if (url.includes('/api/coverage')) return Promise.resolve(jsonResponse(200, EMPTY_COVERAGE));
      if (url.includes('/api/photos')) return Promise.resolve(jsonResponse(200, []));
      return Promise.reject(new Error(`unexpected url: ${url}`));
    }) as unknown as typeof fetch;

    await renderMapScreen();

    await waitFor(() => expect(screen.getByTestId('empty-state-cta')).toBeTruthy());
    expect(screen.queryByTestId('location-permission-banner')).toBeNull();
  });
});
