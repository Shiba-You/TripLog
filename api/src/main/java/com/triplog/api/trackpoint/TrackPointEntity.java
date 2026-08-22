package com.triplog.api.trackpoint;

import jakarta.persistence.Column;
import jakarta.persistence.Entity;
import jakarta.persistence.GeneratedValue;
import jakarta.persistence.GenerationType;
import jakarta.persistence.Id;
import jakarta.persistence.Table;
import java.time.Instant;
import java.util.UUID;

/**
 * {@code track_points} テーブルに対応する最小限のJPAエンティティ。
 *
 * <p>位置情報（{@code geom}）は本エンティティではマッピングせず、GeoJSON取得やbboxフィルタは
 * {@link TrackPointRepository} のネイティブクエリ（PostGIS関数）で直接扱う。
 */
@Entity
@Table(name = "track_points")
public class TrackPointEntity {

    @Id
    @GeneratedValue(strategy = GenerationType.IDENTITY)
    private Long id;

    @Column(name = "track_id", nullable = false)
    private UUID trackId;

    @Column(name = "user_id", nullable = false)
    private UUID userId;

    @Column(name = "recorded_at", nullable = false)
    private Instant recordedAt;

    protected TrackPointEntity() {}

    public Long getId() {
        return id;
    }

    public UUID getTrackId() {
        return trackId;
    }

    public UUID getUserId() {
        return userId;
    }

    public Instant getRecordedAt() {
        return recordedAt;
    }
}
