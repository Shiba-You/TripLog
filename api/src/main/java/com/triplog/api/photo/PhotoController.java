package com.triplog.api.photo;

import java.util.List;
import java.util.UUID;
import org.springframework.web.bind.annotation.GetMapping;
import org.springframework.web.bind.annotation.RequestParam;
import org.springframework.web.bind.annotation.RestController;

@RestController
public class PhotoController {

    private final ListPhotosUseCase listPhotosUseCase;

    public PhotoController(ListPhotosUseCase listPhotosUseCase) {
        this.listPhotosUseCase = listPhotosUseCase;
    }

    @GetMapping("/api/photos")
    public List<PhotoDto> listPhotos(
            @RequestParam(required = false) String bbox,
            @RequestParam(required = false) UUID tripId,
            @RequestParam(required = false, defaultValue = "true") boolean hasLocation) {
        return listPhotosUseCase.execute(bbox, tripId, hasLocation);
    }
}
