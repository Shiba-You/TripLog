import { fireEvent, render, screen } from '@testing-library/react-native';

import { TrackingControls } from '../TrackingControls';

describe('TrackingControls', () => {
  it('AC-14: status=recordingのときボタンラベルは「一時停止」でタップでonPauseが呼ばれる', async () => {
    const onPause = jest.fn();
    const onResume = jest.fn();
    const onEndPress = jest.fn();
    await render(<TrackingControls status="recording" onPause={onPause} onResume={onResume} onEndPress={onEndPress} />);

    expect(screen.getByText('一時停止')).toBeTruthy();
    fireEvent.press(screen.getByTestId('tracking-controls-pause-resume'));
    expect(onPause).toHaveBeenCalledTimes(1);
    expect(onResume).not.toHaveBeenCalled();
  });

  it('AC-16: status=pausedのときボタンラベルは「再開」でタップでonResumeが呼ばれる', async () => {
    const onPause = jest.fn();
    const onResume = jest.fn();
    const onEndPress = jest.fn();
    await render(<TrackingControls status="paused" onPause={onPause} onResume={onResume} onEndPress={onEndPress} />);

    expect(screen.getByText('再開')).toBeTruthy();
    fireEvent.press(screen.getByTestId('tracking-controls-pause-resume'));
    expect(onResume).toHaveBeenCalledTimes(1);
    expect(onPause).not.toHaveBeenCalled();
  });

  it('AC-17: 終了ボタンタップでAPI呼び出しに相当する処理なくonEndPressのみが呼ばれる', async () => {
    const onEndPress = jest.fn();
    await render(<TrackingControls status="recording" onPause={jest.fn()} onResume={jest.fn()} onEndPress={onEndPress} />);

    fireEvent.press(screen.getByTestId('tracking-controls-end'));
    expect(onEndPress).toHaveBeenCalledTimes(1);
  });
});
