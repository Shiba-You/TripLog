package com.triplog.api.trackpoint;

import java.util.UUID;
import org.springframework.data.jpa.repository.JpaRepository;
import org.springframework.data.jpa.repository.Query;
import org.springframework.data.repository.query.Param;

public interface TrackPointRepository extends JpaRepository<TrackPointEntity, Long> {

    long countByTrackIdAndUserId(UUID trackId, UUID userId);

    /**
     * トラックの軌跡を1本のLineStringとしてGeoJSON化する。PostGIS {@code ST_Simplify}/{@code ST_AsGeoJSON} を使用。
     *
     * <p>{@code track_points} が0件の場合、集約関数はNULL/0を返すため例外にはならない
     * （呼び出し側で {@code geojson=null} のFeatureとして扱う）。
     */
    @Query(
            value =
                    "SELECT "
                            + "ST_AsGeoJSON(ST_Simplify(ST_MakeLine(geom::geometry ORDER BY recorded_at), "
                            + ":toleranceDegrees)) AS geojson, "
                            + "COUNT(*) AS pointCount "
                            + "FROM track_points "
                            + "WHERE track_id = :trackId AND user_id = :userId",
            nativeQuery = true)
    TrackGeoJsonProjection findTrackGeoJson(
            @Param("trackId") UUID trackId,
            @Param("userId") UUID userId,
            @Param("toleranceDegrees") double toleranceDegrees);
}
