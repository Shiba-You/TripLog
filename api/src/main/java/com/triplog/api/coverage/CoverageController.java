package com.triplog.api.coverage;

import org.springframework.web.bind.annotation.GetMapping;
import org.springframework.web.bind.annotation.RequestParam;
import org.springframework.web.bind.annotation.RestController;

@RestController
public class CoverageController {

    private final GetCoverageUseCase getCoverageUseCase;

    public CoverageController(GetCoverageUseCase getCoverageUseCase) {
        this.getCoverageUseCase = getCoverageUseCase;
    }

    @GetMapping("/api/coverage")
    public CoverageResponseDto getCoverage(@RequestParam(required = false) String regionType) {
        return getCoverageUseCase.execute(regionType);
    }
}
