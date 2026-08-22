package com.triplog.api.coverage;

import java.util.List;
import java.util.UUID;
import org.apache.ibatis.annotations.Mapper;
import org.apache.ibatis.annotations.Param;
import org.apache.ibatis.annotations.Select;

/**
 * {@code visited_regions} と {@code regions} のJOINを伴うクエリ。JOINが絡むためアーキテクチャ方針どおり
 * MyBatisを使用する。
 */
@Mapper
public interface CoverageMapper {

    @Select("SELECT COUNT(*) FROM regions WHERE region_type = #{regionType}")
    long countRegionsByType(@Param("regionType") String regionType);

    @Select(
            "SELECT COUNT(*) FROM visited_regions vr "
                    + "JOIN regions r ON vr.region_id = r.id "
                    + "WHERE vr.user_id = #{userId} AND r.region_type = #{regionType}")
    long countVisitedRegionsByType(@Param("userId") UUID userId, @Param("regionType") String regionType);

    @Select(
            "SELECT r.id::text AS \"regionId\", r.name AS \"name\", ST_AsGeoJSON(r.geom) AS \"geojson\" "
                    + "FROM visited_regions vr "
                    + "JOIN regions r ON vr.region_id = r.id "
                    + "WHERE vr.user_id = #{userId} AND r.region_type = #{regionType}")
    List<VisitedRegionGeometryRow> findVisitedRegionGeometries(
            @Param("userId") UUID userId, @Param("regionType") String regionType);
}
