package com.triplog.api.trackpoint;

import java.util.List;
import java.util.UUID;

/** POST /api/tracks/{trackId}/points の受理結果サマリ（OpenAPI 202レスポンス相当）。 */
public record TrackPointBatchResultDto(int accepted, List<UUID> newlyVisitedRegionIds) {}
