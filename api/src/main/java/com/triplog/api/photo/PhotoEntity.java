package com.triplog.api.photo;

import jakarta.persistence.Column;
import jakarta.persistence.Entity;
import jakarta.persistence.Id;
import jakarta.persistence.Table;
import java.util.UUID;

/**
 * {@code photos} テーブルに対応する最小限のJPAエンティティ。
 *
 * <p>位置情報（{@code geom}）を含む検索は {@link PhotoRepository} のネイティブクエリ（PostGIS関数）で
 * 直接扱うため、本エンティティでは主要カラムのみをマッピングする。
 */
@Entity
@Table(name = "photos")
public class PhotoEntity {

    @Id
    private UUID id;

    @Column(name = "trip_id", nullable = false)
    private UUID tripId;

    @Column(name = "user_id", nullable = false)
    private UUID userId;

    protected PhotoEntity() {}

    public UUID getId() {
        return id;
    }

    public UUID getTripId() {
        return tripId;
    }

    public UUID getUserId() {
        return userId;
    }
}
