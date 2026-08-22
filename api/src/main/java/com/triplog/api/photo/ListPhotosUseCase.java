package com.triplog.api.photo;

import com.triplog.api.common.CurrentUserProvider;
import java.util.List;
import java.util.UUID;
import org.springframework.beans.factory.annotation.Value;
import org.springframework.http.HttpStatus;
import org.springframework.stereotype.Service;
import org.springframework.web.server.ResponseStatusException;

/**
 * GET /api/photos のユースケース。マップ表示用に写真を検索する。
 *
 * <p>{@code bbox}（{@code minLng,minLat,maxLng,maxLat}）と {@code tripId} は任意。{@code hasLocation}
 * は既定 {@code true} で、{@code true} のときは撮影地点（{@code geom}）が確定している写真のみを返す。
 */
@Service
public class ListPhotosUseCase {

    private final PhotoRepository photoRepository;
    private final CurrentUserProvider currentUserProvider;
    private final String minioEndpoint;
    private final String bucketPhotos;

    public ListPhotosUseCase(
            PhotoRepository photoRepository,
            CurrentUserProvider currentUserProvider,
            @Value("${app.minio.endpoint}") String minioEndpoint,
            @Value("${app.minio.bucket-photos}") String bucketPhotos) {
        this.photoRepository = photoRepository;
        this.currentUserProvider = currentUserProvider;
        this.minioEndpoint = minioEndpoint;
        this.bucketPhotos = bucketPhotos;
    }

    public List<PhotoDto> execute(String bbox, UUID tripId, boolean hasLocation) {
        var userId = currentUserProvider.getCurrentUserId();
        double[] bounds = parseBbox(bbox);
        boolean hasBbox = bounds != null;

        List<PhotoProjection> results =
                photoRepository.search(
                        userId,
                        tripId,
                        hasLocation,
                        hasBbox,
                        hasBbox ? bounds[0] : null,
                        hasBbox ? bounds[1] : null,
                        hasBbox ? bounds[2] : null,
                        hasBbox ? bounds[3] : null);

        return results.stream().map(this::toDto).toList();
    }

    private PhotoDto toDto(PhotoProjection p) {
        return new PhotoDto(
                p.getId(),
                p.getTripId(),
                p.getLng(),
                p.getLat(),
                p.getLocationSource(),
                p.getTakenAt(),
                p.getObjectKey(),
                buildThumbnailUrl(p.getThumbnailKey()),
                p.getWidth(),
                p.getHeight());
    }

    private String buildThumbnailUrl(String thumbnailKey) {
        if (thumbnailKey == null) {
            return null;
        }
        return minioEndpoint + "/" + bucketPhotos + "/" + thumbnailKey;
    }

    private double[] parseBbox(String bbox) {
        if (bbox == null || bbox.isBlank()) {
            return null;
        }
        String[] parts = bbox.split(",");
        if (parts.length != 4) {
            throw new ResponseStatusException(HttpStatus.BAD_REQUEST, "bbox must be 'minLng,minLat,maxLng,maxLat'");
        }
        try {
            double[] values = new double[4];
            for (int i = 0; i < 4; i++) {
                values[i] = Double.parseDouble(parts[i].trim());
            }
            return values;
        } catch (NumberFormatException e) {
            throw new ResponseStatusException(HttpStatus.BAD_REQUEST, "bbox must contain numeric values", e);
        }
    }
}
