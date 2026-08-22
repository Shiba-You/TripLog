import { render, screen } from '@testing-library/react-native';

import { DistanceText } from '../DistanceText';

describe('DistanceText', () => {
  it('AC-7: 座標2点以上のとき算出距離が小数第1位のX.Xkm形式で表示される', async () => {
    await render(
      <DistanceText
        coordinates={[
          [139.0, 35.0],
          [139.1, 35.0],
        ]}
      />
    );
    expect(screen.getByTestId('distance-text').props.children).toMatch(/^\d+\.\dkm$/);
  });

  it('AC-8: 座標0点のとき0.0kmを表示する', async () => {
    await render(<DistanceText coordinates={[]} />);
    expect(screen.getByText('0.0km')).toBeTruthy();
  });

  it('AC-8: 座標1点のとき0.0kmを表示する', async () => {
    await render(<DistanceText coordinates={[[139.0, 35.0]]} />);
    expect(screen.getByText('0.0km')).toBeTruthy();
  });

  it('AC-8: 座標がnull/undefinedのとき0.0kmを表示する', async () => {
    await render(<DistanceText coordinates={null} />);
    expect(screen.getByText('0.0km')).toBeTruthy();
  });
});
