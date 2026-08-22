import * as yup from 'yup';

/**
 * GET /api/trips が返す単一Tripのランタイム検証スキーマ。
 * 必須/NULL許容の判断基準は docs/domain/01_基本設計/04_データモデル.md の trips テーブル定義
 * （id/name/color/created_at は NOT NULL、description/started_on/ended_on は NULL可）に従う。
 */
export const tripSchema = yup.object({
  id: yup.string().uuid().required(),
  name: yup.string().required(),
  description: yup.string().nullable().defined(),
  color: yup.string().required(),
  startedOn: yup.string().nullable().defined(),
  endedOn: yup.string().nullable().defined(),
  createdAt: yup.string().required(),
});

export const tripsResponseSchema = yup.array().of(tripSchema).required();

export type TripSchemaType = yup.InferType<typeof tripSchema>;
