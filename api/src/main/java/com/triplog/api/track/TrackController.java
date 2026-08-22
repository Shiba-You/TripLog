package com.triplog.api.track;

import java.util.List;
import java.util.UUID;
import org.springframework.http.HttpStatus;
import org.springframework.web.bind.annotation.GetMapping;
import org.springframework.web.bind.annotation.PathVariable;
import org.springframework.web.bind.annotation.PostMapping;
import org.springframework.web.bind.annotation.RequestMapping;
import org.springframework.web.bind.annotation.ResponseStatus;
import org.springframework.web.bind.annotation.RestController;

@RestController
@RequestMapping("/api/trips/{tripId}/tracks")
public class TrackController {

    private final ListTracksUseCase listTracksUseCase;
    private final StartTrackUseCase startTrackUseCase;

    public TrackController(ListTracksUseCase listTracksUseCase, StartTrackUseCase startTrackUseCase) {
        this.listTracksUseCase = listTracksUseCase;
        this.startTrackUseCase = startTrackUseCase;
    }

    @GetMapping
    public List<TrackDto> listTracks(@PathVariable UUID tripId) {
        return listTracksUseCase.execute(tripId);
    }

    @PostMapping
    @ResponseStatus(HttpStatus.CREATED)
    public TrackDto startTrack(@PathVariable UUID tripId) {
        return startTrackUseCase.execute(tripId);
    }
}
