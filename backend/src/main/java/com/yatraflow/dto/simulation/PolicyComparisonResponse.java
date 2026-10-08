package com.yatraflow.dto.simulation;

import lombok.AllArgsConstructor;
import lombok.Builder;
import lombok.Data;
import lombok.NoArgsConstructor;

import java.util.List;
import java.util.Map;

@Data
@Builder
@NoArgsConstructor
@AllArgsConstructor
public class PolicyComparisonResponse {
    private String comparisonId;
    private String scenarioName;
    private String routeCode;
    private long commonRandomSeed;
    private int durationMinutes;
    private int virtualPilgrims;
    private String weatherCondition;
    private String executionTimestamp;

    private SimulationRunResponse policyAThreshold;
    private SimulationRunResponse policyBPPO;
    private SimulationRunResponse policyCDQN;

    // Direct comparative metric breakdown
    private PolicyComparisonMatrix comparisonMatrix;

    // AI Comparative Strategy Diagnosis
    private String comparativeAnalysis;
    private String recommendedPolicy;

    @Data
    @Builder
    @NoArgsConstructor
    @AllArgsConstructor
    public static class PolicyComparisonMatrix {
        private Map<String, Double> peakOccupancies;
        private Map<String, Double> averageWaitMinutes;
        private Map<String, Integer> throughputs;
        private Map<String, Integer> safetyViolations;
        private Map<String, Double> operationalScores;
        private Map<String, Double> evacuationTimes;
    }
}
