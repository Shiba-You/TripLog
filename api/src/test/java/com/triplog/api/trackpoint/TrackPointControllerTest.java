package com.triplog.api.trackpoint;

import static org.assertj.core.api.Assertions.assertThat;
import static org.springframework.test.web.servlet.request.MockMvcRequestBuilders.get;
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
import org.springframework.jdbc.core.JdbcTemplate;
import org.springframework.test.web.servlet.MockMvc;
import org.springframework.test.web.servlet.MvcResult;
import org.springframework.transaction.annotation.Transactional;

/**
 * GET /api/tracks/{trackId}/points のController層テスト（AC-6, AC-7関連）。
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
