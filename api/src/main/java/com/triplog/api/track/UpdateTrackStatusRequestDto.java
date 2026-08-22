package com.triplog.api.track;

/** PATCH /api/tracks/{trackId} のリクエストボディ。OpenAPI定義上 {@code status} のみを受け付ける。 */
public record UpdateTrackStatusRequestDto(String status) {}
