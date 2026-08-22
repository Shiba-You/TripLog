package com.triplog.api.trip;

import com.triplog.api.common.CurrentUserProvider;
import java.util.List;
import org.springframework.stereotype.Service;

/** GET /api/trips のユースケース。現在のユーザーの旅行一覧を並び順どおりに返す。 */
@Service
public class ListTripsUseCase {

    private final TripRepository tripRepository;
    private final CurrentUserProvider currentUserProvider;

    public ListTripsUseCase(TripRepository tripRepository, CurrentUserProvider currentUserProvider) {
        this.tripRepository = tripRepository;
        this.currentUserProvider = currentUserProvider;
    }

    public List<TripDto> execute() {
        var userId = currentUserProvider.getCurrentUserId();
        return tripRepository.findAllByUserIdOrderByStartedOnDescNullsLastCreatedAtDesc(userId).stream()
                .map(TripDto::from)
                .toList();
    }
}
