package com.triplog.api.track;

import static org.hamcrest.Matchers.empty;
import static org.springframework.test.web.servlet.request.MockMvcRequestBuilders.get;
import static org.springframework.test.web.servlet.request.MockMvcRequestBuilders.post;
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
 * GET/POST /api/trips/{tripId}/tracks のController層テスト（AC-6, AC-7, AC-33関連）。
 */
@SpringBootTest
@AutoConfigureMockMvc
@Transactional
class TrackControllerTest {

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
                "INSERT INTO trips (id, user_id, name, color) VALUES (?, ?, 'track-test-trip', '#123456')",
                tripId,
                AppConstants.SEED_USER_ID);
    }

    @Test
    void 指定tripIdのtracks一覧が返る() throws Exception {
        UUID trackId = UUID.randomUUID();
        jdbcTemplate.update(
                "INSERT INTO tracks (id, trip_id, user_id, source, status, started_at) "
                        + "VALUES (?, ?, ?, 'live', 'recording', now())",
                trackId,
                tripId,
                AppConstants.SEED_USER_ID);

        mockMvc.perform(get("/api/trips/{tripId}/tracks", tripId))
                .andExpect(status().isOk())
                .andExpect(jsonPath("$.length()").value(1))
                .andExpect(jsonPath("$[0].id").value(trackId.toString()))
                .andExpect(jsonPath("$[0].tripId").value(tripId.toString()))
                .andExpect(jsonPath("$[0].source").value("live"))
                .andExpect(jsonPath("$[0].status").value("recording"))
                .andExpect(jsonPath("$[0].pointCount").value(0));
    }

    @Test
    void track0件の旅行には空配列が返る() throws Exception {
        mockMvc.perform(get("/api/trips/{tripId}/tracks", tripId))
                .andExpect(status().isOk())
                .andExpect(jsonPath("$").value(empty()));
    }

    @Test
    void POSTで呼び出し後にsource_liveかつstatus_recordingのトラックが1件追加される() throws Exception {
        mockMvc.perform(post("/api/trips/{tripId}/tracks", tripId))
                .andExpect(status().isCreated())
                .andExpect(jsonPath("$.id").exists())
                .andExpect(jsonPath("$.tripId").value(tripId.toString()))
                .andExpect(jsonPath("$.source").value("live"))
                .andExpect(jsonPath("$.status").value("recording"))
                .andExpect(jsonPath("$.startedAt").exists())
                .andExpect(jsonPath("$.pointCount").value(0));

        Integer count = jdbcTemplate.queryForObject(
                "SELECT COUNT(*) FROM tracks WHERE trip_id = ? AND source = 'live' AND status = 'recording'",
                Integer.class,
                tripId);
        org.assertj.core.api.Assertions.assertThat(count).isEqualTo(1);
    }
}
