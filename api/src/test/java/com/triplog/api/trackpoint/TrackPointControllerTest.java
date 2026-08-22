package com.triplog.api.trackpoint;

import static org.assertj.core.api.Assertions.assertThat;
import static org.springframework.test.web.servlet.request.MockMvcRequestBuilders.get;
import static org.springframework.test.web.servlet.request.MockMvcRequestBuilders.post;
import static org.springframework.test.web.servlet.result.MockMvcResultMatchers.jsonPath;
import static org.springframework.test.web.servlet.result.MockMvcResultMatchers.status;

import com.fasterxml.jackson.databind.JsonNode;
import com.fasterxml.jackson.databind.ObjectMapper;
import com.triplog.api.common.AppConstants;
import java.util.UUID;
import org.junit.jupiter.api.BeforeEach;
import org.junit.jupiter.api.Test;
import org.springframework.beans.factory.annotation.Autowired;
import org.springframework.boot.test.autoconfigure.web.servlet.AutoConfigureMockMvc;
import org.springframework.boot.test.context.SpringBootTest;
import org.springframework.http.MediaType;
import org.springframework.jdbc.core.JdbcTemplate;
import org.springframework.test.web.servlet.MockMvc;
import org.springframework.test.web.servlet.MvcResult;
import org.springframework.transaction.annotation.Transactional;

/**
 * GET/POST /api/tracks/{trackId}/points のController層テスト（AC-6, AC-7関連、
 * S-002 AC-13, AC-24関連のPOST追加分はT-3）。
 */
@SpringBootTest
@AutoConfigureMockMvc
@Transactional
class TrackPointControllerTest {

    @Autowired
    private MockMvc mockMvc;

    @Autowired
    private JdbcTemplate jdbcTemplate;

    private final ObjectMapper objectMapper = new ObjectMapper();

    private UUID tripId;
    private UUID trackId;

    @BeforeEach
    void setUpTrackWithoutPoints() {
        jdbcTemplate.update("DELETE FROM photos");
        jdbcTemplate.update("DELETE FROM visited_regions");
        jdbcTemplate.update("DELETE FROM regions");
        jdbcTemplate.update("DELETE FROM track_points");
        jdbcTemplate.update("DELETE FROM tracks");
        jdbcTemplate.update("DELETE FROM trips");

        tripId = UUID.randomUUID();
        jdbcTemplate.update(
                "INSERT INTO trips (id, user_id, name, color) VALUES (?, ?, 'points-test-trip', '#654321')",
                tripId,
                AppConstants.SEED_USER_ID);

        trackId = UUID.randomUUID();
        jdbcTemplate.update(
                "INSERT INTO tracks (id, trip_id, user_id, source, status, started_at) "
                        + "VALUES (?, ?, ?, 'live', 'finished', now())",
                trackId,
                tripId,
                AppConstants.SEED_USER_ID);
    }

    @Test
    void track_pointsが0件のトラックはエラーにならず空のGeoJSONが返る() throws Exception {
        mockMvc.perform(get("/api/tracks/{trackId}/points", trackId))
                .andExpect(status().isOk())
                .andExpect(jsonPath("$.type").value("Feature"))
                .andExpect(jsonPath("$.geometry").doesNotExist())
                .andExpect(jsonPath("$.properties.pointCount").value(0));
    }

    @Test
    void simplifyパラメータの違いで返却される点数が変化する() throws Exception {
        insertZigzagPoints(trackId, 20);

        MvcResult noSimplifyResult =
                mockMvc.perform(get("/api/tracks/{trackId}/points", trackId).param("simplify", "0"))
                        .andExpect(status().isOk())
                        .andExpect(jsonPath("$.properties.pointCount").value(20))
                        .andReturn();
        int fullResolutionCoordinateCount = coordinateCount(noSimplifyResult);
        assertThat(fullResolutionCoordinateCount).isEqualTo(20);

        MvcResult heavilySimplifiedResult =
                mockMvc.perform(get("/api/tracks/{trackId}/points", trackId).param("simplify", "100000"))
                        .andExpect(status().isOk())
                        .andExpect(jsonPath("$.properties.pointCount").value(20))
                        .andReturn();
        int simplifiedCoordinateCount = coordinateCount(heavilySimplifiedResult);

        assertThat(simplifiedCoordinateCount).isLessThan(fullResolutionCoordinateCount);
        assertThat(simplifiedCoordinateCount).isEqualTo(2);
    }

