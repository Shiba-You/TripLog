import { render, screen } from '@testing-library/react-native';

import { StatusHeader } from '../StatusHeader';

describe('StatusHeader', () => {
  it('AC-2, AC-3, AC-4: status=recordingのとき「記録中」+インジケータ表示+旅行名/色チップ', async () => {
    await render(<StatusHeader status="recording" tripName="京都旅行" tripColor="#E8833A" />);

    expect(screen.getByText('記録中')).toBeTruthy();
    expect(screen.getByTestId('status-header-indicator')).toBeTruthy();
    expect(screen.getByText('京都旅行')).toBeTruthy();
  });

  it('AC-2, AC-3: status=pausedのとき「一時停止中」+インジケータ非表示', async () => {
    await render(<StatusHeader status="paused" tripName="京都旅行" tripColor="#E8833A" />);

    expect(screen.getByText('一時停止中')).toBeTruthy();
    expect(screen.queryByTestId('status-header-indicator')).toBeNull();
  });

  it('AC-4: 旅行色がチップの背景色に反映される', async () => {
    await render(<StatusHeader status="recording" tripName="京都旅行" tripColor="#E8833A" />);

    const chip = screen.getByTestId('status-header-trip-chip');
    const flatStyle = Array.isArray(chip.props.style) ? Object.assign({}, ...chip.props.style) : chip.props.style;
    expect(flatStyle.backgroundColor).toBe('#E8833A');
  });
});
