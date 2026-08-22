import * as yup from 'yup';

/**
 * GET /api/photos が返す単一Photoの検証スキーマ。
 * NOT NULL/NULL可の判断基準は docs/domain/01_基本設計/04_データモデル.md の photos テーブル定義に従う
 * （id/trip_id/location_source/r2_object_key(=objectKey) は NOT NULL、geom(lng/lat)/taken_at/thumbnail_key/width/height は NULL可）。
 * AC-13/AC-14: thumbnail_key(=thumbnailUrl) がNULLでも成功する。lng/latがNULLの写真は
 * hasLocation=true 指定時にAPI側で除外される想定だが、スキーマ自体はNULLを許容する。
 */
export const photoSchema = yup.object({
  id: yup.string().uuid().required(),
  tripId: yup.string().uuid().required(),
  lng: yup.number().nullable().defined(),
  lat: yup.number().nullable().defined(),
  locationSource: yup.string().oneOf(['exif', 'matched', 'unknown']).required(),
  takenAt: yup.string().nullable().defined(),
  objectKey: yup.string().required(),
  thumbnailUrl: yup.string().nullable().defined(),
  width: yup.number().integer().nullable().defined(),
  height: yup.number().integer().nullable().defined(),
});

export const photosResponseSchema = yup.array().of(photoSchema).required();

export type PhotoSchemaType = yup.InferType<typeof photoSchema>;
