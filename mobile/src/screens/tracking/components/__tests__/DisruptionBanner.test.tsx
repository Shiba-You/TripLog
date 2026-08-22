import { render, screen } from '@testing-library/react-native';

import { DisruptionBanner } from '../DisruptionBanner';

describe('DisruptionBanner', () => {
  it('AC-21: visible=trueのとき経過分数を反映した文言でバナーが描画される', async () => {
    await render(<DisruptionBanner visible elapsedMinutes={5} />);

    expect(screen.getByText('5分間位置が取得できていません')).toBeTruthy();
  });

  it('AC-21: 経過分数が変わると文言も追随する', async () => {
    await render(<DisruptionBanner visible elapsedMinutes={12} />);

    expect(screen.getByText('12分間位置が取得できていません')).toBeTruthy();
  });

  it('AC-22, AC-25: visible=falseのとき何も描画しない', async () => {
    const result = await render(<DisruptionBanner visible={false} elapsedMinutes={5} />);

    expect(result.toJSON()).toBeNull();
  });
});
