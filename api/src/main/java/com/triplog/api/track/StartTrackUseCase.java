package com.triplog.api.track;

import com.triplog.api.common.CurrentUserProvider;
import java.time.Instant;
import java.util.UUID;
import org.springframework.stereotype.Service;

/** POST /api/trips/{tripId}/tracks のユースケース。ライブトラッキングセッションを新規作成する。 */
@Service
public class StartTrackUseCase {

    private final TrackRepository trackRepository;
    private final CurrentUserProvider currentUserProvider;

    public StartTrackUseCase(TrackRepository trackRepository, CurrentUserProvider currentUserProvider) {
        this.trackRepository = trackRepository;
        this.currentUserProvider = currentUserProvider;
    }

    public TrackDto execute(UUID tripId) {
        var userId = currentUserProvider.getCurrentUserId();
        TrackEntity entity = TrackEntity.startLive(tripId, userId, Instant.now());
        // saveAndFlush: テスト（同一トランザクション内での生JDBC参照）や他クエリから直後に見えるよう即時反映する。
        TrackEntity saved = trackRepository.saveAndFlush(entity);
        return TrackDto.from(saved, 0L);
    }
}
