import * as yup from 'yup';

/**
 * POST /api/tracks/{trackId}/points のレスポンス（受理サマリ）検証スキーマ（S-002 AC-13, AC-24）。
 * `regions` が未投入（空）の場合 `newlyVisitedRegionIds` は空配列になる想定であり、
 * それ自体はエラーではないため `min(0)` のみ課す（plan.md「regionsデータ未投入」参照）。
 */
export const trackPointBatchResultSchema = yup.object({
  accepted: yup.number().integer().min(0).required(),
  newlyVisitedRegionIds: yup.array().of(yup.string().uuid().required()).required(),
});

export type TrackPointBatchResultSchemaType = yup.InferType<typeof trackPointBatchResultSchema>;
