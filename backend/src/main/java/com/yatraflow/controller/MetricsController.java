package com.yatraflow.controller;

import com.yatraflow.dto.common.ApiResponse;
import com.yatraflow.dto.crowd.CheckpointMetricsDto;
import com.yatraflow.dto.crowd.FlowMetricsDto;
import com.yatraflow.dto.crowd.SpeedMetricsDto;
import com.yatraflow.dto.crowd.TransitTimeMetricsDto;
import com.yatraflow.service.CrowdIntelligenceService;
import lombok.RequiredArgsConstructor;
import org.springframework.http.ResponseEntity;
import org.springframework.web.bind.annotation.*;

import java.util.List;

@RestController
@RequestMapping("/api/metrics")
@RequiredArgsConstructor
public class MetricsController {

    private final CrowdIntelligenceService crowdIntelligenceService;

    @GetMapping("/checkpoints/{checkpointId}")
    public ResponseEntity<ApiResponse<CheckpointMetricsDto>> getCheckpointMetrics(@PathVariable Long checkpointId) {
        CheckpointMetricsDto dto = crowdIntelligenceService.getCheckpointMetrics(checkpointId);
        return ResponseEntity.ok(ApiResponse.success("Checkpoint operational metrics retrieved successfully", dto));
    }

    @GetMapping("/inflow")
    public ResponseEntity<ApiResponse<List<FlowMetricsDto>>> getInflowMetrics() {
        List<FlowMetricsDto> list = crowdIntelligenceService.getInflowMetrics();
        return ResponseEntity.ok(ApiResponse.success("Inflow metrics retrieved successfully", list));
    }

    @GetMapping("/outflow")
    public ResponseEntity<ApiResponse<List<FlowMetricsDto>>> getOutflowMetrics() {
        List<FlowMetricsDto> list = crowdIntelligenceService.getOutflowMetrics();
        return ResponseEntity.ok(ApiResponse.success("Outflow metrics retrieved successfully", list));
    }

    @GetMapping("/speed")
    public ResponseEntity<ApiResponse<List<SpeedMetricsDto>>> getSpeedMetrics() {
        List<SpeedMetricsDto> list = crowdIntelligenceService.getSpeedMetrics();
        return ResponseEntity.ok(ApiResponse.success("Speed metrics retrieved successfully", list));
    }

    @GetMapping("/transit-time")
    public ResponseEntity<ApiResponse<List<TransitTimeMetricsDto>>> getTransitTimeMetrics() {
        List<TransitTimeMetricsDto> list = crowdIntelligenceService.getTransitTimeMetrics();
        return ResponseEntity.ok(ApiResponse.success("Transit time metrics retrieved successfully", list));
    }
}
