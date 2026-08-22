// AC-25, AC-26, AC-27, AC-28: trips/coverage/tracks・points/photosのreact-query結果を集約し、
// 「ローディング／エラー／データ空／通常」の4状態に解決する。
//
// データフロー（plan.md「初期表示」節）:
//   1. useTrips / useCoverage を並行実行
//   2. tripsが解決したら、各旅行の GET /api/trips/{tripId}/tracks を（useQueriesで）並行実行
//      （フィルタON/OFFに関わらず全旅行分を取得する。フィルタはクライアント側描画のみに影響、AC-5）
//   3. 各trackが解決したら、各trackの GET /api/tracks/{trackId}/points を（useQueriesで）並行実行
//   4. すべてのtrack_pointsが解決したら、AC-36の優先順位で初期表示範囲を確定しbboxを算出、
//      それを使って GET /api/photos を実行
//   5. 上記すべてが成功: trips 0件なら'empty'、1件以上なら'normal'
//     いずれかが通信エラー/5xxで失敗: 即座に'error'
//     まだ完了していないもの（trips/coverage/tracks/points/photosいずれか）がある: 'loading'
// react-queryの`retry`は無効化し（App.tsx/QueryClientのdefaultOptions）、
// AC-28の「再試行」操作でのみ失敗クエリを`refetch`する。
import { useMemo } from 'react';
import { useQueries } from '@tanstack/react-query';

import { useTrips, type Trip } from '../../../api/trips';
import { useCoverage } from '../../../api/coverage';
import { usePhotos, type Bbox } from '../../../api/photos';
import { tripTracksQueryKey, fetchTripTracks, trackPointsQueryKey, fetchTrackPoints } from '../../../api/tracks';
import { computeInitialViewport, viewportToBbox, type LngLat, type TrackPointsLike } from './useInitialViewport';
import type { RouteEntry } from '../components/map-layers/RoutePolylineLayer';

export type MapScreenState = 'loading' | 'error' | 'empty' | 'normal';

/**
 * 表示用の簡略化許容誤差(m)。plan.mdの非機能要件「ズームレベルに応じた間引き描画」を
 * 満たす具体的なアルゴリズム（実際のカメラズームに連動した動的な値）は、実機のカメラ
 * イベントに依存するためDev Build環境確認後の改善事項とし、本タスクでは固定値を用いる
 * （要確認事項として完了報告に明記）。
 */
const DEFAULT_SIMPLIFY_TOLERANCE_M = 20;

export interface UseMapScreenQueriesResult {
  state: MapScreenState;
  trips: Trip[];
  coverage: ReturnType<typeof useCoverage>['data'];
  photos: ReturnType<typeof usePhotos>['data'];
  routes: RouteEntry[];
  trackPointFeatures: TrackPointsLike[];
  /** AC-28: 失敗しているクエリのみ再試行する */
  retry: () => void;
}

export function useMapScreenQueries(currentLocation: LngLat | null): UseMapScreenQueriesResult {
  const tripsQuery = useTrips();
  const coverageQuery = useCoverage();

  const trips = useMemo(() => tripsQuery.data ?? [], [tripsQuery.data]);

  const tracksQueries = useQueries({
    queries: trips.map((trip) => ({
      queryKey: tripTracksQueryKey(trip.id),
      queryFn: () => fetchTripTracks(trip.id),
      enabled: tripsQuery.isSuccess,
      retry: false as const,
    })),
  });

  const tracksSettled = tracksQueries.every((q) => q.isSuccess || q.isError);

  const tracksWithMeta = useMemo(
    () =>
      trips.flatMap((trip, index) =>
        (tracksQueries[index]?.data ?? []).map((track) => ({ id: track.id, tripId: trip.id, color: trip.color }))
      ),
    // tracksQueriesはuseQueriesの結果配列（毎レンダー新しい参照）のため、
    // 実質的な入力である trips と各クエリのdata/statusのみを依存に含める。
    // eslint-disable-next-line react-hooks/exhaustive-deps
    [trips, tracksQueries.map((q) => q.data).join(','), tracksQueries.map((q) => q.status).join(',')]
  );

  const pointsQueries = useQueries({
    queries: tracksWithMeta.map((track) => ({
      queryKey: trackPointsQueryKey(track.id, DEFAULT_SIMPLIFY_TOLERANCE_M),
      queryFn: () => fetchTrackPoints(track.id, DEFAULT_SIMPLIFY_TOLERANCE_M),
      retry: false as const,
    })),
  });

  const pointsSettled = pointsQueries.every((q) => q.isSuccess || q.isError);

  const trackPointFeatures: TrackPointsLike[] = useMemo(
    () => pointsQueries.map((q) => q.data).filter((d): d is NonNullable<typeof d> => Boolean(d)),
    // eslint-disable-next-line react-hooks/exhaustive-deps
    [pointsQueries.map((q) => q.data).join(',')]
  );

  // AC-36: 初期表示範囲が確定して初めてbbox（写真取得範囲）が定まる。
  const viewportReady = tripsQuery.isSuccess && tracksSettled && pointsSettled;
  const viewport = useMemo(
    () => (viewportReady ? computeInitialViewport(currentLocation, trackPointFeatures) : undefined),
    [viewportReady, currentLocation, trackPointFeatures]
  );
  const photosBbox: Bbox | undefined = useMemo(() => {
    if (!viewport) return undefined;
    const [minLng, minLat, maxLng, maxLat] = viewportToBbox(viewport);
    return { minLng, minLat, maxLng, maxLat };
  }, [viewport]);

  const photosQuery = usePhotos(photosBbox, true);

  const routes: RouteEntry[] = useMemo(
    () =>
      tracksWithMeta.map((track, index) => ({
        tripId: track.tripId,
        color: track.color,
        feature: pointsQueries[index]?.data,
      })),
    // eslint-disable-next-line react-hooks/exhaustive-deps
    [tracksWithMeta, pointsQueries.map((q) => q.data).join(',')]
  );

  const hasError =
    tripsQuery.isError ||
    coverageQuery.isError ||
    tracksQueries.some((q) => q.isError) ||
    pointsQueries.some((q) => q.isError) ||
    photosQuery.isError;

  const allSettled =
    tripsQuery.isSuccess &&
    coverageQuery.isSuccess &&
    tracksSettled &&
    pointsSettled &&
    (photosBbox === undefined || photosQuery.isSuccess);

  let state: MapScreenState;
  if (hasError) {
    state = 'error';
  } else if (!allSettled) {
    state = 'loading';
  } else if (trips.length === 0) {
    state = 'empty';
  } else {
    state = 'normal';
  }

  const retry = () => {
    if (tripsQuery.isError) void tripsQuery.refetch();
    if (coverageQuery.isError) void coverageQuery.refetch();
    tracksQueries.forEach((q) => {
      if (q.isError) void q.refetch();
    });
    pointsQueries.forEach((q) => {
      if (q.isError) void q.refetch();
    });
    if (photosQuery.isError) void photosQuery.refetch();
  };

  return {
    state,
    trips,
    coverage: coverageQuery.data,
    photos: photosQuery.data,
    routes,
    trackPointFeatures,
    retry,
  };
}
