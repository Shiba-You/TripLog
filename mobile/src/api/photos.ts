// GET /api/photos を呼ぶreact-queryフック（AC-10, AC-13, AC-14, AC-36）。
import { useQuery } from '@tanstack/react-query';
import { photosResponseSchema, type PhotoSchemaType } from '@triplog/shared';

import { apiFetch } from './client';

/** trips.tsの`Trip`同様、yupスキーマ検証済みの型を「検証済みPhoto」として使う。 */
export type Photo = PhotoSchemaType;

export interface Bbox {
  minLng: number;
  minLat: number;
  maxLng: number;
  maxLat: number;
}

export function bboxToParam(bbox: Bbox): string {
  return `${bbox.minLng},${bbox.minLat},${bbox.maxLng},${bbox.maxLat}`;
}

export const photosQueryKey = (bbox: Bbox | undefined, hasLocation: boolean) =>
  ['photos', bbox ? bboxToParam(bbox) : '__none__', hasLocation] as const;

export async function fetchPhotos(bbox: Bbox, hasLocation = true): Promise<Photo[]> {
  const raw = await apiFetch<unknown>('/api/photos', {
    query: { bbox: bboxToParam(bbox), hasLocation },
  });
  const validated = await photosResponseSchema.validate(raw, { strict: true });
  return validated as Photo[];
}

/**
 * AC-1, AC-36: 初期表示範囲（bbox）が確定した後にのみ呼び出す想定のため、
 * `bbox` が未確定（undefined）の間はクエリを無効化する。
 */
export function usePhotos(bbox: Bbox | undefined, hasLocation = true) {
  return useQuery({
    queryKey: photosQueryKey(bbox, hasLocation),
    queryFn: () => fetchPhotos(bbox as Bbox, hasLocation),
    enabled: Boolean(bbox),
    retry: false,
  });
}
