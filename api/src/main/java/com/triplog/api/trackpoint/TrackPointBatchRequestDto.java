package com.triplog.api.trackpoint;

import java.util.List;

/** OpenAPI {@code TrackPointBatch} スキーマに対応するリクエストDTO。 */
public record TrackPointBatchRequestDto(List<TrackPointInputDto> points) {}
