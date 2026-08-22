package com.triplog.api.track;

import com.triplog.api.common.CurrentUserProvider;
import com.triplog.api.trackpoint.TrackPointRepository;
import java.util.UUID;
import org.springframework.http.HttpStatus;
import org.springframework.stereotype.Service;
import org.springframework.web.server.ResponseStatusException;

/**
 * GET /api/tracks/{trackId} のユースケース（S-002 AC-1, AC-2, AC-4, AC-5, AC-6）。
 *
 * <p>trackIdのみからトラックのメタ情報を自己完結的に解決する。存在しない/他ユーザー所有のtrackIdは404。
 */
@Service
public class GetTrackUseCase {

    private final TrackRepository trackRepository;
    private final TrackPointRepository trackPointRepository;
    private final CurrentUserProvider currentUserProvider;

    public GetTrackUseCase(
            TrackRepository trackRepository,
            TrackPointRepository trackPointRepository,
            CurrentUserProvider currentUserProvider) {
        this.trackRepository = trackRepository;
        this.trackPointRepository = trackPointRepository;
        this.currentUserProvider = currentUserProvider;
    }

    public TrackDto execute(UUID trackId) {
        var userId = currentUserProvider.getCurrentUserId();
        TrackEntity track = trackRepository
                .findByIdAndUserId(trackId, userId)
                .orElseThrow(() -> new ResponseStatusException(HttpStatus.NOT_FOUND, "track not found: " + trackId));
        long pointCount = trackPointRepository.countByTrackIdAndUserId(trackId, userId);
        return TrackDto.from(track, pointCount);
    }
}
