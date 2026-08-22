package com.triplog.api.trip;

import static org.hamcrest.Matchers.empty;
import static org.springframework.test.web.servlet.request.MockMvcRequestBuilders.get;
import static org.springframework.test.web.servlet.result.MockMvcResultMatchers.jsonPath;
import static org.springframework.test.web.servlet.result.MockMvcResultMatchers.status;

import com.triplog.api.common.AppConstants;
import java.time.LocalDate;
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
 * GET /api/trips のController層テスト（AC-1, AC-2, AC-4関連）。
 *
 * <p>共有の開発用DBに対して実行するため、各テストの冒頭で対象ユーザーのtrips配下を一旦クリアしてから
 * 固定フィクスチャを投入する。{@code @Transactional} によりテスト終了時にロールバックされる。
 */
@SpringBootTest
@AutoConfigureMockMvc
@Transactional
class TripControllerTest {

    @Autowired
    private MockMvc mockMvc;

    @Autowired
    private JdbcTemplate jdbcTemplate;

    @BeforeEach
    void clearTripsAndDescendants() {
        jdbcTemplate.update("DELETE FROM photos");
        jdbcTemplate.update("DELETE FROM track_points");
        jdbcTemplate.update("DELETE FROM visited_regions WHERE first_trip_id IS NOT NULL");
        jdbcTemplate.update("DELETE FROM tracks");
        jdbcTemplate.update("DELETE FROM trips");
    }

    @Test
    void 複数tripsが並び順どおりに返る() throws Exception {
        UUID olderStarted = insertTrip("older-started", "#111111", LocalDate.of(2026, 1, 1), "2026-01-05T00:00:00Z");
        UUID newerStarted = insertTrip("newer-started", "#222222", LocalDate.of(2026, 3, 1), "2026-01-01T00:00:00Z");
        UUID noStartedDateNewerCreated =
                insertTrip("no-started-newer-created", "#333333", null, "2026-06-01T00:00:00Z");
        UUID noStartedDateOlderCreated =
                insertTrip("no-started-older-created", "#444444", null, "2026-02-01T00:00:00Z");

        mockMvc.perform(get("/api/trips"))
                .andExpect(status().isOk())
                .andExpect(jsonPath("$.length()").value(4))
                .andExpect(jsonPath("$[0].id").value(newerStarted.toString()))
                .andExpect(jsonPath("$[0].name").value("newer-started"))
                .andExpect(jsonPath("$[0].color").value("#222222"))
                .andExpect(jsonPath("$[1].id").value(olderStarted.toString()))
                .andExpect(jsonPath("$[2].id").value(noStartedDateNewerCreated.toString()))
                .andExpect(jsonPath("$[3].id").value(noStartedDateOlderCreated.toString()));
    }

    @Test
    void tripsが0件のとき空配列が返る() throws Exception {
        mockMvc.perform(get("/api/trips")).andExpect(status().isOk()).andExpect(jsonPath("$").value(empty()));
    }

    @Test
    void レスポンス形状がOpenAPIのTripスキーマと一致する() throws Exception {
        UUID tripId = insertTrip("shape-check", "#abcdef", LocalDate.of(2026, 5, 1), "2026-05-01T00:00:00Z");

        mockMvc.perform(get("/api/trips"))
                .andExpect(status().isOk())
                .andExpect(jsonPath("$[0].id").value(tripId.toString()))
                .andExpect(jsonPath("$[0].name").value("shape-check"))
                .andExpect(jsonPath("$[0].color").value("#abcdef"))
                .andExpect(jsonPath("$[0].startedOn").value("2026-05-01"))
                .andExpect(jsonPath("$[0].endedOn").doesNotExist())
                .andExpect(jsonPath("$[0].createdAt").exists());
    }

    private UUID insertTrip(String name, String color, LocalDate startedOn, String createdAt) {
        UUID id = UUID.randomUUID();
        jdbcTemplate.update(
                "INSERT INTO trips (id, user_id, name, color, started_on, created_at, updated_at) "
                        + "VALUES (?, ?, ?, ?, ?, ?::timestamptz, ?::timestamptz)",
                id,
                AppConstants.SEED_USER_ID,
                name,
                color,
                startedOn,
                createdAt,
                createdAt);
        return id;
    }
}
