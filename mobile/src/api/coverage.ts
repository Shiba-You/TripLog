// GET /api/coverage?regionType=city を呼ぶreact-queryフック（AC-8, AC-9, AC-21, AC-22）。
// トロフィー進捗のregion粒度は市区町村固定（2026-08-11ユーザー回答Q3、spec.md AC-8根拠）。
import { useQuery } from '@tanstack/react-query';
import { coverageSchema, type CoverageSchemaType } from '@triplog/shared';

import { apiFetch } from './client';

/** trips.tsの`Trip`同様、yupスキーマ検証済みの型を「検証済みCoverage」として使う。 */
export type Coverage = CoverageSchemaType;

export const coverageQueryKey = ['coverage', 'city'] as const;

export async function fetchCoverage(): Promise<Coverage> {
  const raw = await apiFetch<unknown>('/api/coverage', { query: { regionType: 'city' } });
  const validated = await coverageSchema.validate(raw, { strict: true });
  return validated as Coverage;
}

export function useCoverage() {
  return useQuery({
    queryKey: coverageQueryKey,
    queryFn: fetchCoverage,
    retry: false,
  });
}
