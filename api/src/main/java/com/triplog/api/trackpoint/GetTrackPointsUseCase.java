package com.triplog.api.trackpoint;

import com.fasterxml.jackson.core.JsonProcessingException;
import com.fasterxml.jackson.databind.JsonNode;
import com.fasterxml.jackson.databind.ObjectMapper;
import com.triplog.api.common.CurrentUserProvider;
import com.triplog.api.common.geojson.GeoJsonFeature;
import java.util.Map;
import java.util.UUID;
import org.springframework.stereotype.Service;

/**
 * GET /api/tracks/{trackId}/points のユースケース。
 *
 * <p>{@code simplify} クエリパラメータ（メートル単位の許容誤差）をPostGISのSRID4326（度単位）へ
 * 概算換算（1度 ≒ 111,320m）してから {@code ST_Simplify} に渡す。track_pointsが0件でもエラーにせず、
 * geometryが {@code null} のFeatureを返す。
 */
@Service
public class GetTrackPointsUseCase {

    private static final double METERS_PER_DEGREE = 111_320.0;

    private final TrackPointRepository trackPointRepository;
    private final CurrentUserProvider currentUserProvider;
    private final ObjectMapper objectMapper;

    public GetTrackPointsUseCase(TrackPointRepository trackPointRepository, CurrentUserProvider currentUserProvider) {
        this.trackPointRepository = trackPointRepository;
        this.currentUserProvider = currentUserProvider;
        this.objectMapper = new ObjectMapper();
    }

    public GeoJsonFeature execute(UUID trackId, Double simplifyMeters) {
        var userId = currentUserProvider.getCurrentUserId();
        double toleranceDegrees =
                (simplifyMeters == null || simplifyMeters <= 0) ? 0.0 : simplifyMeters / METERS_PER_DEGREE;

        TrackGeoJsonProjection projection = trackPointRepository.findTrackGeoJson(trackId, userId, toleranceDegrees);

        JsonNode geometry = parseGeometry(projection.getGeojson());
        Map<String, Object> properties = Map.of("trackId", trackId, "pointCount", projection.getPointCount());
        return GeoJsonFeature.of(geometry, properties);
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
