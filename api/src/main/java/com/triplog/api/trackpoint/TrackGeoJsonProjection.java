package com.triplog.api.trackpoint;

/** ネイティブクエリの射影結果。0件のトラックでは {@code geojson} が {@code null} になる。 */
public interface TrackGeoJsonProjection {

    String getGeojson();

    long getPointCount();
}
