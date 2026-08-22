// GET /api/trips/{tripId}/tracks, GET /api/tracks/{trackId}/points, POST /api/trips/{tripId}/tracks
// を呼ぶreact-queryフック/ミューテーション（AC-6, AC-7, AC-33, AC-36）。
// S-002 T-6: GET/PATCH /api/tracks/{trackId}, POST /api/tracks/{trackId}/points を追加
// （AC-1, AC-2, AC-4, AC-5, AC-6, AC-13, AC-14, AC-16, AC-18, AC-24）。
import { useMutation, useQuery, useQueryClient } from '@tanstack/react-query';
import {
  trackSchema,
  tracksResponseSchema,
  trackPointsFeatureSchema,
  trackPointBatchResultSchema,
  type TrackSchemaType,
  type TrackPointsFeatureSchemaType,
  type TrackPointBatchResultSchemaType,
} from '@triplog/shared';

import { apiFetch } from './client';

/** trips.tsの`Trip`同様、yupスキーマ検証済みの型を「検証済みTrack」として使う。 */
export type Track = TrackSchemaType;
export type TrackPointsFeature = TrackPointsFeatureSchemaType;
export type TrackPointBatchResult = TrackPointBatchResultSchemaType;

export const tripTracksQueryKey = (tripId: string) => ['trips', tripId, 'tracks'] as const;

export async function fetchTripTracks(tripId: string): Promise<Track[]> {
  const raw = await apiFetch<unknown>(`/api/trips/${tripId}/tracks`);
  const validated = await tracksResponseSchema.validate(raw, { strict: true });
  return validated as Track[];
}

export function useTripTracks(tripId: string | undefined) {
  return useQuery({
    queryKey: tripTracksQueryKey(tripId ?? '__none__'),
    queryFn: () => fetchTripTracks(tripId as string),
    enabled: Boolean(tripId),
    retry: false,
  });
}

export const trackPointsQueryKey = (trackId: string, simplify?: number) =>
  ['tracks', trackId, 'points', simplify ?? null] as const;

export async function fetchTrackPoints(
  trackId: string,
  simplify?: number
): Promise<TrackPointsFeatureSchemaType> {
  const raw = await apiFetch<unknown>(`/api/tracks/${trackId}/points`, {
    query: { simplify },
  });
  const validated = await trackPointsFeatureSchema.validate(raw, { strict: true });
  return validated as TrackPointsFeatureSchemaType;
}

export function useTrackPoints(trackId: string | undefined, simplify?: number) {
  return useQuery({
    queryKey: trackPointsQueryKey(trackId ?? '__none__', simplify),
    queryFn: () => fetchTrackPoints(trackId as string, simplify),
    enabled: Boolean(trackId),
    retry: false,
  });
}

export interface StartTrackInput {
  tripId: string;
}

export async function startTrack({ tripId }: StartTrackInput): Promise<Track> {
  const raw = await apiFetch<unknown>(`/api/trips/${tripId}/tracks`, {
    method: 'POST',
    body: JSON.stringify({ source: 'live' }),
  });
  const validated = await trackSchema.validate(raw, { strict: true });
  return validated as Track;
}

/**
 * AC-33: 旅行選択→トラック開始（source='live', status='recording'）。
 * 成功後の画面遷移（S-002へのnavigate）は呼び出し元（TripSelectionDialog/MapScreen）が担う。
 * `useTrips` のキャッシュは再取得しない（AC-32根拠、plan.md「トラッキング開始」データフロー）。
 */
export function useStartTrack() {
  return useMutation({
    mutationFn: startTrack,
  });
}

/**
 * AC-1, AC-2, AC-4, AC-5, AC-6: trackIdのみからトラックのメタ情報（tripId/status/startedAt等）を
 * 自己完結的に取得する（plan.md「データフロー」画面表示直後の初期化）。
 */
export const trackQueryKey = (trackId: string) => ['tracks', trackId] as const;

export async function fetchTrack(trackId: string): Promise<Track> {
  const raw = await apiFetch<unknown>(`/api/tracks/${trackId}`);
  const validated = await trackSchema.validate(raw, { strict: true });
  return validated as Track;
}

export function useTrack(trackId: string | undefined) {
  return useQuery({
    queryKey: trackQueryKey(trackId ?? '__none__'),
    queryFn: () => fetchTrack(trackId as string),
    enabled: Boolean(trackId),
    retry: false,
  });
}

export interface UpdateTrackStatusInput {
  trackId: string;
  status: 'recording' | 'paused' | 'finished';
}

/**
 * AC-14, AC-16, AC-18: 一時停止/再開/終了。`endedAt`はサーバ側が`status=finished`時に
 * 自動設定するためリクエストボディには含めない（plan.md「API契約」参照）。
 */
export async function updateTrackStatus({ trackId, status }: UpdateTrackStatusInput): Promise<Track> {
  const raw = await apiFetch<unknown>(`/api/tracks/${trackId}`, {
    method: 'PATCH',
    body: JSON.stringify({ status }),
  });
  const validated = await trackSchema.validate(raw, { strict: true });
  return validated as Track;
}

export function useUpdateTrackStatus() {
  return useMutation({
    mutationFn: updateTrackStatus,
  });
}

export interface IngestTrackPointInput {
  lng: number;
  lat: number;
  elevationM?: number | null;
  speedMps?: number | null;
  accuracyM?: number | null;
  recordedAt: string;
}

export interface IngestTrackPointsInput {
  trackId: string;
  points: IngestTrackPointInput[];
}

/**
 * AC-13, AC-24: 位置情報バッチ送信・オフライン蓄積分の再送。
 * 呼び出し元（useTrackPointFlush、T-12）が成功時に `GET /api/tracks/{trackId}/points` の
 * react-queryキャッシュをinvalidateし、取得点数・距離・地図プレビューを再取得させる。
 */
export async function ingestTrackPoints({ trackId, points }: IngestTrackPointsInput): Promise<TrackPointBatchResult> {
  const raw = await apiFetch<unknown>(`/api/tracks/${trackId}/points`, {
    method: 'POST',
    body: JSON.stringify({ points }),
  });
  const validated = await trackPointBatchResultSchema.validate(raw, { strict: true });
  return validated as TrackPointBatchResult;
}

export function useIngestTrackPoints() {
  const queryClient = useQueryClient();
  return useMutation({
    mutationFn: ingestTrackPoints,
    onSuccess: (_data, variables) => {
      void queryClient.invalidateQueries({ queryKey: ['tracks', variables.trackId, 'points'] });
    },
  });
}
