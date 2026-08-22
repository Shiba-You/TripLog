import { render, screen, fireEvent } from '@testing-library/react-native';
import * as Linking from 'expo-linking';

import { LocationPermissionBanner } from '../LocationPermissionBanner';

jest.mock('expo-linking', () => ({
  openSettings: jest.fn().mockResolvedValue(undefined),
}));

describe('LocationPermissionBanner', () => {
  afterEach(() => {
    jest.clearAllMocks();
  });

  it('AC-19: 許可なしのとき警告文言と設定を開くボタンを表示する', async () => {
    await render(<LocationPermissionBanner isPermissionGranted={false} />);

    expect(screen.getByText('位置情報を許可してください')).toBeTruthy();
    expect(screen.getByText('設定を開く')).toBeTruthy();
  });

  it('AC-19: 許可ありのとき何も描画しない', async () => {
    const result = await render(<LocationPermissionBanner isPermissionGranted={true} />);
    expect(result.toJSON()).toBeNull();
  });

  it('AC-20: 「設定を開く」タップでLinking.openSettingsが呼ばれる', async () => {
    await render(<LocationPermissionBanner isPermissionGranted={false} />);

    await fireEvent.press(screen.getByTestId('location-permission-banner-open-settings'));

    expect(Linking.openSettings).toHaveBeenCalledTimes(1);
  });
});
