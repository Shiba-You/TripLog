package com.triplog.api.track;

import java.util.UUID;
import org.springframework.web.bind.annotation.GetMapping;
import org.springframework.web.bind.annotation.PatchMapping;
import org.springframework.web.bind.annotation.PathVariable;
import org.springframework.web.bind.annotation.RequestBody;
import org.springframework.web.bind.annotation.RequestMapping;
import org.springframework.web.bind.annotation.RestController;

/**
 * {@code /api/tracks/{trackId}} 配下の単一トラック操作。{@code /api/trips/{tripId}/tracks} 配下の
 * {@link TrackController} とはパス階層が異なるため別クラスとする（plan.md「API層の実装方針」）。
 */
@RestController
@RequestMapping("/api/tracks/{trackId}")
public class TrackDetailController {

    private final GetTrackUseCase getTrackUseCase;
    private final UpdateTrackStatusUseCase updateTrackStatusUseCase;

    public TrackDetailController(
            GetTrackUseCase getTrackUseCase, UpdateTrackStatusUseCase updateTrackStatusUseCase) {
        this.getTrackUseCase = getTrackUseCase;
        this.updateTrackStatusUseCase = updateTrackStatusUseCase;
    }

    @GetMapping
    public TrackDto getTrack(@PathVariable UUID trackId) {
        return getTrackUseCase.execute(trackId);
    }

    @PatchMapping
    public TrackDto updateTrackStatus(@PathVariable UUID trackId, @RequestBody UpdateTrackStatusRequestDto request) {
        return updateTrackStatusUseCase.execute(trackId, request.status());
    }
}
