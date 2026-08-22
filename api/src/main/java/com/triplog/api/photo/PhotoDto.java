package com.triplog.api.photo;

import java.time.Instant;
import java.util.UUID;

/** OpenAPI定義の {@code Photo} スキーマに対応するレスポンスDTO。 */
public record PhotoDto(
        UUID id,
        UUID tripId,
        Double lng,
        Double lat,
        String locationSource,
        Instant takenAt,
        String objectKey,
        String thumbnailUrl,
        Integer width,
        Integer height) {}
