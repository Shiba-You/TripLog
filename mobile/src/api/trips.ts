// GET /api/trips を呼ぶreact-queryフック（AC-1, AC-2, AC-4, AC-23）。
import { useQuery } from '@tanstack/react-query';
import { tripsResponseSchema, type TripSchemaType } from '@triplog/shared';

import { apiFetch } from './client';

/**
 * `@triplog/shared` の `Trip`（OpenAPIから自動生成、全フィールドoptional）ではなく、
 * yupスキーマ検証後の型（`TripSchemaType`）をmobile側の「検証済みTrip」として使う。
 * バリデーション（`tripsResponseSchema.validate`）を通過した時点でid等は必ず存在するため、
 * 呼び出し側での `string | undefined` ハンドリングを避けるための意図的な選択。
 */
export type Trip = TripSchemaType;

export const tripsQueryKey = ['trips'] as const;

export async function fetchTrips(): Promise<Trip[]> {
  const raw = await apiFetch<unknown>('/api/trips');
  const validated = await tripsResponseSchema.validate(raw, { strict: true });
  return validated as Trip[];
}

// AC-32: FABタップ→TripSelectionDialog表示時にこのフックのキャッシュを再利用し、
// react-queryの再取得（refetch）が発生しないようにする（plan.md「トラッキング開始」データフロー）。
// staleTimeを設けず既定値(0)のままだと、マウントのたびにバックグラウンド再取得が走ってしまうため、
// 画面遷移の往復程度では再取得が起きない範囲でstaleTimeを設定する。
const TRIPS_STALE_TIME_MS = 60_000;

export function useTrips() {
  return useQuery({
    queryKey: tripsQueryKey,
    queryFn: fetchTrips,
    retry: false,
    staleTime: TRIPS_STALE_TIME_MS,
  });
}
