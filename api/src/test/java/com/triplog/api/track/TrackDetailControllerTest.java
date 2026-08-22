package com.triplog.api.track;

import static org.assertj.core.api.Assertions.assertThat;
import static org.springframework.test.web.servlet.request.MockMvcRequestBuilders.get;
import static org.springframework.test.web.servlet.request.MockMvcRequestBuilders.patch;
import static org.springframework.test.web.servlet.result.MockMvcResultMatchers.jsonPath;
import static org.springframework.test.web.servlet.result.MockMvcResultMatchers.status;

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
import org.springframework.transaction.annotation.Transactional;

/**
 * GET/PATCH /api/tracks/{trackId} のController層テスト（S-002 AC-1, AC-2, AC-4, AC-5, AC-6, AC-14,
 * AC-16, AC-18関連、T-1/T-2）。
 */
@SpringBootTest
@AutoConfigureMockMvc
@Transactional
class TrackDetailControllerTest {

    @Autowired
    private MockMvc mockMvc;

    @Autowired
    private JdbcTemplate jdbcTemplate;

    private UUID tripId;
    private UUID trackId;

    @BeforeEach
    void setUpTrackInProgress() {
        jdbcTemplate.update("DELETE FROM visited_regions");
        jdbcTemplate.update("DELETE FROM photos");
        jdbcTemplate.update("DELETE FROM track_points");
        jdbcTemplate.update("DELETE FROM tracks");
        jdbcTemplate.update("DELETE FROM trips");

        tripId = UUID.randomUUID();
        jdbcTemplate.update(
                "INSERT INTO trips (id, user_id, name, color) VALUES (?, ?, 'detail-test-trip', '#abcdef')",
                tripId,
                AppConstants.SEED_USER_ID);

        trackId = UUID.randomUUID();
        jdbcTemplate.update(
                "INSERT INTO tracks (id, trip_id, user_id, source, status, started_at) "
                        + "VALUES (?, ?, ?, 'live', 'recording', now())",
                trackId,
                tripId,
                AppConstants.SEED_USER_ID);
    }

    @Test
    void GETでtrackのメタ情報が返る_AC1_AC2_AC4_AC5_AC6() throws Exception {
        mockMvc.perform(get("/api/tracks/{trackId}", trackId))
                .andExpect(status().isOk())
                .andExpect(jsonPath("$.id").value(trackId.toString()))
                .andExpect(jsonPath("$.tripId").value(tripId.toString()))
                .andExpect(jsonPath("$.source").value("live"))
                .andExpect(jsonPath("$.status").value("recording"))
                .andExpect(jsonPath("$.startedAt").exists())
                .andExpect(jsonPath("$.endedAt").doesNotExist())
                .andExpect(jsonPath("$.pointCount").value(0));
    }

    @Test
    void track_pointsが1件以上あるときpointCountに反映される() throws Exception {
        jdbcTemplate.update(
                "INSERT INTO track_points (track_id, user_id, geom, recorded_at) "
                        + "VALUES (?, ?, ST_SetSRID(ST_MakePoint(139.0, 35.0), 4326)::geography, now())",
                trackId,
                AppConstants.SEED_USER_ID);

        mockMvc.perform(get("/api/tracks/{trackId}", trackId))
                .andExpect(status().isOk())
                .andExpect(jsonPath("$.pointCount").value(1));
    }

    @Test
    void GETで存在しないtrackIdは404() throws Exception {
        mockMvc.perform(get("/api/tracks/{trackId}", UUID.randomUUID())).andExpect(status().isNotFound());
    }

    @Test
    void GETで他ユーザー所有のtrackIdは404() throws Exception {
        UUID otherUserTripId = UUID.randomUUID();
        UUID otherUserId = UUID.randomUUID();
        jdbcTemplate.update(
                "INSERT INTO users (id, display_name) VALUES (?, 'other-user') ON CONFLICT DO NOTHING",
                otherUserId);
        jdbcTemplate.update(
                "INSERT INTO trips (id, user_id, name, color) VALUES (?, ?, 'other-trip', '#000000')",
                otherUserTripId,
                otherUserId);
        UUID otherTrackId = UUID.randomUUID();
        jdbcTemplate.update(
                "INSERT INTO tracks (id, trip_id, user_id, source, status, started_at) "
                        + "VALUES (?, ?, ?, 'live', 'recording', now())",
                otherTrackId,
                otherUserTripId,
                otherUserId);

        mockMvc.perform(get("/api/tracks/{trackId}", otherTrackId)).andExpect(status().isNotFound());
    }

    @Test
    void PATCHでpausedへ更新するとstatusがpausedになる_AC14() throws Exception {
        mockMvc.perform(
                        patch("/api/tracks/{trackId}", trackId)
                                .contentType(MediaType.APPLICATION_JSON)
                                .content("{\"status\":\"paused\"}"))
                .andExpect(status().isOk())
                .andExpect(jsonPath("$.status").value("paused"));

        String status =
                jdbcTemplate.queryForObject("SELECT status FROM tracks WHERE id = ?", String.class, trackId);
        assertThat(status).isEqualTo("paused");
    }

    @Test
    void PATCHでpausedからrecordingへ戻す_AC16() throws Exception {
        jdbcTemplate.update("UPDATE tracks SET status = 'paused' WHERE id = ?", trackId);

        mockMvc.perform(
                        patch("/api/tracks/{trackId}", trackId)
                                .contentType(MediaType.APPLICATION_JSON)
                                .content("{\"status\":\"recording\"}"))
                .andExpect(status().isOk())
                .andExpect(jsonPath("$.status").value("recording"));
    }

    @Test
    void PATCHでfinishedへ更新するとended_atが設定される_AC18() throws Exception {
        mockMvc.perform(
                        patch("/api/tracks/{trackId}", trackId)
                                .contentType(MediaType.APPLICATION_JSON)
                                .content("{\"status\":\"finished\"}"))
                .andExpect(status().isOk())
                .andExpect(jsonPath("$.status").value("finished"))
                .andExpect(jsonPath("$.endedAt").exists());

        var endedAt = jdbcTemplate.queryForObject(
                "SELECT ended_at FROM tracks WHERE id = ?", java.sql.Timestamp.class, trackId);
        assertThat(endedAt).isNotNull();
    }

    @Test
    void PATCHで存在しないtrackIdは404() throws Exception {
        mockMvc.perform(
                        patch("/api/tracks/{trackId}", UUID.randomUUID())
                                .contentType(MediaType.APPLICATION_JSON)
                                .content("{\"status\":\"paused\"}"))
                .andExpect(status().isNotFound());
    }
}
