package com.triplog.api.track;

import java.util.List;
import java.util.UUID;
import org.springframework.data.jpa.repository.JpaRepository;
import org.springframework.data.jpa.repository.Query;
import org.springframework.data.repository.query.Param;

public interface TrackRepository extends JpaRepository<TrackEntity, UUID> {

    @Query("SELECT t FROM TrackEntity t WHERE t.tripId = :tripId AND t.userId = :userId ORDER BY t.createdAt")
    List<TrackEntity> findAllByTripIdAndUserId(@Param("tripId") UUID tripId, @Param("userId") UUID userId);
}
