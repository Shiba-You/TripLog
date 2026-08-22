package com.triplog.api.photo;

import static org.springframework.test.web.servlet.request.MockMvcRequestBuilders.get;
import static org.springframework.test.web.servlet.result.MockMvcResultMatchers.jsonPath;
import static org.springframework.test.web.servlet.result.MockMvcResultMatchers.status;

import com.triplog.api.common.AppConstants;
import java.util.UUID;
import org.junit.jupiter.api.BeforeEach;
import org.junit.jupiter.api.Test;
import org.springframework.beans.factory.annotation.Autowired;
import org.springframework.boot.test.autoconfigure.web.servlet.AutoConfigureMockMvc;
import org.springframework.boot.test.context.SpringBootTest;
import org.springframework.jdbc.core.JdbcTemplate;
import org.springframework.test.web.servlet.MockMvc;
import org.springframework.transaction.annotation.Transactional;

/**
 * GET /api/photos のController層テスト（AC-10, AC-13, AC-14関連）。
 */
@SpringBootTest
@AutoConfigureMockMvc
@Transactional
class PhotoControllerTest {

    @Autowired
    private MockMvc mockMvc;

    @Autowired
    private JdbcTemplate jdbcTemplate;

    private UUID tripId;

    @BeforeEach
    void setUpTrip() {
        jdbcTemplate.update("DELETE FROM photos");
        jdbcTemplate.update("DELETE FROM track_points");
        jdbcTemplate.update("DELETE FROM tracks");
        jdbcTemplate.update("DELETE FROM trips");

        tripId = UUID.randomUUID();
        jdbcTemplate.update(
                "INSERT INTO trips (id, user_id, name, color) VALUES (?, ?, 'photo-test-trip', '#a1b2c3')",
                tripId,
                AppConstants.SEED_USER_ID);
    }

    @Test
    void 指定bbox内の写真のみ返る() throws Exception {
        insertPhotoWithLocation("inside-bbox", 139.75, 35.68, "thumb-inside.jpg");
        insertPhotoWithLocation("outside-bbox", 141.0, 43.0, "thumb-outside.jpg");

        mockMvc.perform(get("/api/photos").param("bbox", "139.5,35.5,140.0,35.9"))
                .andExpect(status().isOk())
                .andExpect(jsonPath("$.length()").value(1))
                .andExpect(jsonPath("$[0].objectKey").value("inside-bbox"));
    }

    @Test
    void hasLocation_true指定時にgeomがNULLの写真は除外される() throws Exception {
        insertPhotoWithLocation("with-location", 139.75, 35.68, "thumb.jpg");
        insertPhotoWithoutLocation("without-location");

        mockMvc.perform(get("/api/photos").param("hasLocation", "true"))
                .andExpect(status().isOk())
                .andExpect(jsonPath("$.length()").value(1))
                .andExpect(jsonPath("$[0].objectKey").value("with-location"))
                .andExpect(jsonPath("$[0].lng").exists())
                .andExpect(jsonPath("$[0].lat").exists());
    }

    @Test
    void hasLocation_false指定時はgeomがNULLの写真も含まれる() throws Exception {
        insertPhotoWithLocation("with-location", 139.75, 35.68, "thumb.jpg");
        insertPhotoWithoutLocation("without-location");

        mockMvc.perform(get("/api/photos").param("hasLocation", "false"))
                .andExpect(status().isOk())
                .andExpect(jsonPath("$.length()").value(2));
    }

    @Test
    void thumbnail_keyがNULLの写真も欠落なく返りthumbnailUrlはnullになる() throws Exception {
        insertPhotoWithLocationAndNullThumbnail("no-thumbnail");

        mockMvc.perform(get("/api/photos"))
                .andExpect(status().isOk())
                .andExpect(jsonPath("$.length()").value(1))
                .andExpect(jsonPath("$[0].objectKey").value("no-thumbnail"))
                .andExpect(jsonPath("$[0].thumbnailUrl").doesNotExist());
    }

    @Test
    void thumbnail_keyが非NULLの写真はthumbnailUrlが組み立てられる() throws Exception {
        insertPhotoWithLocation("has-thumbnail", 139.75, 35.68, "thumb-key.jpg");

        mockMvc.perform(get("/api/photos"))
                .andExpect(status().isOk())
                .andExpect(jsonPath("$[0].thumbnailUrl").exists());
    }

    private void insertPhotoWithLocation(String objectKey, double lng, double lat, String thumbnailKey) {
        jdbcTemplate.update(
                "INSERT INTO photos (id, trip_id, user_id, geom, location_source, r2_object_key, thumbnail_key) "
                        + "VALUES (?, ?, ?, ST_SetSRID(ST_MakePoint(?, ?), 4326)::geography, 'exif', ?, ?)",
                UUID.randomUUID(),
                tripId,
                AppConstants.SEED_USER_ID,
                lng,
                lat,
                objectKey,
                thumbnailKey);
    }

    private void insertPhotoWithLocationAndNullThumbnail(String objectKey) {
        jdbcTemplate.update(
                "INSERT INTO photos (id, trip_id, user_id, geom, location_source, r2_object_key, thumbnail_key) "
                        + "VALUES (?, ?, ?, ST_SetSRID(ST_MakePoint(139.75, 35.68), 4326)::geography, 'exif', ?, NULL)",
                UUID.randomUUID(),
                tripId,
                AppConstants.SEED_USER_ID,
                objectKey);
    }

    private void insertPhotoWithoutLocation(String objectKey) {
        jdbcTemplate.update(
                "INSERT INTO photos (id, trip_id, user_id, geom, location_source, r2_object_key, thumbnail_key) "
                        + "VALUES (?, ?, ?, NULL, 'unknown', ?, NULL)",
                UUID.randomUUID(),
                tripId,
                AppConstants.SEED_USER_ID,
                objectKey);
    }
}
