// S-001 マップ（ホーム）画面。
// T-16〜T-31で作成したフック・コンポーネントを統合し、「ローディング／エラー／データ空／通常」の
// 4状態遷移（AC-25,26）、初期表示フロー（AC-1、AC-36）、各操作（フィルタ・レイヤートグル・
// 写真ピン・FAB・タブ・位置許可バナー・エラー再試行）を結線する。
//
// TODO: Dev Build環境が整い次第、実機/シミュレータで画面全体の動作（地図描画・現在地・タップ操作）を
// 確認する（docs/works/mobile_dev_build_setup.md）。
import { useEffect, useState } from 'react';
import { ActivityIndicator, Pressable, StyleSheet, Text, View } from 'react-native';
import { Map, Camera } from '@maplibre/maplibre-react-native';
import { useNavigation } from '@react-navigation/native';
import type { NativeStackNavigationProp } from '@react-navigation/native-stack';

import type { RootStackParamList } from '../../navigation/RootNavigator';
import { useLocationPermission } from './hooks/useLocationPermission';
import { useMapScreenQueries } from './hooks/useMapScreenQueries';
import { useInitialViewport } from './hooks/useInitialViewport';
import { getMapStyleUrl } from './mapStyle';
import { FilterChipBar } from './components/FilterChipBar';
import { LayerToggleControl, DEFAULT_LAYER_VISIBILITY, type LayerKey } from './components/LayerToggleControl';
import { TrophyBadge } from './components/TrophyBadge';
import { LocationPermissionBanner } from './components/LocationPermissionBanner';
import { EmptyStateCta } from './components/EmptyStateCta';
import { ErrorBanner } from './components/ErrorBanner';
import { TripSelectionDialog } from './components/TripSelectionDialog';
import { RoutePolylineLayer } from './components/map-layers/RoutePolylineLayer';
import { VisitedRegionFillLayer } from './components/map-layers/VisitedRegionFillLayer';
import { PhotoPinLayer } from './components/map-layers/PhotoPinLayer';
import { CurrentLocationMarker } from './components/map-layers/CurrentLocationMarker';

