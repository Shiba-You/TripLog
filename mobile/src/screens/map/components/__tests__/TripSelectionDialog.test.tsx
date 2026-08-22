import { render, screen, fireEvent, waitFor, act } from '@testing-library/react-native';
import type { Trip } from '../../../../api/trips';

import { TripSelectionDialog } from '../TripSelectionDialog';
import { tripsQueryKey } from '../../../../api/trips';
import { createTestQueryClient, createQueryClientWrapper } from '../../../../test-utils/queryClientWrapper';

const TRIP_ID_1 = '11111111-1111-4111-8111-111111111111';
const TRIP_ID_2 = '22222222-2222-4222-8222-222222222222';
const TRACK_ID = '33333333-3333-4333-8333-333333333333';

const trips: Trip[] = [
  { id: TRIP_ID_1, name: '北海道旅行', description: null, color: '#E8833A', startedOn: '2026-01-01', endedOn: null, createdAt: '2026-01-01T00:00:00Z' },
  { id: TRIP_ID_2, name: '沖縄旅行', description: null, color: '#3AA0E8', startedOn: '2026-02-01', endedOn: null, createdAt: '2026-02-01T00:00:00Z' },
];

describe('TripSelectionDialog', () => {
  const originalFetch = global.fetch;

  afterEach(() => {
    global.fetch = originalFetch;
    jest.restoreAllMocks();
  });

  it('AC-32: trips件数分の選択肢＋新規作成選択肢が表示される（useTripsのキャッシュを再利用、再取得なし）', async () => {
    const fetchMock = jest.fn();
    global.fetch = fetchMock as unknown as typeof fetch;

    const client = createTestQueryClient();
    client.setQueryData(tripsQueryKey, trips);

    await render(
      <TripSelectionDialog visible onClose={jest.fn()} onStarted={jest.fn()} onCreateNew={jest.fn()} />,
      { wrapper: createQueryClientWrapper(client) }
    );

    expect(screen.getByText('北海道旅行')).toBeTruthy();
    expect(screen.getByText('沖縄旅行')).toBeTruthy();
    expect(screen.getByText('新しい旅行を作成')).toBeTruthy();
    expect(fetchMock).not.toHaveBeenCalled();
  });

  it('visible=falseのとき何も描画しない', async () => {
    const client = createTestQueryClient();
    client.setQueryData(tripsQueryKey, trips);

    const result = await render(
      <TripSelectionDialog visible={false} onClose={jest.fn()} onStarted={jest.fn()} onCreateNew={jest.fn()} />,
      { wrapper: createQueryClientWrapper(client) }
    );

    expect(result.toJSON()).toBeNull();
  });

  it('AC-33: 既存旅行選択でuseStartTrackが呼ばれ成功後onStartedが呼ばれる', async () => {
    const createdTrack = {
      id: TRACK_ID,
      tripId: TRIP_ID_1,
      source: 'live',
      status: 'recording',
      startedAt: '2026-01-01T00:00:00Z',
      endedAt: null,
      lastPointAt: null,
      pointCount: 0,
    };
    const fetchMock = jest.fn().mockResolvedValue({
      ok: true,
      status: 201,
      json: async () => createdTrack,
    });
    global.fetch = fetchMock as unknown as typeof fetch;

    const client = createTestQueryClient();
    client.setQueryData(tripsQueryKey, trips);
    const onStarted = jest.fn();

    await render(<TripSelectionDialog visible onClose={jest.fn()} onStarted={onStarted} onCreateNew={jest.fn()} />, {
      wrapper: createQueryClientWrapper(client),
    });

    await act(async () => {
      await fireEvent.press(screen.getByTestId(`trip-selection-item-${TRIP_ID_1}`));
    });

    await waitFor(() => expect(onStarted).toHaveBeenCalledWith(TRACK_ID));
    expect(fetchMock).toHaveBeenCalledTimes(1);
    expect(fetchMock.mock.calls[0][0]).toContain(`/api/trips/${TRIP_ID_1}/tracks`);
  });

  it('「キャンセル」タップでonCloseが呼ばれる', async () => {
    const client = createTestQueryClient();
    client.setQueryData(tripsQueryKey, trips);
    const onClose = jest.fn();

    await render(<TripSelectionDialog visible onClose={onClose} onStarted={jest.fn()} onCreateNew={jest.fn()} />, {
      wrapper: createQueryClientWrapper(client),
    });

    await fireEvent.press(screen.getByTestId('trip-selection-cancel'));

    expect(onClose).toHaveBeenCalledTimes(1);
  });
});
