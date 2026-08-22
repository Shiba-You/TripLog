import { render, screen, fireEvent } from '@testing-library/react-native';

import { ErrorBanner } from '../ErrorBanner';

describe('ErrorBanner', () => {
  it('AC-27: 再試行ボタン付きのエラー表示バナーが描画される', async () => {
    await render(<ErrorBanner onRetry={jest.fn()} />);

    expect(screen.getByTestId('error-banner')).toBeTruthy();
    expect(screen.getByText('再試行')).toBeTruthy();
  });

  it('AC-28: 「再試行」タップでonRetryが呼ばれる', async () => {
    const onRetry = jest.fn();
    await render(<ErrorBanner onRetry={onRetry} />);

    await fireEvent.press(screen.getByText('再試行'));

    expect(onRetry).toHaveBeenCalledTimes(1);
  });
});
