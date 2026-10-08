package com.yatraflow.dto.simulation;

import lombok.AllArgsConstructor;
import lombok.Builder;
import lombok.Data;
import lombok.NoArgsConstructor;

import java.util.List;

@Data
@Builder
@NoArgsConstructor
@AllArgsConstructor
public class SimulationRunRequest {
    private String routeCode; // RT-BALTAL, RT-PAHALGAM, RT-COMBINED
    private int simulationDurationMinutes; // 15, 30, 60, 120, 240
    private int virtualPilgrimCount; // e.g. 8500
    private String crowdDistributionPreset; // MORNING_RUSH, BALANCED, BASE_SURGE, MID_GRIDLOCK
    private String policyType; // POLICY_A_THRESHOLD, POLICY_B_PPO, POLICY_C_DQN, ALL_COMPARISON
    private String weatherCondition; // CLEAR, RAIN, STORM, FOG
    private double baseWalkingSpeedKmH; // e.g. 2.8
    private Long randomSeed; // For deterministic reproducible simulation
    private List<InterventionConfig> interventions;
}
