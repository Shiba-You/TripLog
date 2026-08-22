// AC-10, AC-11, AC-12, AC-13, AC-14, AC-15: 写真ピンレイヤー（クラスタリング対応）。
// `GeoJSONSource` の `cluster` プロパティ（MapLibre標準デフォルトのradius/zoom、上書きしない）で
// クラスタリングする（AC-11、2026-08-11ユーザー回答Q2）。
// - サムネあり: 個別サムネピン（AC-10）
// - サムネなし（thumbnailUrlがnull）: デフォルトアイコンピン（AC-13）
// - geomがnull（lng/latがnull）: 描画対象から除外（AC-14。usePhotos側のhasLocation=trueで
//   既にAPIレスポンスから除外される想定だが、本コンポーネントでも防御的に除外する）
// - クラスタタップ: ズームイン展開（画面遷移なし、AC-12）。展開ズームの取得までを本コンポーネントが担い、
//   実際のカメラ移動は呼び出し元（MapScreen）が `onClusterExpand` 経由で行う。
// - 個別ピンタップ: `navigation.navigate('PhotoDetail', { photoId })`（AC-15）
//
// TODO: Dev Build環境が整い次第、実機/シミュレータで密集ピンのクラスタ化・タップ時の
// ズームイン展開を確認する。
import { useRef } from 'react';
import type { NativeSyntheticEvent } from 'react-native';
import { GeoJSONSource, Layer } from '@maplibre/maplibre-react-native';
import type { GeoJSONSourceRef } from '@maplibre/maplibre-react-native';
import { useNavigation } from '@react-navigation/native';
import type { NativeStackNavigationProp } from '@react-navigation/native-stack';
import type { Feature, FeatureCollection, Point } from 'geojson';

import type { RootStackParamList } from '../../../../navigation/RootNavigator';
import type { Photo } from '../../../../api/photos';

export interface PhotoPinLayerProps {
  photos: Photo[];
  visible: boolean;
  /** AC-12: クラスタタップ後、展開先ズームレベルが取得できた際に呼ばれる（カメラ移動はMapScreen側の責務） */
  onClusterExpand?: (coordinate: [number, number], zoomLevel: number) => void;
}

export function buildPhotoFeatureCollection(photos: Photo[]): FeatureCollection<Point> {
  const features: Feature<Point>[] = photos
    // AC-14: 撮影地点不明（lng/latがnull）の写真はピンとして表示しない。
    .filter((photo) => photo.lng != null && photo.lat != null)
    .map((photo) => ({
      type: 'Feature',
      geometry: { type: 'Point', coordinates: [photo.lng as number, photo.lat as number] },
      properties: {
        photoId: photo.id,
        hasThumbnail: photo.thumbnailUrl != null,
        thumbnailUrl: photo.thumbnailUrl,
      },
    }));
  return { type: 'FeatureCollection', features };
}

export type PhotoPressAction =
  | { type: 'individual'; photoId: string }
  | { type: 'cluster'; clusterId: number; coordinates: [number, number] }
  | { type: 'none' };

export function resolvePhotoPressAction(feature: Feature | undefined): PhotoPressAction {
  if (!feature) return { type: 'none' };
  const properties = (feature.properties ?? {}) as Record<string, unknown>;
  if (properties.cluster === true) {
    const point = feature.geometry.type === 'Point' ? feature.geometry.coordinates : [0, 0];
    const coordinates: [number, number] = [point[0] ?? 0, point[1] ?? 0];
    return { type: 'cluster', clusterId: Number(properties.cluster_id), coordinates };
  }
  const photoId = properties.photoId;
  if (typeof photoId === 'string') {
    return { type: 'individual', photoId };
  }
  return { type: 'none' };
}

export function PhotoPinLayer({ photos, visible, onClusterExpand }: PhotoPinLayerProps) {
  const navigation = useNavigation<NativeStackNavigationProp<RootStackParamList>>();
  const sourceRef = useRef<GeoJSONSourceRef>(null);

  if (!visible) return null;

  const collection = buildPhotoFeatureCollection(photos);
  if (collection.features.length === 0) return null;

  const handlePress = async (event: NativeSyntheticEvent<{ features: Feature[] }>) => {
    const action = resolvePhotoPressAction(event.nativeEvent.features?.[0]);
    if (action.type === 'individual') {
      navigation.navigate('PhotoDetail', { photoId: action.photoId });
    } else if (action.type === 'cluster') {
      const zoomLevel = await sourceRef.current?.getClusterExpansionZoom(action.clusterId);
      if (typeof zoomLevel === 'number') {
        onClusterExpand?.(action.coordinates, zoomLevel);
      }
    }
  };

  return (
    <GeoJSONSource
      ref={sourceRef}
      id="photo-pin-source"
      data={collection}
      cluster
      onPress={handlePress as never}
    >
      <Layer
        id="photo-pin-cluster-circle"
        type="circle"
        filter={['has', 'point_count']}
        paint={{ 'circle-color': '#2563EB', 'circle-radius': 16, 'circle-opacity': 0.85 }}
      />
      <Layer
        id="photo-pin-cluster-count"
        type="symbol"
        filter={['has', 'point_count']}
        layout={{ 'text-field': ['get', 'point_count_abbreviated'], 'text-size': 12 }}
        paint={{ 'text-color': '#FFFFFF' }}
      />
      <Layer
        id="photo-pin-individual"
        type="circle"
        filter={['!', ['has', 'point_count']]}
        paint={{
          'circle-color': ['case', ['get', 'hasThumbnail'], '#F59E0B', '#9CA3AF'],
          'circle-radius': 10,
          'circle-stroke-width': 2,
          'circle-stroke-color': '#FFFFFF',
        }}
      />
    </GeoJSONSource>
  );
}
