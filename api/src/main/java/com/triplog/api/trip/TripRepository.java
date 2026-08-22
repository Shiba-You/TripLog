package com.triplog.api.trip;

import java.util.List;
import java.util.UUID;
import org.springframework.data.jpa.repository.JpaRepository;
import org.springframework.data.jpa.repository.Query;
import org.springframework.data.repository.query.Param;

public interface TripRepository extends JpaRepository<TripEntity, UUID> {

    @Query(
            "SELECT t FROM TripEntity t WHERE t.userId = :userId "
                    + "ORDER BY t.startedOn DESC NULLS LAST, t.createdAt DESC")
    List<TripEntity> findAllByUserIdOrderByStartedOnDescNullsLastCreatedAtDesc(@Param("userId") UUID userId);
}