    private int coordinateCount(MvcResult result) throws Exception {
        JsonNode root = objectMapper.readTree(result.getResponse().getContentAsString());
        return root.get("geometry").get("coordinates").size();
    }

    @Test
    void POSTで複数点をバッチ送信するとtrack_pointsが全件追加されlast_point_atが更新される_AC13() throws Exception {
        String body =
                "{\"points\":["
                        + "{\"lng\":139.0,\"lat\":35.0,\"recordedAt\":\"2026-01-01T00:00:00Z\"},"
                        + "{\"lng\":139.1,\"lat\":35.1,\"recordedAt\":\"2026-01-01T00:01:00Z\"},"
                        + "{\"lng\":139.2,\"lat\":35.2,\"elevationM\":12.5,\"speedMps\":1.2,\"accuracyM\":5.0,"
                        + "\"recordedAt\":\"2026-01-01T00:02:00Z\"}"
                        + "]}";

        mockMvc.perform(post("/api/tracks/{trackId}/points", trackId).contentType(MediaType.APPLICATION_JSON).content(body))
                .andExpect(status().isAccepted())
                .andExpect(jsonPath("$.accepted").value(3))
                .andExpect(jsonPath("$.newlyVisitedRegionIds").isArray())
                .andExpect(jsonPath("$.newlyVisitedRegionIds").isEmpty());

        Integer count =
                jdbcTemplate.queryForObject("SELECT COUNT(*) FROM track_points WHERE track_id = ?", Integer.class, trackId);
        assertThat(count).isEqualTo(3);

        var lastPointAt = jdbcTemplate.queryForObject(
                "SELECT last_point_at FROM tracks WHERE id = ?", java.sql.Timestamp.class, trackId);
        assertThat(lastPointAt.toInstant()).isEqualTo(java.time.Instant.parse("2026-01-01T00:02:00Z"));
    }

    @Test
    void POSTでregions投入済みなら新規訪問区画がvisited_regionsへ挿入されnewlyVisitedRegionIdsに含まれる_AC13()
            throws Exception {
        UUID regionId = UUID.randomUUID();
        jdbcTemplate.update(
                "INSERT INTO regions (id, region_type, code, name, geom) "
                        + "VALUES (?, 'city', '13101', 'points-test-city', ST_Multi(ST_SetSRID(ST_GeomFromText("
                        + "'POLYGON((139.0 35.0, 139.5 35.0, 139.5 35.5, 139.0 35.5, 139.0 35.0))'), 4326)))",
                regionId);

        String body =
                "{\"points\":["
                        + "{\"lng\":139.2,\"lat\":35.2,\"recordedAt\":\"2026-01-01T00:00:00Z\"}"
                        + "]}";

        mockMvc.perform(post("/api/tracks/{trackId}/points", trackId).contentType(MediaType.APPLICATION_JSON).content(body))
                .andExpect(status().isAccepted())
                .andExpect(jsonPath("$.accepted").value(1))
                .andExpect(jsonPath("$.newlyVisitedRegionIds[0]").value(regionId.toString()));

        Integer visitedCount = jdbcTemplate.queryForObject(
                "SELECT COUNT(*) FROM visited_regions WHERE user_id = ? AND region_id = ?",
                Integer.class,
                AppConstants.SEED_USER_ID,
                regionId);
        assertThat(visitedCount).isEqualTo(1);
    }

    @Test
    void POSTで存在しないtrackIdは404() throws Exception {
        String body = "{\"points\":[{\"lng\":139.0,\"lat\":35.0,\"recordedAt\":\"2026-01-01T00:00:00Z\"}]}";

        mockMvc.perform(
                        post("/api/tracks/{trackId}/points", UUID.randomUUID())
                                .contentType(MediaType.APPLICATION_JSON)
                                .content(body))
                .andExpect(status().isNotFound());
    }

    private void insertZigzagPoints(UUID trackId, int count) {
        double baseLng = 139.0;
        double baseLat = 35.0;
        for (int i = 0; i < count; i++) {
            double lng = baseLng + (i * 0.0001);
            double lat = baseLat + ((i % 2 == 0) ? 0.0 : 0.0002);
            jdbcTemplate.update(
                    "INSERT INTO track_points (track_id, user_id, geom, recorded_at) "
                            + "VALUES (?, ?, ST_SetSRID(ST_MakePoint(?, ?), 4326)::geography, now() + (? * interval '1 second'))",
                    trackId,
                    AppConstants.SEED_USER_ID,
                    lng,
                    lat,
                    i);
        }
    }
}
