package com.triplog.api.coverage;

import com.triplog.api.common.geojson.GeoJsonFeatureCollection;

/** OpenAPI定義の {@code GET /api/coverage} レスポンスに対応するDTO。 */
public record CoverageResponseDto(CoverageStatsDto stats, GeoJsonFeatureCollection geojson) {}
