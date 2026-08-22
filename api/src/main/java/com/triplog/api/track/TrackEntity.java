package com.triplog.api.track;

import jakarta.persistence.Column;
import jakarta.persistence.Entity;
import jakarta.persistence.Id;
import jakarta.persistence.Table;
import java.time.Instant;
import java.util.UUID;

/** {@code tracks} テーブルに対応するJPAエンティティ。 */
@Entity
@Table(name = "tracks")
public class TrackEntity {

    @Id
    private UUID id;

    @Column(name = "trip_id", nullable = false)
    private UUID tripId;

    @Column(name = "user_id", nullable = false)
    private UUID userId;

    @Column(nullable = false)
    private String source;

    @Column(nullable = false)
    private String status;

    @Column(name = "started_at")
    private Instant startedAt;

    @Column(name = "ended_at")
    private Instant endedAt;

    @Column(name = "last_point_at")
    private Instant lastPointAt;

    @Column(name = "created_at", nullable = false)
    private Instant createdAt;

    protected TrackEntity() {}

    public static TrackEntity startLive(UUID tripId, UUID userId, Instant startedAt) {
        TrackEntity entity = new TrackEntity();
        entity.id = UUID.randomUUID();
        entity.tripId = tripId;
        entity.userId = userId;
        entity.source = "live";
        entity.status = "recording";
        entity.startedAt = startedAt;
        entity.createdAt = startedAt;
        return entity;
    }

    public UUID getId() {
        return id;
    }

    public UUID getTripId() {
        return tripId;
    }

    public UUID getUserId() {
        return userId;
    }

    public String getSource() {
        return source;
    }

    public String getStatus() {
        return status;
    }

    public Instant getStartedAt() {
        return startedAt;
    }

    public Instant getEndedAt() {
        return endedAt;
    }

    public Instant getLastPointAt() {
        return lastPointAt;
    }

    public Instant getCreatedAt() {
        return createdAt;
    }
}
