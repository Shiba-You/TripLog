package com.triplog.api.common.geojson;

import java.util.List;

/** OpenAPI定義の {@code GeoJsonFeatureCollection} スキーマに対応するDTO。 */
public record GeoJsonFeatureCollection(String type, List<GeoJsonFeature> features) {

    public static GeoJsonFeatureCollection of(List<GeoJsonFeature> features) {
        return new GeoJsonFeatureCollection("FeatureCollection", features);
    }
}
