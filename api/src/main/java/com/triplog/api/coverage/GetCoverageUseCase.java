package com.triplog.api.coverage;

import com.fasterxml.jackson.core.JsonProcessingException;
import com.fasterxml.jackson.databind.JsonNode;
import com.fasterxml.jackson.databind.ObjectMapper;
import com.triplog.api.common.CurrentUserProvider;
import com.triplog.api.common.geojson.GeoJsonFeature;
import com.triplog.api.common.geojson.GeoJsonFeatureCollection;
import java.util.Map;
import org.springframework.stereotype.Service;

/**
 * GET /api/coverage のユースケース。訪問済みエリア（トロフィー）のGeoJSONと統計を返す。
 *
 * <p>S-001は市区町村（{@code city}）のみを利用するため、{@code regionType} 未指定時は {@code city} を
 * 既定値として扱う。{@code totalCount=0} の場合は0除算を避け {@code coverageRate=0} とする。
 */
@Service
public class GetCoverageUseCase {

    private static final String DEFAULT_REGION_TYPE = "city";

    private final CoverageMapper coverageMapper;
    private final CurrentUserProvider currentUserProvider;
    private final ObjectMapper objectMapper;

    public GetCoverageUseCase(CoverageMapper coverageMapper, CurrentUserProvider currentUserProvider) {
        this.coverageMapper = coverageMapper;
        this.currentUserProvider = currentUserProvider;
        this.objectMapper = new ObjectMapper();
    }

    public CoverageResponseDto execute(String regionType) {
        String type = (regionType == null || regionType.isBlank()) ? DEFAULT_REGION_TYPE : regionType;
        var userId = currentUserProvider.getCurrentUserId();

        long totalCount = coverageMapper.countRegionsByType(type);
        long visitedCount = coverageMapper.countVisitedRegionsByType(userId, type);
        double coverageRate = totalCount == 0 ? 0.0 : (visitedCount * 100.0) / totalCount;

        var features =
                coverageMapper.findVisitedRegionGeometries(userId, type).stream()
                        .map(
                                row ->
                                        GeoJsonFeature.of(
                                                parseGeometry(row.getGeojson()),
                                                Map.of("regionId", row.getRegionId(), "name", row.getName())))
                        .toList();

        return new CoverageResponseDto(
                new CoverageStatsDto(visitedCount, totalCount, coverageRate), GeoJsonFeatureCollection.of(features));
    }

    private JsonNode parseGeometry(String geojson) {
        if (geojson == null) {
            return null;
        }
        try {
            return objectMapper.readTree(geojson);
        } catch (JsonProcessingException e) {
            throw new IllegalStateException("PostGISが返したGeoJSONの解析に失敗しました", e);
        }
    }
}
