package com.triplog.api.trackpoint;

import com.triplog.api.common.CurrentUserProvider;
import com.triplog.api.track.TrackEntity;
import com.triplog.api.track.TrackRepository;
import java.time.Instant;
import java.util.Comparator;
import java.util.List;
import java.util.UUID;
import org.springframework.http.HttpStatus;
import org.springframework.stereotype.Service;
import org.springframework.transaction.annotation.Transactional;
import org.springframework.web.server.ResponseStatusException;

/**
 * POST /api/tracks/{trackId}/points のユースケース（S-002 AC-13, AC-24）。
 *
 * <p>(1) {@code track_points}へのバッチINSERT、(2) {@code tracks.last_point_at}の再計算UPDATE、
 * (3) {@code regions}とのST_Contains突合による未訪問区画の{@code visited_regions}への記録、を
 * 1トランザクションで行う（plan.md「API層の実装方針」）。
 */
@Service
public class IngestTrackPointsUseCase {

    private final TrackRepository trackRepository;
    private final TrackPointMapper trackPointMapper;
    private final CurrentUserProvider currentUserProvider;

    public IngestTrackPointsUseCase(
            TrackRepository trackRepository, TrackPointMapper trackPointMapper, CurrentUserProvider currentUserProvider) {
        this.trackRepository = trackRepository;
        this.trackPointMapper = trackPointMapper;
        this.currentUserProvider = currentUserProvider;
    }

    @Transactional
    public TrackPointBatchResultDto execute(UUID trackId, List<TrackPointInputDto> points) {
        var userId = currentUserProvider.getCurrentUserId();
        TrackEntity track = trackRepository
                .findByIdAndUserId(trackId, userId)
                .orElseThrow(() -> new ResponseStatusException(HttpStatus.NOT_FOUND, "track not found: " + trackId));

        if (points == null || points.isEmpty()) {
            return new TrackPointBatchResultDto(0, List.of());
        }

        trackPointMapper.insertBatch(trackId, userId, points);

        Instant maxRecordedAt =
                points.stream().map(TrackPointInputDto::recordedAt).max(Comparator.naturalOrder()).orElseThrow();
        trackPointMapper.updateLastPointAt(trackId, userId, maxRecordedAt);

        List<UUID> newlyVisitedRegionIds =
                trackPointMapper.insertNewlyVisitedRegionsReturningIds(userId, track.getTripId(), points).stream()
                        .map(UUID::fromString)
                        .toList();

        return new TrackPointBatchResultDto(points.size(), newlyVisitedRegionIds);
    }
}
