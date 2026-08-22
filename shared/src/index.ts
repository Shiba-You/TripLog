// shared ワークスペースの公開エントリポイント。
// OpenAPI由来の型（api-types.ts、自動生成）と、実行時スキーマ検証（yup）をここから再エクスポートする。
// 画面固有のロジックはここに含めない（docs/spec/S-001/plan.md「shared: 新規ワークスペース」参照）。

import type { components } from './api-types';

export type { components, paths } from './api-types';

export type Trip = components['schemas']['Trip'];
export type TripCreate = components['schemas']['TripCreate'];
export type Track = components['schemas']['Track'];
export type TrackCreate = components['schemas']['TrackCreate'];
export type Photo = components['schemas']['Photo'];
export type GeoJsonFeature = components['schemas']['GeoJsonFeature'];
export type GeoJsonFeatureCollection = components['schemas']['GeoJsonFeatureCollection'];

/**
 * GET /api/coverage のレスポンス形状。
 * OpenAPI定義上は無名のインラインオブジェクトのため、shared側で明示的な型として切り出す。
 */
export interface CoverageResponse {
  stats: {
    visitedCount: number;
    totalCount: number;
    coverageRate: number;
  };
  geojson: GeoJsonFeatureCollection;
}

export * from './schemas/tripSchema';
export * from './schemas/coverageSchema';
export * from './schemas/photoSchema';
export * from './schemas/trackSchema';
export * from './schemas/trackPointsFeatureSchema';
