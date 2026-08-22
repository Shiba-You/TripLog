import { render, screen, fireEvent } from '@testing-library/react-native';

import { LayerToggleControl, DEFAULT_LAYER_VISIBILITY } from '../LayerToggleControl';

describe('LayerToggleControl', () => {
  it('AC-3: 初期状態で3つとも ON (checked=true) 表示される', async () => {
    await render(<LayerToggleControl visibility={DEFAULT_LAYER_VISIBILITY} onToggle={jest.fn()} />);

    expect(screen.getByTestId('layer-toggle-photos').props.accessibilityState.checked).toBe(true);
    expect(screen.getByTestId('layer-toggle-route').props.accessibilityState.checked).toBe(true);
    expect(screen.getByTestId('layer-toggle-visitedRegion').props.accessibilityState.checked).toBe(true);
  });

  it.each([
    ['photos', 'AC-29'],
    ['route', 'AC-30'],
    ['visitedRegion', 'AC-31'],
  ])('%s タップでonToggleが呼ばれる（%s）', async (key) => {
    const onToggle = jest.fn();
    await render(<LayerToggleControl visibility={DEFAULT_LAYER_VISIBILITY} onToggle={onToggle} />);

    await fireEvent.press(screen.getByTestId(`layer-toggle-${key}`));

    expect(onToggle).toHaveBeenCalledWith(key);
  });

  it('visibility propに応じてchecked状態が反映される（OFF表示）', async () => {
    await render(
      <LayerToggleControl visibility={{ photos: false, route: true, visitedRegion: true }} onToggle={jest.fn()} />
    );

    expect(screen.getByTestId('layer-toggle-photos').props.accessibilityState.checked).toBe(false);
  });
});
