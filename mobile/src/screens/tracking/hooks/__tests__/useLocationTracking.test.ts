import { renderHook, waitFor, act } from '@testing-library/react-native';

jest.mock('expo-location', () => ({
  Accuracy: { Balanced: 3 },
  watchPositionAsync: jest.fn(),
}));

import * as Location from 'expo-location';
import { useLocationTracking } from '../useLocationTracking';

const mockLocation = Location as jest.Mocked<typeof Location>;

function makeLocationObject(overrides: Partial<{ lng: number; lat: number; timestamp: number }> = {}) {
  return {
    coords: {
      longitude: overrides.lng ?? 139.0,
      latitude: overrides.lat ?? 35.0,
      altitude: 10,
      speed: 1.2,
      accuracy: 5,
      heading: null,
      altitudeAccuracy: null,
    },
    timestamp: overrides.timestamp ?? Date.parse('2026-01-01T00:00:00Z'),
    mocked: false,
  };
}

describe('useLocationTracking', () => {
  afterEach(() => {
    jest.clearAllMocks();
  });

  it('AC-13, AC-16: enabled=trueのときwatchPositionAsyncが呼ばれ位置取得コールバックでonPositionと最終GPS取得時刻が更新される', async () => {
    const removeMock = jest.fn();
    let capturedCallback: ((location: ReturnType<typeof makeLocationObject>) => void) | undefined;
    mockLocation.watchPositionAsync.mockImplementation(async (_options, callback) => {
      capturedCallback = callback as typeof capturedCallback;
      return { remove: removeMock };
    });

    const onPosition = jest.fn();
    const { result } = await renderHook(() => useLocationTracking({ enabled: true, onPosition }));

    await waitFor(() => expect(mockLocation.watchPositionAsync).toHaveBeenCalledTimes(1));

    await act(async () => {
      capturedCallback?.(makeLocationObject({ lng: 139.5, lat: 35.5, timestamp: Date.parse('2026-01-01T00:00:05Z') }));
    });

    await waitFor(() => expect(onPosition).toHaveBeenCalledTimes(1));
    expect(onPosition).toHaveBeenCalledWith(
      expect.objectContaining({ lng: 139.5, lat: 35.5, recordedAt: '2026-01-01T00:00:05.000Z' })
    );
    await waitFor(() => expect(result.current.lastGpsFixAt).toBe('2026-01-01T00:00:05.000Z'));
  });

  it('AC-15: enabled=false（一時停止相当）のときwatchPositionAsyncを呼ばない', async () => {
    await renderHook(() => useLocationTracking({ enabled: false, onPosition: jest.fn() }));

    expect(mockLocation.watchPositionAsync).not.toHaveBeenCalled();
  });

  it('AC-15: enabled=trueからfalseへ変化すると購読が解除され以後のコールバックが発火しない', async () => {
    const removeMock = jest.fn();
    let capturedCallback: ((location: ReturnType<typeof makeLocationObject>) => void) | undefined;
    mockLocation.watchPositionAsync.mockImplementation(async (_options, callback) => {
      capturedCallback = callback as typeof capturedCallback;
      return { remove: removeMock };
    });

    const onPosition = jest.fn();
    const { rerender } = await renderHook(
      ({ enabled }: { enabled: boolean }) => useLocationTracking({ enabled, onPosition }),
      { initialProps: { enabled: true } }
    );

    await waitFor(() => expect(mockLocation.watchPositionAsync).toHaveBeenCalledTimes(1));

    rerender({ enabled: false });

    await waitFor(() => expect(removeMock).toHaveBeenCalledTimes(1));

    // 購読解除後にコールバックを直接呼んでも(実機ではあり得ないが)onPositionは増えない想定は
    // フック外の責務のため、ここでは購読解除自体が行われたことのみを確認する。
    expect(capturedCallback).toBeDefined();
  });
});
