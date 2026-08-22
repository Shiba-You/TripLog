import { render, screen } from '@testing-library/react-native';

import { TrophyBadge } from '../TrophyBadge';

describe('TrophyBadge', () => {
  it('AC-21: totalCount>=1のとき visitedCount/totalCount と coverageRate% を表示する', async () => {
    await render(<TrophyBadge stats={{ visitedCount: 3, totalCount: 10, coverageRate: 30 }} />);

    expect(screen.getByText('3/10（30%）')).toBeTruthy();
  });

  it('AC-22: totalCount=0のとき何も描画しない', async () => {
    const result = await render(<TrophyBadge stats={{ visitedCount: 0, totalCount: 0, coverageRate: 0 }} />);
    expect(result.toJSON()).toBeNull();
  });

  it('statsが未定義のとき何も描画しない', async () => {
    const result = await render(<TrophyBadge stats={undefined} />);
    expect(result.toJSON()).toBeNull();
  });
});
