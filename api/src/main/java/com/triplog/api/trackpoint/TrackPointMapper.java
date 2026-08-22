package com.triplog.api.trackpoint;

import java.time.Instant;
import java.util.List;
import java.util.UUID;
import org.apache.ibatis.annotations.Insert;
import org.apache.ibatis.annotations.Mapper;
import org.apache.ibatis.annotations.Param;
import org.apache.ibatis.annotations.Select;
import org.apache.ibatis.annotations.Update;

/**
 * POST /api/tracks/{trackId}/points が使うバッチINSERT/更新/未訪問区画判定クエリ。
 *
 * <p>未訪問区画の判定（{@code regions} とのST_Contains突合）はJOINが絡むためアーキテクチャ方針どおり
 * MyBatisを使用する（{@link com.triplog.api.coverage.CoverageMapper} と同じ全アノテーション方式）。
 */
@Mapper
public interface TrackPointMapper {

    /** {@code track_points} へのバッチINSERT。座標(lng,lat)はPostGIS {@code geography(Point,4326)} に変換する。 */
    @Insert({
        "<script>",
        "INSERT INTO track_points (track_id, user_id, geom, elevation_m, speed_mps, accuracy_m, recorded_at) VALUES",
        "<foreach collection='points' item='p' separator=','>",
        "(#{trackId}, #{userId}, ST_SetSRID(ST_MakePoint(#{p.lng}, #{p.lat}), 4326)::geography,",
        " #{p.elevationM}, #{p.speedMps}, #{p.accuracyM}, #{p.recordedAt})",
        "</foreach>",
        "</script>"
    })
    int insertBatch(
            @Param("trackId") UUID trackId, @Param("userId") UUID userId, @Param("points") List<TrackPointInputDto> points);

    /** {@code tracks.last_point_at} を、既存値とバッチ内の最新 {@code recorded_at} の大きい方に更新する。 */
    @Update(
            "UPDATE tracks SET last_point_at = GREATEST(COALESCE(last_point_at, #{maxRecordedAt}), #{maxRecordedAt}) "
                    + "WHERE id = #{trackId} AND user_id = #{userId}")
    int updateLastPointAt(
            @Param("trackId") UUID trackId, @Param("userId") UUID userId, @Param("maxRecordedAt") Instant maxRecordedAt);

    /**
     * バッチ内の点が内包する未訪問の{@code regions}を{@code visited_regions}へ挿入し、新規挿入分のregion_idを返す。
     *
     * <p>{@code regions}が未投入（0件）の場合はSELECT結果が0行のため、INSERTも実行されず例外にならない
     * （plan.md「regionsデータ未投入」参照）。INSERT...RETURNINGはJDBC上SELECTと同様
     * {@code executeQuery}で処理されるクエリのため、MyBatisでは{@code @Select}として扱う。
     *
     * <p>{@code region_id}はPostgreSQLの{@code uuid}型をMyBatisの自動TypeHandler解決が正しく扱えない
     * ケースがあるため（{@link com.triplog.api.coverage.VisitedRegionGeometryRow}と同じ既知の制約）、
     * SQL側で{@code ::text}キャストしたうえで{@link String}として受け取り、呼び出し側でUUID化する。
     */
    @Select({
        "<script>",
        "INSERT INTO visited_regions (id, user_id, region_id, first_visited_at, first_trip_id)",
        "SELECT gen_random_uuid(), #{userId}, r.id, now(), #{tripId}",
        "FROM regions r",
        "WHERE EXISTS (",
        "  SELECT 1 FROM (VALUES",
        "  <foreach collection='points' item='p' separator=','>",
        "  (#{p.lng}::double precision, #{p.lat}::double precision)",
        "  </foreach>",
        "  ) AS batch_point(lng, lat)",
        "  WHERE ST_Contains(r.geom, ST_SetSRID(ST_MakePoint(batch_point.lng, batch_point.lat), 4326))",
        ")",
        "ON CONFLICT (user_id, region_id) DO NOTHING",
        "RETURNING region_id::text",
        "</script>"
    })
    List<String> insertNewlyVisitedRegionsReturningIds(
            @Param("userId") UUID userId, @Param("tripId") UUID tripId, @Param("points") List<TrackPointInputDto> points);
}
