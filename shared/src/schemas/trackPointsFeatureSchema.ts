import * as yup from 'yup';

/**
 * GET /api/tracks/{trackId}/points?simplify=... のレスポンス（GeoJSON Feature, LineString）検証スキーマ。
 * AC-7: track_points が0件のトラックに対しては、geometry.coordinatesが空配列（またはgeometryがnull）の
 * GeoJSONが返る想定であり、エラー扱いにしないためgeometryはnullを許容する。
 */
const lineStringGeometrySchema = yup.object({
  type: yup.string().oneOf(['LineString']).required(),
  coordinates: yup
    .array()
    .of(yup.array().of(yup.number().required()).min(2).required())
    .required(),
});

export const trackPointsFeatureSchema = yup.object({
  type: yup.string().oneOf(['Feature']).required(),
  geometry: lineStringGeometrySchema.nullable().defined(),
  properties: yup.mixed().nullable().defined(),
});

export type TrackPointsFeatureSchemaType = yup.InferType<typeof trackPointsFeatureSchema>;
