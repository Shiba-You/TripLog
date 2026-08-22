import { render, screen, fireEvent } from '@testing-library/react-native';

import { EmptyStateCta } from '../EmptyStateCta';

describe('EmptyStateCta', () => {
  it('AC-23: trips0件のとき「最初の旅行を作る」ボタンを含むカードが表示される', async () => {
    await render(<EmptyStateCta tripsCount={0} onCreateTrip={jest.fn()} />);

    expect(screen.getByText('最初の旅行を作る')).toBeTruthy();
  });

  it('tripsが1件以上のとき何も描画しない', async () => {
    const result = await render(<EmptyStateCta tripsCount={2} onCreateTrip={jest.fn()} />);
    expect(result.toJSON()).toBeNull();
  });

  it('AC-24: ボタンタップでonCreateTripが呼ばれる', async () => {
    const onCreateTrip = jest.fn();
    await render(<EmptyStateCta tripsCount={0} onCreateTrip={onCreateTrip} />);

    await fireEvent.press(screen.getByText('最初の旅行を作る'));

    expect(onCreateTrip).toHaveBeenCalledTimes(1);
  });
});
