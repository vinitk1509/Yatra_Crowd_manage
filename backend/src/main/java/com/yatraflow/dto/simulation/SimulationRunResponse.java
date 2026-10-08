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
public class SimulationRunResponse {
    private String runId;
    private String scenarioName;
    private String routeCode;
    private String policyType;
    private String policyLabel;
    private long randomSeed;
    private int durationMinutes;
    private int totalPilgrimsSimulated;
    private String executionTimestamp;
    private boolean deterministic;

    // Summary Performance Metrics
    private double peakOccupancyPercentage;
    private double averageOccupancyPercentage;
    private double estimatedAverageWaitMinutes;
    private int totalQueueLength;
    private int congestionEventsCount;
    private int netPilgrimThroughput;
    private double averageGateReleaseRate;
    private double estimatedEvacuationMinutes;
    private int safetyThresholdViolations;
    private double operationalPerformanceScore; // 0 to 100

    // Time-series Progression (Per minute or step)
    private List<SimulationStepData> timeline;

    // Checkpoint Summary Breakdown
    private List<SimulatedCheckpointSummary> checkpointSummaries;

    // Interventions Applied
    private List<InterventionConfig> activeInterventions;

    // AI Strategic Analysis
    private String strategicDiagnosis;

    @Data
    @Builder
    @NoArgsConstructor
    @AllArgsConstructor
    public static class SimulationStepData {
        private int minute;
        private String timeLabel;
        private int totalCorridorCrowd;
        private int totalQueued;
        private int throughputCumulative;
        private double averageSpeedKmH;
        private Map<String, Integer> checkpointCrowds;
        private Map<String, Double> checkpointOccupancies;
        private Map<String, Double> gateReleaseRates;
        private Map<String, Integer> segmentQueues;
    }

    @Data
    @Builder
    @NoArgsConstructor
    @AllArgsConstructor
    public static class SimulatedCheckpointSummary {
        private String checkpointCode;
        private String checkpointName;
        private int capacity;
        private int peakCrowd;
        private double peakOccupancy;
        private double averageOccupancy;
        private int totalEntered;
        private int totalExited;
        private int peakQueueLength;
        private double averageWaitTimeMinutes;
        private int safetyViolationMinutes;
    }
}
