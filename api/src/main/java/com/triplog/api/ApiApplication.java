package com.triplog.api;

import org.apache.ibatis.annotations.Mapper;
import org.mybatis.spring.annotation.MapperScan;
import org.springframework.boot.SpringApplication;
import org.springframework.boot.autoconfigure.SpringBootApplication;

// T-3: trackpointパッケージにはMyBatis(TrackPointMapper)とJPA(TrackPointRepository)が混在するため、
// annotationClassでスキャン対象を@Mapperが付与されたインタフェースのみに限定する
// （指定しない場合、TrackPointRepositoryもマッパー候補として誤ってスキャンされビーン定義が衝突する）。
@SpringBootApplication
@MapperScan(
        basePackages = {"com.triplog.api.coverage", "com.triplog.api.trackpoint"},
        annotationClass = Mapper.class)
public class ApiApplication {

    public static void main(String[] args) {
        SpringApplication.run(ApiApplication.class, args);
    }
}
