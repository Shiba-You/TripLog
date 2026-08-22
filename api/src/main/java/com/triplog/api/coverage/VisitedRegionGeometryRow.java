package com.triplog.api.coverage;

/**
 * MyBatisの結果行（訪問済み {@code regions} の1件）。
 *
 * <p>{@code regionId} はPostgreSQLの {@code uuid} 型をMyBatisの自動TypeHandler解決が正しく扱えない
 * ケースがあるため、SQL側で {@code ::text} キャストしたうえで {@link String} として受け取る。
 */
public class VisitedRegionGeometryRow {

    private String regionId;
    private String name;
    private String geojson;

    public String getRegionId() {
        return regionId;
    }

    public void setRegionId(String regionId) {
        this.regionId = regionId;
    }

    public String getName() {
        return name;
    }

    public void setName(String name) {
        this.name = name;
    }

    public String getGeojson() {
        return geojson;
    }

    public void setGeojson(String geojson) {
        this.geojson = geojson;
    }
}
