package com.triplog.api.coverage;

import static org.hamcrest.Matchers.empty;
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
 * GET /api/coverage のController層テスト（AC-8, AC-9, AC-21, AC-22関連）。
 */
@SpringBootTest
@AutoConfigureMockMvc
@Transactional
class CoverageControllerTest {

    @Autowired
    private MockMvc mockMvc;

    @Autowired
    private JdbcTemplate jdbcTemplate;

    @BeforeEach
    void clearRegionsAndVisitedRegions() {
        jdbcTemplate.update("DELETE FROM visited_regions");
        jdbcTemplate.update("DELETE FROM regions");
    }

    @Test
    void 訪問済みregionsがある状態でgeojsonにポリゴンが含まれ統計が正しい() throws Exception {
        UUID visitedRegionId = insertCityRegion("visited-city", "13101");
        insertCityRegion("unvisited-city", "13102");
        jdbcTemplate.update(
                "INSERT INTO visited_regions (id, user_id, region_id, first_visited_at) VALUES (?, ?, ?, now())",
                UUID.randomUUID(),
                AppConstants.SEED_USER_ID,
                visitedRegionId);

        mockMvc.perform(get("/api/coverage").param("regionType", "city"))
                .andExpect(status().isOk())
                .andExpect(jsonPath("$.stats.totalCount").value(2))
                .andExpect(jsonPath("$.stats.visitedCount").value(1))
                .andExpect(jsonPath("$.stats.coverageRate").value(50.0))
                .andExpect(jsonPath("$.geojson.type").value("FeatureCollection"))
                .andExpect(jsonPath("$.geojson.features.length()").value(1))
                .andExpect(jsonPath("$.geojson.features[0].geometry.type").value("MultiPolygon"));
    }

    @Test
    void regions未投入totalCount0のときgeojsonが空でエラーにならない() throws Exception {
        mockMvc.perform(get("/api/coverage").param("regionType", "city"))
                .andExpect(status().isOk())
                .andExpect(jsonPath("$.stats.totalCount").value(0))
                .andExpect(jsonPath("$.stats.visitedCount").value(0))
                .andExpect(jsonPath("$.stats.coverageRate").value(0.0))
                .andExpect(jsonPath("$.geojson.features").value(empty()));
    }

    private UUID insertCityRegion(String name, String code) {
        UUID id = UUID.randomUUID();
        jdbcTemplate.update(
                "INSERT INTO regions (id, region_type, code, name, geom) "
                        + "VALUES (?, 'city', ?, ?, ST_Multi(ST_SetSRID(ST_GeomFromText("
                        + "'POLYGON((139.0 35.0, 139.1 35.0, 139.1 35.1, 139.0 35.1, 139.0 35.0))'), 4326)))",
                id,
                code,
                name);
        return id;
    }
}
