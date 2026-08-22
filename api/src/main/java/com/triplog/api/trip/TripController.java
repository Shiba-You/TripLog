package com.triplog.api.trip;

import java.util.List;
import org.springframework.web.bind.annotation.GetMapping;
import org.springframework.web.bind.annotation.RestController;

@RestController
public class TripController {

    private final ListTripsUseCase listTripsUseCase;

    public TripController(ListTripsUseCase listTripsUseCase) {
        this.listTripsUseCase = listTripsUseCase;
    }

    @GetMapping("/api/trips")
    public List<TripDto> listTrips() {
        return listTripsUseCase.execute();
    }
}
