package com.triplog.api.track;

import java.util.List;
import java.util.Optional;
import java.util.UUID;
import org.springframework.data.jpa.repository.JpaRepository;
import org.springframework.data.jpa.repository.Query;
import org.springframework.data.repository.query.Param;

public interface TrackRepository extends JpaRepository<TrackEntity, UUID> {

    @Query("SELECT t FROM TrackEntity t WHERE t.tripId = :tripId AND t.userId = :userId ORDER BY t.createdAt")
    List<TrackEntity> findAllByTripIdAndUserId(@Param("tripId") UUID tripId, @Param("userId") UUID userId);

    /** S-002 AC-1, AC-14, AC-16, AC-18, AC-24: trackId単体からの自己完結的な参照・更新に使う。 */
    @Query("SELECT t FROM TrackEntity t WHERE t.id = :id AND t.userId = :userId")
    Optional<TrackEntity> findByIdAndUserId(@Param("id") UUID id, @Param("userId") UUID userId);
}
