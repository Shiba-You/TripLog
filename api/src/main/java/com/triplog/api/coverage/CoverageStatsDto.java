package com.triplog.api.coverage;

/** OpenAPI定義の {@code /api/coverage} レスポンス内 {@code stats} オブジェクトに対応するDTO。 */
public record CoverageStatsDto(long visitedCount, long totalCount, double coverageRate) {}
