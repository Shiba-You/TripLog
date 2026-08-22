import { renderHook, waitFor } from '@testing-library/react-native';

jest.mock('expo-location', () => ({
  PermissionStatus: { GRANTED: 'granted', UNDETERMINED: 'undetermined', DENIED: 'denied' },
  Accuracy: { Balanced: 3 },
  getForegroundPermissionsAsync: jest.fn(),
  requestForegroundPermissionsAsync: jest.fn(),
  getCurrentPositionAsync: jest.fn(),
}));

import * as Location from 'expo-location';
import { useLocationPermission } from '../useLocationPermission';

const mockLocation = Location as jest.Mocked<typeof Location>;

describe('useLocationPermission', () => {
  afterEach(() => {
    jest.clearAllMocks();
  });

  it('AC-16: 許可状態が未確認のとき自動でrequestForegroundPermissionsAsyncを呼ぶ', async () => {
    mockLocation.getForegroundPermissionsAsync.mockResolvedValue({
      status: Location.PermissionStatus.UNDETERMINED,
      granted: false,
      canAskAgain: true,
      expires: 'never',
    });
    mockLocation.requestForegroundPermissionsAsync.mockResolvedValue({
      status: Location.PermissionStatus.DENIED,
      granted: false,
      canAskAgain: false,
      expires: 'never',
    });

    const { result } = await renderHook(() => useLocationPermission());

    await waitFor(() => expect(result.current.isResolving).toBe(false));
    expect(mockLocation.requestForegroundPermissionsAsync).toHaveBeenCalledTimes(1);
    expect(result.current.permissionState).toBe('denied');
    expect(result.current.isPermissionGranted).toBe(false);
  });

  it.each([
    ['使用中のみ許可', Location.PermissionStatus.GRANTED],
    ['常に許可', Location.PermissionStatus.GRANTED],
  ])('AC-17: %s のとき許可ありと判定する', async (_label, status) => {
    mockLocation.getForegroundPermissionsAsync.mockResolvedValue({
      status,
      granted: true,
      canAskAgain: true,
      expires: 'never',
    });
    mockLocation.getCurrentPositionAsync.mockResolvedValue({
      coords: { latitude: 35.6, longitude: 139.7, altitude: null, accuracy: 5, altitudeAccuracy: null, heading: null, speed: null },
      timestamp: Date.now(),
    });

    const { result } = await renderHook(() => useLocationPermission());

    await waitFor(() => expect(result.current.isResolving).toBe(false));
    expect(mockLocation.requestForegroundPermissionsAsync).not.toHaveBeenCalled();
    expect(result.current.permissionState).toBe('granted');
    expect(result.current.isPermissionGranted).toBe(true);
  });

  it('AC-17: 拒否のとき許可なしと判定する', async () => {
    mockLocation.getForegroundPermissionsAsync.mockResolvedValue({
      status: Location.PermissionStatus.DENIED,
      granted: false,
      canAskAgain: false,
      expires: 'never',
    });

    const { result } = await renderHook(() => useLocationPermission());

    await waitFor(() => expect(result.current.isResolving).toBe(false));
    expect(result.current.permissionState).toBe('denied');
    expect(result.current.isPermissionGranted).toBe(false);
  });

  it('AC-18: 許可ありのとき現在地を取得しcurrentLocationにセットする', async () => {
    mockLocation.getForegroundPermissionsAsync.mockResolvedValue({
      status: Location.PermissionStatus.GRANTED,
      granted: true,
      canAskAgain: true,
      expires: 'never',
    });
    mockLocation.getCurrentPositionAsync.mockResolvedValue({
      coords: { latitude: 35.681, longitude: 139.767, altitude: null, accuracy: 5, altitudeAccuracy: null, heading: null, speed: null },
      timestamp: Date.now(),
    });

    const { result } = await renderHook(() => useLocationPermission());

    await waitFor(() => expect(result.current.isResolving).toBe(false));
    expect(result.current.currentLocation).toEqual({ lat: 35.681, lng: 139.767 });
  });

  it('現在地取得がタイムアウト/失敗した場合はcurrentLocationがnullのまま解決する', async () => {
    mockLocation.getForegroundPermissionsAsync.mockResolvedValue({
      status: Location.PermissionStatus.GRANTED,
      granted: true,
      canAskAgain: true,
      expires: 'never',
    });
    mockLocation.getCurrentPositionAsync.mockRejectedValue(new Error('location unavailable'));

    const { result } = await renderHook(() => useLocationPermission());

    await waitFor(() => expect(result.current.isResolving).toBe(false));
    expect(result.current.currentLocation).toBeNull();
    expect(result.current.permissionState).toBe('granted');
  });
});
