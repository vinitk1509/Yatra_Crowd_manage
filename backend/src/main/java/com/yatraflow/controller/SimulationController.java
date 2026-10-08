package com.yatraflow.controller;

import com.yatraflow.dto.common.ApiResponse;
import com.yatraflow.dto.simulation.PolicyComparisonResponse;
import com.yatraflow.dto.simulation.SimulationRunRequest;
import com.yatraflow.dto.simulation.SimulationRunResponse;
import com.yatraflow.service.simulation.DigitalTwinSimulationEngineService;
import com.yatraflow.service.simulation.LiveTelemetrySimulatorService;
import lombok.RequiredArgsConstructor;
import org.springframework.http.ResponseEntity;
import org.springframework.web.bind.annotation.*;

import java.util.List;
import java.util.Map;

@RestController
@RequestMapping("/api/simulation")
@RequiredArgsConstructor
public class SimulationController {

    private final LiveTelemetrySimulatorService simulatorService;
    private final DigitalTwinSimulationEngineService digitalTwinService;

    @GetMapping("/status")
    public ResponseEntity<ApiResponse<Map<String, Object>>> getStatus() {
        return ResponseEntity.ok(ApiResponse.success("Simulation status retrieved", Map.of(
                "active", simulatorService.isActive(),
                "intervalSeconds", 10,
                "mode", "CONTINUOUS_TELEMETRY_STREAM"
        )));
    }

    @PostMapping("/toggle")
    public ResponseEntity<ApiResponse<Map<String, Object>>> toggleSimulation(@RequestParam(required = false) Boolean active) {
        boolean newState = active != null ? active : !simulatorService.isActive();
        simulatorService.setActive(newState);
        return ResponseEntity.ok(ApiResponse.success(
                newState ? "Live telemetry stream activated" : "Live telemetry stream paused",
                Map.of("active", newState)
        ));
    }

    @PostMapping("/pulse")
    public ResponseEntity<ApiResponse<String>> triggerPulse() {
        simulatorService.advancePilgrimFlow();
        simulatorService.recordDynamicCrowdSnapshots();
        return ResponseEntity.ok(ApiResponse.success("Immediate telemetry pulse generated", "OK"));
    }

    // ==========================================================
    // Digital Twin & RL Decision Sandbox Endpoints
    // ==========================================================

    @GetMapping("/sandbox/presets")
    public ResponseEntity<ApiResponse<List<Map<String, Object>>>> getPresetScenarios() {
        return ResponseEntity.ok(ApiResponse.success("Preset scenarios retrieved", digitalTwinService.getPresetScenarios()));
    }

    @PostMapping("/sandbox/run")
    public ResponseEntity<ApiResponse<SimulationRunResponse>> runDigitalTwinSimulation(@RequestBody SimulationRunRequest request) {
        SimulationRunResponse response = digitalTwinService.executeSimulation(request);
        return ResponseEntity.ok(ApiResponse.success("Digital twin simulation completed", response));
    }

    @PostMapping("/sandbox/compare")
    public ResponseEntity<ApiResponse<PolicyComparisonResponse>> comparePolicies(@RequestBody SimulationRunRequest request) {
        PolicyComparisonResponse response = digitalTwinService.executeMultiPolicyComparison(request);
        return ResponseEntity.ok(ApiResponse.success("Multi-policy decision comparison completed", response));
    }
}
