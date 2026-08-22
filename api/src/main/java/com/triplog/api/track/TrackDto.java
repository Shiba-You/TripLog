package com.triplog.api.track;

import java.time.Instant;
import java.util.UUID;

/** OpenAPI定義の {@code Track} スキーマに対応するレスポンスDTO。 */
public record TrackDto(
        UUID id,
        UUID tripId,
        String source,
        String status,
        Instant startedAt,
        Instant endedAt,
        Instant lastPointAt,
        long pointCount) {

    public static TrackDto from(TrackEntity entity, long pointCount) {
        return new TrackDto(
                entity.getId(),
                entity.getTripId(),
                entity.getSource(),
                entity.getStatus(),
                entity.getStartedAt(),
                entity.getEndedAt(),
                entity.getLastPointAt(),
                pointCount);
    }
}
