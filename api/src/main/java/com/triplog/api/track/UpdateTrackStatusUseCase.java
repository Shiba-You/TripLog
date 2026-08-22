package com.triplog.api.track;

import com.triplog.api.common.CurrentUserProvider;
import com.triplog.api.trackpoint.TrackPointRepository;
import java.time.Instant;
import java.util.UUID;
import org.springframework.http.HttpStatus;
import org.springframework.stereotype.Service;
import org.springframework.transaction.annotation.Transactional;
import org.springframework.web.server.ResponseStatusException;

/**
 * PATCH /api/tracks/{trackId} のユースケース（S-002 AC-14, AC-16, AC-18）。
 *
 * <p>{@code status=finished} のとき {@code ended_at} はサーバ側で {@code now()} により自動設定する
 * （plan.md「API契約」: OpenAPI定義上 {@code endedAt} はリクエストに含まれるプロパティではない）。
 */
@Service
public class UpdateTrackStatusUseCase {

    private final TrackRepository trackRepository;
    private final TrackPointRepository trackPointRepository;
    private final CurrentUserProvider currentUserProvider;

    public UpdateTrackStatusUseCase(
            TrackRepository trackRepository,
            TrackPointRepository trackPointRepository,
            CurrentUserProvider currentUserProvider) {
        this.trackRepository = trackRepository;
        this.trackPointRepository = trackPointRepository;
        this.currentUserProvider = currentUserProvider;
    }

    @Transactional
    public TrackDto execute(UUID trackId, String status) {
        var userId = currentUserProvider.getCurrentUserId();
        TrackEntity track = trackRepository
                .findByIdAndUserId(trackId, userId)
                .orElseThrow(() -> new ResponseStatusException(HttpStatus.NOT_FOUND, "track not found: " + trackId));

        switch (status) {
            case "paused" -> track.pause();
            case "recording" -> track.resume();
            case "finished" -> track.finish(Instant.now());
            default -> throw new ResponseStatusException(HttpStatus.BAD_REQUEST, "invalid status: " + status);
        }

        TrackEntity saved = trackRepository.saveAndFlush(track);
        long pointCount = trackPointRepository.countByTrackIdAndUserId(trackId, userId);
        return TrackDto.from(saved, pointCount);
    }
}
