package com.triplog.api.photo;

import java.time.Instant;
import java.util.UUID;

/** ネイティブクエリの射影結果。{@code lng}/{@code lat}/{@code takenAt}/{@code thumbnailKey} 等はNULL可。 */
public interface PhotoProjection {

    UUID getId();

    UUID getTripId();

    Double getLng();

    Double getLat();

    String getLocationSource();

    Instant getTakenAt();

    String getObjectKey();

    String getThumbnailKey();

    Integer getWidth();

    Integer getHeight();
}
