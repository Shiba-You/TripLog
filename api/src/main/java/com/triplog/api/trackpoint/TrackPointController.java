package com.triplog.api.trackpoint;

import com.triplog.api.common.geojson.GeoJsonFeature;
import java.util.UUID;
import org.springframework.http.HttpStatus;
import org.springframework.web.bind.annotation.GetMapping;
import org.springframework.web.bind.annotation.PathVariable;
import org.springframework.web.bind.annotation.PostMapping;
import org.springframework.web.bind.annotation.RequestBody;
import org.springframework.web.bind.annotation.RequestParam;
import org.springframework.web.bind.annotation.ResponseStatus;
import org.springframework.web.bind.annotation.RestController;

@RestController
public class TrackPointController {

    private final GetTrackPointsUseCase getTrackPointsUseCase;
    private final IngestTrackPointsUseCase ingestTrackPointsUseCase;

    public TrackPointController(
            GetTrackPointsUseCase getTrackPointsUseCase, IngestTrackPointsUseCase ingestTrackPointsUseCase) {
        this.getTrackPointsUseCase = getTrackPointsUseCase;
        this.ingestTrackPointsUseCase = ingestTrackPointsUseCase;
    }

    @GetMapping(value = "/api/tracks/{trackId}/points", produces = "application/geo+json")
    public GeoJsonFeature getTrackPoints(
            @PathVariable UUID trackId, @RequestParam(required = false) Double simplify) {
        return getTrackPointsUseCase.execute(trackId, simplify);
    }

    /** S-002 AC-13, AC-24: 位置情報バッチ送信・オフライン蓄積分の再送。 */
    @PostMapping("/api/tracks/{trackId}/points")
    @ResponseStatus(HttpStatus.ACCEPTED)
    public TrackPointBatchResultDto ingestTrackPoints(
            @PathVariable UUID trackId, @RequestBody TrackPointBatchRequestDto request) {
        return ingestTrackPointsUseCase.execute(trackId, request.points());
    }
}
