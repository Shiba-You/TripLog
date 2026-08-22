import * as yup from 'yup';

/**
 * GET /api/coverage?regionType=city のレスポンス検証スキーマ。
 * AC-8/9/21/22: stats.totalCount=0・geojson.features=[] を許容する（regions未投入時のエラーにならない表示）。
 */
const geoJsonFeatureSchema = yup.object({
  type: yup.string().required(),
  geometry: yup.mixed().nullable().defined(),
  properties: yup.mixed().nullable().defined(),
});

export const coverageSchema = yup.object({
  stats: yup
    .object({
      visitedCount: yup.number().integer().min(0).required(),
      totalCount: yup.number().integer().min(0).required(),
      coverageRate: yup.number().min(0).required(),
    })
    .required(),
  geojson: yup
    .object({
      type: yup.string().required(),
      features: yup.array().of(geoJsonFeatureSchema).required(),
    })
    .required(),
});

export type CoverageSchemaType = yup.InferType<typeof coverageSchema>;
