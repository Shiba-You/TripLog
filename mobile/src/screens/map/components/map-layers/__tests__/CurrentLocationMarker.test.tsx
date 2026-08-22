import { render } from '@testing-library/react-native';

import { CurrentLocationMarker } from '../CurrentLocationMarker';

describe('CurrentLocationMarker', () => {
  it('AC-18: 許可ありかつ現在地取得済みのとき現在地ピンを描画する', async () => {
    const { getByTestId } = await render(
      <CurrentLocationMarker location={{ lng: 139.7, lat: 35.6 }} isPermissionGranted />
    );
    expect(getByTestId('mock-maplibre-marker-current-location-marker')).toBeTruthy();
  });

  it('AC-19: 許可なしのとき描画しない', async () => {
    const result = await render(
      <CurrentLocationMarker location={{ lng: 139.7, lat: 35.6 }} isPermissionGranted={false} />
    );
    expect(result.toJSON()).toBeNull();
  });

  it('許可ありでも現在地が未取得（null）のとき描画しない', async () => {
    const result = await render(<CurrentLocationMarker location={null} isPermissionGranted />);
    expect(result.toJSON()).toBeNull();
  });
});
