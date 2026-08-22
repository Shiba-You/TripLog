// GET /api/trips/{tripId}/tracks, GET /api/tracks/{trackId}/points, POST /api/trips/{tripId}/tracks
// を呼ぶreact-queryフック/ミューテーション（AC-6, AC-7, AC-33, AC-36）。
import { useMutation, useQuery } from '@tanstack/react-query';
import {
  trackSchema,
  tracksResponseSchema,
  trackPointsFeatureSchema,
  type TrackSchemaType,
  type TrackPointsFeatureSchemaType,
} from '@triplog/shared';

import { apiFetch } from './client';

/** trips.tsの`Trip`同様、yupスキーマ検証済みの型を「検証済みTrack」として使う。 */
export type Track = TrackSchemaType;
export type TrackPointsFeature = TrackPointsFeatureSchemaType;

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
