package com.triplog.api.common.geojson;

import com.fasterxml.jackson.databind.JsonNode;
import java.util.Map;

/**
 * OpenAPI定義の {@code GeoJsonFeature} スキーマに対応するDTO。
 *
 * <p>{@code geometry} はGeometryが存在しない場合（例: track_pointsが0件）は {@code null} を許容する。
 */
public record GeoJsonFeature(String type, JsonNode geometry, Map<String, Object> properties) {

    public static GeoJsonFeature of(JsonNode geometry, Map<String, Object> properties) {
        return new GeoJsonFeature("Feature", geometry, properties);
    }
}