export default function MapScreen() {
  const navigation = useNavigation<NativeStackNavigationProp<RootStackParamList>>();

  // AC-16, AC-17, AC-18, AC-36
  const { isPermissionGranted, currentLocation } = useLocationPermission();

  // AC-25〜28: trips/coverage/tracks・points/photosを集約したローディング/エラー/データ空/通常の4状態
  const { state, trips, coverage, photos, routes, trackPointFeatures, retry } =
    useMapScreenQueries(currentLocation);

  // AC-36: 地図初期表示範囲のフォールバック
  const viewport = useInitialViewport(currentLocation, trackPointFeatures);

  // AC-3: フィルタチップ・レイヤートグルは初期状態ですべてON。画面ローカルstate、API再取得なし。
  // tripsはAPI応答が返るまで空配列のため、初回に1件以上そろった時点で一度だけ全ONに初期化する。
  // 以降はユーザー操作（toggleTrip）のみが状態を変える。
  const [activeTripIds, setActiveTripIds] = useState<Set<string> | null>(null);
  const [layerVisibility, setLayerVisibility] = useState(DEFAULT_LAYER_VISIBILITY);
  const [isTripSelectionVisible, setTripSelectionVisible] = useState(false);

  useEffect(() => {
    if (activeTripIds === null && trips.length > 0) {
      setActiveTripIds(new Set(trips.map((t) => t.id)));
    }
  }, [trips, activeTripIds]);

  const effectiveActiveTripIds = activeTripIds ?? new Set(trips.map((t) => t.id));

  const toggleTrip = (tripId: string) => {
    setActiveTripIds((prev) => {
      const base = prev ?? new Set(trips.map((t) => t.id));
      const next = new Set(base);
      if (next.has(tripId)) {
        next.delete(tripId);
      } else {
        next.add(tripId);
      }
      return next;
    });
  };

  const toggleLayer = (layer: LayerKey) => {
    setLayerVisibility((prev) => ({ ...prev, [layer]: !prev[layer] }));
  };

  const isChromeVisible = state === 'normal' || state === 'empty';
  const filteredRoutes = routes.filter((route) => effectiveActiveTripIds.has(route.tripId));
  const filteredPhotos = (photos ?? []).filter((photo) => effectiveActiveTripIds.has(photo.tripId));

  const cameraInitialViewState =
    viewport.kind === 'currentLocation'
      ? { center: [viewport.center.lng, viewport.center.lat] as [number, number], zoom: viewport.zoomLevel }
      : { bounds: viewport.bounds };

  const handleCreateTrip = () => {
    // AC-24: 'TripList' はタブナビゲーター側のルートでありRootStackParamListには含まれないが、
    // React Navigationはルート名で親ナビゲーターを遡って解決するため実行時には問題なく遷移できる。
    // 型定義上はスタック単位のnavigation propしか持てないため、ここでは意図的にキャストする。
    (navigation as unknown as { navigate: (name: string, params?: object) => void }).navigate('TripList', {
      openCreateModal: true,
    });
  };

  const handleTrackStarted = (trackId: string) => {
    setTripSelectionVisible(false);
    navigation.navigate('Tracking', { trackId });
  };

  return (
    <View style={styles.container}>
      <Map style={styles.map} mapStyle={getMapStyleUrl()}>
        <Camera initialViewState={cameraInitialViewState} />
        {isChromeVisible && layerVisibility.route && <RoutePolylineLayer routes={filteredRoutes} visible />}
        {isChromeVisible && layerVisibility.visitedRegion && (
          <VisitedRegionFillLayer geojson={coverage?.geojson} visible />
        )}
        {isChromeVisible && layerVisibility.photos && <PhotoPinLayer photos={filteredPhotos} visible />}
        <CurrentLocationMarker location={currentLocation} isPermissionGranted={isPermissionGranted} />
      </Map>

      <View style={styles.topOverlay} pointerEvents="box-none">
        {isChromeVisible && (
          <FilterChipBar trips={trips} activeTripIds={effectiveActiveTripIds} onToggleTrip={toggleTrip} />
        )}
        {/* AC-19: ローディング/エラー状態とは独立して権限状態のみに基づいて表示される */}
        <LocationPermissionBanner isPermissionGranted={isPermissionGranted} />
      </View>

      {isChromeVisible && (
        <View style={styles.trophyOverlay} pointerEvents="box-none">
          <TrophyBadge stats={coverage?.stats} />
        </View>
      )}

      {isChromeVisible && (
        <View style={styles.layerToggleOverlay} pointerEvents="box-none">
          <LayerToggleControl visibility={layerVisibility} onToggle={toggleLayer} />
        </View>
      )}

      {state === 'loading' && (
        <View style={styles.centerOverlay} testID="map-screen-loading">
          <ActivityIndicator size="large" />
        </View>
      )}

      {state === 'error' && (
        <View style={styles.centerOverlay}>
          <ErrorBanner onRetry={retry} />
        </View>
      )}

      {state === 'empty' && (
        <View style={styles.emptyOverlay} pointerEvents="box-none">
          <EmptyStateCta tripsCount={trips.length} onCreateTrip={handleCreateTrip} />
        </View>
      )}

      {isChromeVisible && (
        <Pressable
          onPress={() => setTripSelectionVisible(true)}
          accessibilityRole="button"
          testID="map-screen-fab"
          style={styles.fab}
        >
          <Text style={styles.fabText}>+</Text>
        </Pressable>
      )}

      <TripSelectionDialog
        visible={isTripSelectionVisible}
        onClose={() => setTripSelectionVisible(false)}
        onStarted={handleTrackStarted}
        onCreateNew={() => {
          setTripSelectionVisible(false);
          handleCreateTrip();
        }}
      />
    </View>
  );
}

const styles = StyleSheet.create({
  container: { flex: 1 },
  map: { flex: 1 },
  topOverlay: { position: 'absolute', top: 0, left: 0, right: 0 },
  trophyOverlay: { position: 'absolute', top: 8, right: 8 },
  layerToggleOverlay: { position: 'absolute', bottom: 96, left: 0, right: 0, alignItems: 'center' },
  centerOverlay: {
    position: 'absolute',
    top: 0,
    left: 0,
    right: 0,
    bottom: 0,
    alignItems: 'center',
    justifyContent: 'center',
  },
  emptyOverlay: {
    position: 'absolute',
    top: 0,
    left: 0,
    right: 0,
    bottom: 0,
    alignItems: 'center',
    justifyContent: 'center',
    padding: 24,
  },
  fab: {
    position: 'absolute',
    bottom: 24,
    right: 24,
    width: 56,
    height: 56,
    borderRadius: 28,
    backgroundColor: '#2563EB',
    alignItems: 'center',
    justifyContent: 'center',
    elevation: 4,
  },
  fabText: { color: '#FFFFFF', fontSize: 28, lineHeight: 30 },
});
