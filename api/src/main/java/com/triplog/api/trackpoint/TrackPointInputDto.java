package com.triplog.api.trackpoint;

import java.time.Instant;

/** OpenAPI {@code TrackPoint} スキーマに対応する、バッチ投入1点分のリクエストDTO。 */
public record TrackPointInputDto(
        double lng, double lat, Double elevationM, Double speedMps, Double accuracyM, Instant recordedAt) {}
