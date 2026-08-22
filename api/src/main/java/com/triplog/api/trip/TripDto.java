package com.triplog.api.trip;

import java.time.Instant;
import java.time.LocalDate;
import java.util.UUID;

/** OpenAPI定義の {@code Trip} スキーマに対応するレスポンスDTO。 */
public record TripDto(
        UUID id,
        String name,
        String description,
        String color,
        LocalDate startedOn,
        LocalDate endedOn,
        Instant createdAt) {

    public static TripDto from(TripEntity entity) {
        return new TripDto(
                entity.getId(),
                entity.getName(),
                entity.getDescription(),
                entity.getColor(),
                entity.getStartedOn(),
                entity.getEndedOn(),
                entity.getCreatedAt());
    }
}
