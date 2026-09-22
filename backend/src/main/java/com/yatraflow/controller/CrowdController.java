package com.yatraflow.controller;

import com.yatraflow.dto.common.ApiResponse;
import com.yatraflow.dto.crowd.BottleneckSignalDto;
import com.yatraflow.dto.crowd.CheckpointMetricsDto;
import com.yatraflow.dto.crowd.LiveCrowdResponse;
import com.yatraflow.dto.crowd.RouteCrowdMetricsDto;
import com.yatraflow.service.CrowdIntelligenceService;
import lombok.RequiredArgsConstructor;
import org.springframework.http.ResponseEntity;
import org.springframework.web.bind.annotation.*;

import java.util.List;

@RestController
@RequestMapping("/api/crowd")
@RequiredArgsConstructor
public class CrowdController {

    private final CrowdIntelligenceService crowdIntelligenceService;

    @GetMapping("/live")
    public ResponseEntity<ApiResponse<LiveCrowdResponse>> getLiveCrowd() {
        LiveCrowdResponse response = crowdIntelligenceService.getLiveCrowdIntelligence();
        return ResponseEntity.ok(ApiResponse.success("Live crowd intelligence calculated successfully", response));
    }

    @GetMapping("/checkpoints/{checkpointId}")
    public ResponseEntity<ApiResponse<CheckpointMetricsDto>> getCheckpointMetrics(@PathVariable Long checkpointId) {
        CheckpointMetricsDto dto = crowdIntelligenceService.getCheckpointMetrics(checkpointId);
        return ResponseEntity.ok(ApiResponse.success("Checkpoint crowd metrics retrieved successfully", dto));
    }

    @GetMapping("/routes/{routeId}")
    public ResponseEntity<ApiResponse<RouteCrowdMetricsDto>> getRouteCrowdMetrics(@PathVariable Long routeId) {
        RouteCrowdMetricsDto dto = crowdIntelligenceService.getRouteCrowdMetrics(routeId);
        return ResponseEntity.ok(ApiResponse.success("Route crowd metrics retrieved successfully", dto));
    }

    @GetMapping("/bottlenecks")
    public ResponseEntity<ApiResponse<List<BottleneckSignalDto>>> getBottlenecks() {
        List<BottleneckSignalDto> bottlenecks = crowdIntelligenceService.getActiveBottlenecks();
        return ResponseEntity.ok(ApiResponse.success("Active bottleneck signals retrieved successfully", bottlenecks));
    }
}
