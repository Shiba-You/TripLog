// AC-18, AC-19: 現在地ピン。
// 位置情報許可あり（AC-17）かつ現在地が取得できている場合のみ表示する。
// 許可なし時はAC-19の通り非表示（代わりにLocationPermissionBannerを表示、こちらはMapScreen側の責務）。
//
// TODO: Dev Build環境が整い次第、実機/シミュレータで現在地ピンの描画位置を確認する。
import { StyleSheet, View } from 'react-native';
import { Marker } from '@maplibre/maplibre-react-native';

export interface CurrentLocationMarkerProps {
  location: { lng: number; lat: number } | null;
  isPermissionGranted: boolean;
}

export function CurrentLocationMarker({ location, isPermissionGranted }: CurrentLocationMarkerProps) {
  // AC-19: 許可なしのとき非表示。現在地未取得のときも表示しようがないため非表示。
  if (!isPermissionGranted || !location) return null;

  return (
    <Marker id="current-location-marker" lngLat={[location.lng, location.lat]}>
      <View style={styles.dot} />
    </Marker>
  );
}

const styles = StyleSheet.create({
  dot: {
    width: 14,
    height: 14,
    borderRadius: 7,
    backgroundColor: '#2563EB',
    borderWidth: 2,
    borderColor: '#FFFFFF',
  },
});
