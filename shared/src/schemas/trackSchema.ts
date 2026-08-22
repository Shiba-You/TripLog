import * as yup from 'yup';

/**
 * GET /api/trips/{tripId}/tracks, POST /api/trips/{tripId}/tracks が返す単一Trackの検証スキーマ。
 * NOT NULL/NULL可の判断基準は docs/domain/01_基本設計/04_データモデル.md の tracks テーブル定義に従う
 * （id/trip_id/source/status は NOT NULL、started_at/ended_at/last_point_at は NULL可）。
 * pointCount はAPIが動的に計算して返す集計値（常に返却される前提）。
 */
export const trackSchema = yup.object({
  id: yup.string().uuid().required(),
  tripId: yup.string().uuid().required(),
  source: yup.string().oneOf(['live', 'gpx']).required(),
  status: yup.string().oneOf(['recording', 'paused', 'finished']).required(),
  startedAt: yup.string().nullable().defined(),
  endedAt: yup.string().nullable().defined(),
  lastPointAt: yup.string().nullable().defined(),
  pointCount: yup.number().integer().min(0).required(),
});

export const tracksResponseSchema = yup.array().of(trackSchema).required();

export type TrackSchemaType = yup.InferType<typeof trackSchema>;
