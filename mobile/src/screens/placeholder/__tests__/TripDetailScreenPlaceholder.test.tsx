// S-002 T-23: AC-18（終了確認後の遷移先）の受け皿となるS-004最小限placeholder。
// S-004本体の実装はスコープ外（plan.md参照）。
import { render, screen } from '@testing-library/react-native';

import TripDetailScreenPlaceholder from '../TripDetailScreenPlaceholder';

describe('TripDetailScreenPlaceholder', () => {
  it('route.params.tripIdを表示する', async () => {
    await render(
      <TripDetailScreenPlaceholder
        route={{ key: 'TripDetail-1', name: 'TripDetail', params: { tripId: 'trip-abc' } }}
      />
    );

    expect(screen.getByTestId('trip-detail-placeholder-trip-id').props.children).toContain('trip-abc');
  });
});
