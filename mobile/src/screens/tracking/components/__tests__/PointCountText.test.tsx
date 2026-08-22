import { render, screen } from '@testing-library/react-native';

import { PointCountText } from '../PointCountText';

describe('PointCountText', () => {
  it('AC-9: pointCount>=1のときその数値を表示する', async () => {
    await render(<PointCountText pointCount={42} />);
    expect(screen.getByText('42')).toBeTruthy();
  });

  it('AC-10: pointCount=0のとき0を表示する', async () => {
    await render(<PointCountText pointCount={0} />);
    expect(screen.getByText('0')).toBeTruthy();
  });
});
