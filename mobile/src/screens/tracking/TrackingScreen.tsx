// S-002 トラッキング画面。T-6〜T-23で作成したフック・コンポーネントを統合し、
// 記録中/一時停止/断絶警告/終了確認モーダル/圏外ローカル蓄積中の5状態を結線する（AC-1〜AC-25）。
//
// TODO: Dev Build環境が整い次第、実機/シミュレータで位置取得・圏外検知・画面全体の動作を確認する
// （docs/works/mobile_dev_build_setup.md）。
import { useCallback, useEffect, useState } from 'react';
import { ActivityIndicator, ScrollView, StyleSheet, View } from 'react-native';
import type { RouteProp } from '@react-navigation/native';
import type { NativeStackNavigationProp } from '@react-navigation/native-stack';
import { useQueryClient } from '@tanstack/react-query';

import type { RootStackParamList } from '../../navigation/RootNavigator';
import { useTrack, useUpdateTrackStatus, useTrackPoints, trackQueryKey } from '../../api/tracks';
import { useTrips } from '../../api/trips';
import { StatusHeader } from './components/StatusHeader';
import { ElapsedTimeText } from './components/ElapsedTimeText';
import { DistanceText } from './components/DistanceText';
import { PointCountText } from './components/PointCountText';
import { TrackingMapPreview } from './components/TrackingMapPreview';
import { DisruptionBanner } from './components/DisruptionBanner';
import { OfflineBufferIndicator } from './components/OfflineBufferIndicator';
import { TrackingControls } from './components/TrackingControls';
import { EndConfirmModal } from './components/EndConfirmModal';
import { useLocationTracking, type TrackedPosition } from './hooks/useLocationTracking';
import { useNetworkStatus } from './hooks/useNetworkStatus';
import { useTrackPointsBuffer } from './hooks/useTrackPointsBuffer';
import { useTrackPointFlush, FLUSH_BUFFER_SIZE_THRESHOLD } from './hooks/useTrackPointFlush';
import { useDisruptionWarning } from './hooks/useDisruptionWarning';

export interface TrackingScreenProps {
  route: RouteProp<RootStackParamList, 'Tracking'>;
  navigation: NativeStackNavigationProp<RootStackParamList, 'Tracking'>;
}

/** バッファ件数のポーリング間隔。圏外時ローカル蓄積表示・復帰時のクリアをUIへ反映するために使う。 */
const BUFFERED_COUNT_POLL_INTERVAL_MS = 2000;

function extractPointCount(properties: unknown, fallback: number): number {
  if (properties && typeof properties === 'object' && 'pointCount' in properties) {
    const value = (properties as { pointCount?: unknown }).pointCount;
    if (typeof value === 'number') return value;
  }
  return fallback;
}

export default function TrackingScreen({ route, navigation }: TrackingScreenProps) {
  const { trackId } = route.params;
  const queryClient = useQueryClient();

  const trackQuery = useTrack(trackId);
  const tripsQuery = useTrips();
  const pointsQuery = useTrackPoints(trackId);
  const updateStatus = useUpdateTrackStatus();

  const [isEndModalVisible, setEndModalVisible] = useState(false);
  const [currentLocation, setCurrentLocation] = useState<{ lng: number; lat: number } | null>(null);
  const [bufferedCount, setBufferedCount] = useState(0);

  const status = trackQuery.data?.status === 'paused' ? 'paused' : 'recording';
  const isRecording = trackQuery.data?.status === 'recording';

  const buffer = useTrackPointsBuffer(trackId);
  const network = useNetworkStatus();
  const flush = useTrackPointFlush({ trackId, enabled: isRecording, isConnected: network.isConnected, buffer });
  const { flush: flushPoints } = flush;

  const handlePosition = useCallback(
    (position: TrackedPosition) => {
      setCurrentLocation({ lng: position.lng, lat: position.lat });
      void (async () => {
        await buffer.addPoint(position);
        const count = await buffer.count();
        setBufferedCount(count);
        if (count >= FLUSH_BUFFER_SIZE_THRESHOLD) {
          void flushPoints();
        }
      })();
    },
    [buffer, flushPoints]
  );

  const locationTracking = useLocationTracking({ enabled: isRecording, onPosition: handlePosition });

  // AC-23, AC-24: 圏外時のローカル蓄積件数表示・ネットワーク復帰後の自動フラッシュ結果を反映するため、
  // 記録中の間はバッファ件数を定期的に読み直す。
  useEffect(() => {
    if (!isRecording) return;
    let cancelled = false;
    const refresh = async () => {
      const count = await buffer.count();
      if (!cancelled) setBufferedCount(count);
    };
    void refresh();
    const intervalId = setInterval(refresh, BUFFERED_COUNT_POLL_INTERVAL_MS);
    return () => {
      cancelled = true;
      clearInterval(intervalId);
    };
  }, [isRecording, buffer]);

  const disruption = useDisruptionWarning(locationTracking.lastGpsFixAt, network.isConnected, status);

  const handlePause = () => {
    updateStatus.mutate(
      { trackId, status: 'paused' },
      { onSuccess: (updated) => queryClient.setQueryData(trackQueryKey(trackId), updated) }
    );
  };

  const handleResume = () => {
    updateStatus.mutate(
      { trackId, status: 'recording' },
      { onSuccess: (updated) => queryClient.setQueryData(trackQueryKey(trackId), updated) }
    );
  };

  const handleEndConfirm = () => {
    updateStatus.mutate(
      { trackId, status: 'finished' },
      {
        onSuccess: (updated) => {
          queryClient.setQueryData(trackQueryKey(trackId), updated);
          setEndModalVisible(false);
          navigation.navigate('TripDetail', { tripId: updated.tripId });
        },
      }
    );
  };

  if (!trackQuery.data) {
    return (
      <View style={styles.centerContainer} testID="tracking-screen-loading">
        <ActivityIndicator size="large" />
      </View>
    );
  }

  const track = trackQuery.data;
  const trip = tripsQuery.data?.find((t) => t.id === track.tripId);
  const coordinates = (pointsQuery.data?.geometry?.coordinates as number[][] | undefined) ?? [];
  const pointCount = extractPointCount(pointsQuery.data?.properties, track.pointCount);

  return (
    <ScrollView style={styles.container} testID="tracking-screen">
      <StatusHeader status={status} tripName={trip?.name ?? ''} tripColor={trip?.color ?? '#9CA3AF'} />
      <TrackingMapPreview currentLocation={currentLocation} coordinates={coordinates} tripColor={trip?.color ?? '#9CA3AF'} />
      <View style={styles.statsRow}>
        <ElapsedTimeText startedAt={track.startedAt} />
        <DistanceText coordinates={coordinates as Array<[number, number]>} />
        <PointCountText pointCount={pointCount} />
      </View>
      <DisruptionBanner visible={disruption.isWarningVisible} elapsedMinutes={disruption.elapsedMinutes} />
      <OfflineBufferIndicator isConnected={network.isConnected} bufferedCount={bufferedCount} />
      <TrackingControls status={status} onPause={handlePause} onResume={handleResume} onEndPress={() => setEndModalVisible(true)} />
      <EndConfirmModal visible={isEndModalVisible} onConfirm={handleEndConfirm} onCancel={() => setEndModalVisible(false)} />
    </ScrollView>
  );
}

const styles = StyleSheet.create({
  container: { flex: 1 },
  centerContainer: { flex: 1, alignItems: 'center', justifyContent: 'center' },
  statsRow: { flexDirection: 'row', justifyContent: 'space-around', padding: 12 },
});
