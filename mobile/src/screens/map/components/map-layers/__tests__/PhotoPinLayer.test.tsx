import { render } from '@testing-library/react-native';
import type { Photo } from '../../../../../api/photos';

const mockNavigate = jest.fn();
jest.mock('@react-navigation/native', () => ({
  ...jest.requireActual('@react-navigation/native'),
  useNavigation: () => ({ navigate: mockNavigate }),
}));

import { PhotoPinLayer, buildPhotoFeatureCollection, resolvePhotoPressAction } from '../PhotoPinLayer';

const PHOTO_WITH_THUMBNAIL: Photo = {
  id: 'photo-1',
  tripId: 'trip-1',
  lng: 139.7,
  lat: 35.6,
  locationSource: 'exif',
  takenAt: '2026-01-01T00:00:00Z',
  objectKey: 'photos/1.jpg',
  thumbnailUrl: 'https://example.com/thumb.jpg',
  width: 100,
  height: 100,
};

const PHOTO_WITHOUT_THUMBNAIL: Photo = {
  ...PHOTO_WITH_THUMBNAIL,
  id: 'photo-2',
  thumbnailUrl: null,
};

const PHOTO_WITHOUT_LOCATION: Photo = {
  ...PHOTO_WITH_THUMBNAIL,
  id: 'photo-3',
  lng: null,
  lat: null,
  locationSource: 'unknown',
};

describe('buildPhotoFeatureCollection', () => {
  it('AC-10: サムネありの写真はhasThumbnail=trueのFeatureになる', () => {
    const collection = buildPhotoFeatureCollection([PHOTO_WITH_THUMBNAIL]);
    expect(collection.features).toHaveLength(1);
    expect(collection.features[0].properties).toMatchObject({ photoId: 'photo-1', hasThumbnail: true });
  });

  it('AC-13: サムネなしの写真はhasThumbnail=falseのFeatureになる（デフォルトアイコン表示の判定材料）', () => {
    const collection = buildPhotoFeatureCollection([PHOTO_WITHOUT_THUMBNAIL]);
    expect(collection.features[0].properties).toMatchObject({ photoId: 'photo-2', hasThumbnail: false });
  });

  it('AC-14: 撮影地点不明（lng/latがnull）の写真はFeatureに含めない', () => {
    const collection = buildPhotoFeatureCollection([PHOTO_WITH_THUMBNAIL, PHOTO_WITHOUT_LOCATION]);
    expect(collection.features).toHaveLength(1);
    expect(collection.features[0].properties?.photoId).toBe('photo-1');
  });
});

describe('resolvePhotoPressAction', () => {
  it('個別ピン（cluster未設定）のときindividualアクションを返す', () => {
    const action = resolvePhotoPressAction({
      type: 'Feature',
      geometry: { type: 'Point', coordinates: [139.7, 35.6] },
      properties: { photoId: 'photo-1' },
    });
    expect(action).toEqual({ type: 'individual', photoId: 'photo-1' });
  });

  it('AC-11/12: クラスタ（cluster=true）のときclusterアクションを返す', () => {
    const action = resolvePhotoPressAction({
      type: 'Feature',
      geometry: { type: 'Point', coordinates: [139.7, 35.6] },
      properties: { cluster: true, cluster_id: 5 },
    });
    expect(action).toEqual({ type: 'cluster', clusterId: 5, coordinates: [139.7, 35.6] });
  });

  it('featureが未定義のときnoneを返す', () => {
    expect(resolvePhotoPressAction(undefined)).toEqual({ type: 'none' });
  });
});

describe('PhotoPinLayer', () => {
  afterEach(() => {
    mockNavigate.mockClear();
  });

  it('visible=falseのとき何も描画しない', async () => {
    const result = await render(<PhotoPinLayer photos={[PHOTO_WITH_THUMBNAIL]} visible={false} />);
    expect(result.toJSON()).toBeNull();
  });

  it('描画対象の写真が0件のとき何も描画しない', async () => {
    const result = await render(<PhotoPinLayer photos={[PHOTO_WITHOUT_LOCATION]} visible />);
    expect(result.toJSON()).toBeNull();
  });

  it('AC-15: 個別ピンタップでnavigation.navigate(\'PhotoDetail\', { photoId })が呼ばれる', async () => {
    const { getByTestId } = await render(<PhotoPinLayer photos={[PHOTO_WITH_THUMBNAIL]} visible />);

    const source = getByTestId('mock-maplibre-geojson-source-photo-pin-source');
    const onPress = source.props.onPress as (event: unknown) => void | Promise<void>;
    await onPress({
      nativeEvent: { features: [{ type: 'Feature', geometry: { type: 'Point', coordinates: [139.7, 35.6] }, properties: { photoId: 'photo-1' } }] },
    });

    expect(mockNavigate).toHaveBeenCalledWith('PhotoDetail', { photoId: 'photo-1' });
  });

  it('AC-12: クラスタタップでonClusterExpandが展開ズームとともに呼ばれる（画面遷移はしない）', async () => {
    const onClusterExpand = jest.fn();
    const { getByTestId } = await render(
      <PhotoPinLayer photos={[PHOTO_WITH_THUMBNAIL]} visible onClusterExpand={onClusterExpand} />
    );

    const source = getByTestId('mock-maplibre-geojson-source-photo-pin-source');
    const onPress = source.props.onPress as (event: unknown) => void | Promise<void>;
    await onPress({
      nativeEvent: {
        features: [
          { type: 'Feature', geometry: { type: 'Point', coordinates: [139.7, 35.6] }, properties: { cluster: true, cluster_id: 1 } },
        ],
      },
    });

    expect(mockNavigate).not.toHaveBeenCalled();
    expect(onClusterExpand).toHaveBeenCalledWith([139.7, 35.6], 10);
  });
});
