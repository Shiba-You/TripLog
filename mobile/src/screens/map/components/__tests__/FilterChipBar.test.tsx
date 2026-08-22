import { render, screen, fireEvent } from '@testing-library/react-native';
import type { Trip } from '../../../../api/trips';

import { FilterChipBar } from '../FilterChipBar';

const trips: Trip[] = [
  { id: 'trip-1', name: '北海道旅行', description: null, color: '#E8833A', startedOn: '2026-01-01', endedOn: null, createdAt: '2026-01-01T00:00:00Z' },
  { id: 'trip-2', name: '沖縄旅行', description: null, color: '#3AA0E8', startedOn: '2026-02-01', endedOn: null, createdAt: '2026-02-01T00:00:00Z' },
];

describe('FilterChipBar', () => {
  it('AC-2: trips件数分のチップをname/colorで描画する', async () => {
    await render(
      <FilterChipBar trips={trips} activeTripIds={new Set(['trip-1', 'trip-2'])} onToggleTrip={jest.fn()} />
    );

    expect(screen.getByText('北海道旅行')).toBeTruthy();
    expect(screen.getByText('沖縄旅行')).toBeTruthy();
  });

  it('AC-4: trips0件のとき何も描画しない', async () => {
    const result = await render(
      <FilterChipBar trips={[]} activeTripIds={new Set()} onToggleTrip={jest.fn()} />
    );

    expect(result.toJSON()).toBeNull();
  });

  it('AC-5: チップタップでonToggleTripが呼ばれる（API再取得なし）', async () => {
    const onToggleTrip = jest.fn();
    await render(<FilterChipBar trips={trips} activeTripIds={new Set(['trip-1', 'trip-2'])} onToggleTrip={onToggleTrip} />);

    await fireEvent.press(screen.getByText('北海道旅行'));

    expect(onToggleTrip).toHaveBeenCalledWith('trip-1');
    expect(onToggleTrip).toHaveBeenCalledTimes(1);
  });

  it('AC-3/5: activeTripIdsに応じてselected状態が反映される', async () => {
    const { rerender } = await render(
      <FilterChipBar trips={trips} activeTripIds={new Set(['trip-1', 'trip-2'])} onToggleTrip={jest.fn()} />
    );
    expect(screen.getByTestId('filter-chip-trip-1').props.accessibilityState.selected).toBe(true);

    await rerender(<FilterChipBar trips={trips} activeTripIds={new Set(['trip-2'])} onToggleTrip={jest.fn()} />);
    expect(screen.getByTestId('filter-chip-trip-1').props.accessibilityState.selected).toBe(false);
  });
});
