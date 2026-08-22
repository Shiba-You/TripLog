import { render, screen } from '@testing-library/react-native';

import { OfflineBufferIndicator } from '../OfflineBufferIndicator';

describe('OfflineBufferIndicator', () => {
  it('AC-23: isConnected=falseのとき件数に応じた文言が描画される', async () => {
    await render(<OfflineBufferIndicator isConnected={false} bufferedCount={7} />);

    expect(screen.getByText('圏外: ローカルに7件保存中')).toBeTruthy();
  });

  it('AC-24: 件数propの増減に応じて表示が更新される', async () => {
    const { rerender } = await render(<OfflineBufferIndicator isConnected={false} bufferedCount={3} />);
    expect(screen.getByText('圏外: ローカルに3件保存中')).toBeTruthy();

    await rerender(<OfflineBufferIndicator isConnected={false} bufferedCount={9} />);
    expect(screen.getByText('圏外: ローカルに9件保存中')).toBeTruthy();
  });

  it('AC-25: isConnected=trueのとき何も描画しない', async () => {
    const result = await render(<OfflineBufferIndicator isConnected bufferedCount={7} />);

    expect(result.toJSON()).toBeNull();
  });

  it('isConnectedがnull（未解決）のときも描画しない', async () => {
    const result = await render(<OfflineBufferIndicator isConnected={null} bufferedCount={0} />);

    expect(result.toJSON()).toBeNull();
  });
});
