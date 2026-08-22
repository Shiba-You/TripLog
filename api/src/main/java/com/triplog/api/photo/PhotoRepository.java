package com.triplog.api.photo;

import java.util.List;
import java.util.UUID;
import org.springframework.data.jpa.repository.JpaRepository;
import org.springframework.data.jpa.repository.Query;
import org.springframework.data.repository.query.Param;

public interface PhotoRepository extends JpaRepository<PhotoEntity, UUID> {

    /**
     * マップ表示用の写真検索。{@code hasBbox=false} の場合はbboxフィルタを適用しない
     * （{@code ST_MakeEnvelope} の引数はNULLでも安全に評価される）。
     */
    @Query(
            value =
                    "SELECT "
                            + "id AS \"id\", "
                            + "trip_id AS \"tripId\", "
                            + "ST_X(geom::geometry) AS \"lng\", "
                            + "ST_Y(geom::geometry) AS \"lat\", "
                            + "location_source AS \"locationSource\", "
                            + "taken_at AS \"takenAt\", "
                            + "r2_object_key AS \"objectKey\", "
                            + "thumbnail_key AS \"thumbnailKey\", "
                            + "width AS \"width\", "
                            + "height AS \"height\" "
                            + "FROM photos "
                            + "WHERE user_id = :userId "
                            + "AND (:tripId IS NULL OR trip_id = :tripId) "
                            + "AND (:hasLocation = false OR geom IS NOT NULL) "
                            + "AND (:hasBbox = false OR ST_Intersects(geom::geometry, "
                            + "ST_MakeEnvelope(:minLng, :minLat, :maxLng, :maxLat, 4326))) "
                            + "ORDER BY taken_at DESC NULLS LAST",
            nativeQuery = true)
    List<PhotoProjection> search(
            @Param("userId") UUID userId,
            @Param("tripId") UUID tripId,
            @Param("hasLocation") boolean hasLocation,
            @Param("hasBbox") boolean hasBbox,
            @Param("minLng") Double minLng,
            @Param("minLat") Double minLat,
            @Param("maxLng") Double maxLng,
            @Param("maxLat") Double maxLat);
}
