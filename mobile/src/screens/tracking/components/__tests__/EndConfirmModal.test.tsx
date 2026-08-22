import { fireEvent, render, screen } from '@testing-library/react-native';

import { EndConfirmModal } from '../EndConfirmModal';

describe('EndConfirmModal', () => {
  it('AC-17: visible=trueのとき見出しと2ボタンが表示される', async () => {
    await render(<EndConfirmModal visible onConfirm={jest.fn()} onCancel={jest.fn()} />);

    expect(screen.getByText('トラッキングを終了しますか')).toBeTruthy();
    expect(screen.getByText('終了する')).toBeTruthy();
    expect(screen.getByText('キャンセル')).toBeTruthy();
  });

  it('visible=falseのとき何も描画しない', async () => {
    const result = await render(<EndConfirmModal visible={false} onConfirm={jest.fn()} onCancel={jest.fn()} />);
    expect(result.toJSON()).toBeNull();
  });

  it('AC-18: 「終了する」タップでonConfirmが呼ばれる', async () => {
    const onConfirm = jest.fn();
    await render(<EndConfirmModal visible onConfirm={onConfirm} onCancel={jest.fn()} />);

    fireEvent.press(screen.getByTestId('end-confirm-modal-confirm'));
    expect(onConfirm).toHaveBeenCalledTimes(1);
  });

  it('AC-19: 「キャンセル」タップでonConfirmは呼ばれずonCancelのみ呼ばれる', async () => {
    const onConfirm = jest.fn();
    const onCancel = jest.fn();
    await render(<EndConfirmModal visible onConfirm={onConfirm} onCancel={onCancel} />);

    fireEvent.press(screen.getByTestId('end-confirm-modal-cancel'));
    expect(onCancel).toHaveBeenCalledTimes(1);
    expect(onConfirm).not.toHaveBeenCalled();
  });
});
