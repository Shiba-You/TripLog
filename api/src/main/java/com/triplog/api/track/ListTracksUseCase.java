package com.triplog.api.track;

import com.triplog.api.common.CurrentUserProvider;
import com.triplog.api.trackpoint.TrackPointRepository;
import java.util.List;
import java.util.UUID;
import org.springframework.stereotype.Service;

/** GET /api/trips/{tripId}/tracks のユースケース。指定旅行に紐づくトラック一覧を返す。 */
@Service
public class ListTracksUseCase {

    private final TrackRepository trackRepository;
    private final TrackPointRepository trackPointRepository;
    private final CurrentUserProvider currentUserProvider;

    public ListTracksUseCase(
            TrackRepository trackRepository,
            TrackPointRepository trackPointRepository,
            CurrentUserProvider currentUserProvider) {
        this.trackRepository = trackRepository;
        this.trackPointRepository = trackPointRepository;
        this.currentUserProvider = currentUserProvider;
    }

    public List<TrackDto> execute(UUID tripId) {
        var userId = currentUserProvider.getCurrentUserId();
        return trackRepository.findAllByTripIdAndUserId(tripId, userId).stream()
                .map(track -> TrackDto.from(track, trackPointRepository.countByTrackIdAndUserId(track.getId(), userId)))
                .toList();
    }
}
