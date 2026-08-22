package com.triplog.api.trackpoint;

import com.triplog.api.common.geojson.GeoJsonFeature;
import java.util.UUID;
import org.springframework.web.bind.annotation.GetMapping;
import org.springframework.web.bind.annotation.PathVariable;
import org.springframework.web.bind.annotation.RequestParam;
import org.springframework.web.bind.annotation.RestController;

@RestController
public class TrackPointController {

    private final GetTrackPointsUseCase getTrackPointsUseCase;

    public TrackPointController(GetTrackPointsUseCase getTrackPointsUseCase) {
        this.getTrackPointsUseCase = getTrackPointsUseCase;
    }

    @GetMapping(value = "/api/tracks/{trackId}/points", produces = "application/geo+json")
    public GeoJsonFeature getTrackPoints(
            @PathVariable UUID trackId, @RequestParam(required = false) Double simplify) {
        return getTrackPointsUseCase.execute(trackId, simplify);
    }
}
