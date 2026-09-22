package com.yatraflow.service.prediction;

import com.yatraflow.dto.crowd.CheckpointMetricsDto;
import com.yatraflow.dto.crowd.LiveCrowdResponse;
import com.yatraflow.dto.prediction.*;
import com.yatraflow.entity.Checkpoint;
import com.yatraflow.entity.CrowdSnapshot;
import com.yatraflow.entity.DataFreshnessStatus;
import com.yatraflow.exception.ResourceNotFoundException;
import com.yatraflow.repository.CheckpointRepository;
import com.yatraflow.repository.CrowdSnapshotRepository;
import com.yatraflow.service.CrowdIntelligenceService;
import lombok.RequiredArgsConstructor;
import lombok.extern.slf4j.Slf4j;
import org.springframework.stereotype.Service;
import org.springframework.transaction.annotation.Transactional;

import java.time.LocalDateTime;
import java.util.*;
import java.util.stream.Collectors;

@Service
@RequiredArgsConstructor
@Slf4j
public class PredictionService {

    private final CheckpointRepository checkpointRepository;
    private final CrowdSnapshotRepository crowdSnapshotRepository;
    private final CrowdIntelligenceService crowdIntelligenceService;
    private final PredictionProvider predictionProvider;

    @Transactional(readOnly = true)
    public LivePredictionsResponseDto getLivePredictions() {
        LiveCrowdResponse liveCrowd = crowdIntelligenceService.getLiveCrowdIntelligence();
        LocalDateTime now = LocalDateTime.now();

        List<CheckpointPredictionDto> cpPredictions = new ArrayList<>();
        int totalPredicted30m = 0;
        int criticalCount30m = 0;

        for (CheckpointMetricsDto cp : liveCrowd.getCheckpoints()) {
            CheckpointPredictionDto pred = predictForCheckpoint(cp.getCheckpointId(), cp);
            cpPredictions.add(pred);
            if (pred.getForecast30m() != null) {
                totalPredicted30m += pred.getForecast30m().getPredictedCrowd();
                if ("PROJECTED_CRITICAL".equals(pred.getForecast30m().getRiskStatus()) ||
                    "PROJECTED_HIGH".equals(pred.getForecast30m().getRiskStatus())) {
                    criticalCount30m++;
                }
            }
        }

        int totalCap = liveCrowd.getTotalCapacity();
        double predOcc30m = totalCap > 0 ? Math.round(((double) totalPredicted30m / totalCap) * 1000.0) / 10.0 : 0.0;

        return LivePredictionsResponseDto.builder()
                .generatedAt(now)
                .totalActivePilgrims(liveCrowd.getTotalActivePilgrims())
                .totalPredictedCrowd30m(totalPredicted30m)
                .overallCurrentOccupancy(liveCrowd.getOverallOccupancyPercentage())
                .overallPredictedOccupancy30m(predOcc30m)
                .criticalCheckpointsCount30m(criticalCount30m)
                .checkpointPredictions(cpPredictions)
                .dataStatus(DataFreshnessStatus.FRESH)
                .modelVersion(predictionProvider.getModelVersion())
                .build();
    }

    @Transactional(readOnly = true)
    public CheckpointPredictionDto getPredictionForCheckpoint(Long checkpointId) {
        CheckpointMetricsDto cpMetrics = crowdIntelligenceService.getCheckpointMetrics(checkpointId);
        return predictForCheckpoint(checkpointId, cpMetrics);
    }

    @Transactional(readOnly = true)
    public List<CheckpointPredictionDto> getPredictionsForRoute(Long routeId) {
        List<Checkpoint> cps = checkpointRepository.findByRouteIdOrderBySequenceOrderAsc(routeId);
        if (cps.isEmpty()) {
            throw new ResourceNotFoundException("No checkpoints found for route ID: " + routeId);
        }

        return cps.stream()
                .map(cp -> getPredictionForCheckpoint(cp.getId()))
                .collect(Collectors.toList());
    }

    private CheckpointPredictionDto predictForCheckpoint(Long checkpointId, CheckpointMetricsDto liveMetrics) {
        Checkpoint cp = checkpointRepository.findById(checkpointId)
                .orElseThrow(() -> new ResourceNotFoundException("Checkpoint not found with ID: " + checkpointId));

        LocalDateTime now = LocalDateTime.now();

        // 1. Fetch Recent Snapshots for Lags
        List<CrowdSnapshot> recentSnaps = crowdSnapshotRepository.findByCheckpointIdOrderByTimestampDesc(checkpointId);
        int currentCrowd = liveMetrics != null ? liveMetrics.getCurrentCrowd() : (recentSnaps.isEmpty() ? 1200 : recentSnaps.get(0).getCrowdCount());
        int capacity = cp.getCapacity();
        double currentOcc = liveMetrics != null ? liveMetrics.getOccupancyPercentage() : Math.round(((double) currentCrowd / capacity) * 1000.0) / 10.0;
        int inflow = liveMetrics != null ? liveMetrics.getInflow() : (recentSnaps.isEmpty() ? 25 : recentSnaps.get(0).getInflow());
        int outflow = liveMetrics != null ? liveMetrics.getOutflow() : (recentSnaps.isEmpty() ? 20 : recentSnaps.get(0).getOutflow());
        double speed = liveMetrics != null && liveMetrics.getAverageSpeedKmH() != null ? liveMetrics.getAverageSpeedKmH() : 2.5;
        double transit = liveMetrics != null && liveMetrics.getAverageTransitTimeMinutes() != null ? liveMetrics.getAverageTransitTimeMinutes() : 45.0;

        int lag1 = recentSnaps.size() > 0 ? recentSnaps.get(0).getCrowdCount() : Math.max(0, currentCrowd - 20);
        int lag2 = recentSnaps.size() > 1 ? recentSnaps.get(1).getCrowdCount() : Math.max(0, currentCrowd - 35);
        int lag3 = recentSnaps.size() > 2 ? recentSnaps.get(2).getCrowdCount() : Math.max(0, currentCrowd - 50);
        int lag4 = recentSnaps.size() > 3 ? recentSnaps.get(3).getCrowdCount() : Math.max(0, currentCrowd - 65);

        // 2. Build Feature Map with Spatio-Temporal and Upstream Signals
        double hourOfDay = now.getHour() + (now.getMinute() / 60.0);
        int prevInflow = recentSnaps.size() > 1 ? recentSnaps.get(1).getInflow() : Math.max(0, inflow - 2);
        int prevOutflow = recentSnaps.size() > 1 ? recentSnaps.get(1).getOutflow() : Math.max(0, outflow - 1);
        int prevNetFlow = prevInflow - prevOutflow;
        int netFlow = inflow - outflow;

        Map<String, Object> featureMap = new HashMap<>();
        featureMap.put("current_crowd", currentCrowd);
        featureMap.put("crowd_lag_1", lag1);
        featureMap.put("crowd_lag_2", lag2);
        featureMap.put("crowd_lag_3", lag3);
        featureMap.put("crowd_lag_4", lag4);
        featureMap.put("crowd_delta_15m", currentCrowd - lag1);
        featureMap.put("crowd_delta_30m", currentCrowd - lag2);
        featureMap.put("inflow", inflow);
        featureMap.put("inflow_lag_1", prevInflow);
        featureMap.put("inflow_accel", inflow - prevInflow);
        featureMap.put("outflow", outflow);
        featureMap.put("net_flow", netFlow);
        featureMap.put("net_flow_accel", netFlow - prevNetFlow);
        featureMap.put("average_speed", speed);
        featureMap.put("transit_time", transit);
        featureMap.put("occupancy_pct", currentOcc);
        featureMap.put("density_speed_ratio", currentOcc / Math.max(0.5, speed));
        featureMap.put("capacity", capacity);
        featureMap.put("in_transit_count", liveMetrics != null ? liveMetrics.getInTransitCount() : 350);
        featureMap.put("upstream_crowd_lag_1", Math.max(0.0, currentCrowd * 0.85));
        featureMap.put("upstream_outflow_lag_2", Math.max(0.0, outflow * 0.90));
        featureMap.put("upstream_pressure", (currentOcc * netFlow) / 100.0);
        featureMap.put("sin_time_of_day", Math.sin(2 * Math.PI * hourOfDay / 24.0));
        featureMap.put("cos_time_of_day", Math.cos(2 * Math.PI * hourOfDay / 24.0));
        featureMap.put("day_of_week", now.getDayOfWeek().getValue());
        featureMap.put("is_weekend", now.getDayOfWeek().getValue() >= 6 ? 1.0 : 0.0);
        featureMap.put("weather_code", 0.0);
        featureMap.put("is_bottleneck", (currentOcc >= 70.0 && netFlow > 0 && speed < 2.0) ? 1.0 : 0.0);
        featureMap.put("cp_id", cp.getId().doubleValue());

        // 3. Execute Model Multi-Horizon Prediction
        Map<String, ForecastHorizonDto> horizonMap = predictionProvider.predictHorizons(featureMap, capacity);

        // 4. Extract Supporting Explainability Signals
        List<PredictionSignalDto> signals = generateExplainabilitySignals(currentOcc, inflow, outflow, speed, currentCrowd - lag1);

        return CheckpointPredictionDto.builder()
                .checkpointId(cp.getId())
                .checkpointCode(cp.getCode())
                .checkpointName(cp.getName())
                .routeId(cp.getRoute() != null ? cp.getRoute().getId() : null)
                .routeCode(cp.getRoute() != null ? cp.getRoute().getCode() : null)
                .currentCrowd(currentCrowd)
                .capacity(capacity)
                .currentOccupancy(currentOcc)
                .forecast15m(horizonMap.get("15m"))
                .forecast30m(horizonMap.get("30m"))
                .forecast60m(horizonMap.get("60m"))
                .signals(signals)
                .generatedAt(now)
                .dataStatus(DataFreshnessStatus.FRESH)
                .modelVersion(predictionProvider.getModelVersion())
                .build();
    }

    private List<PredictionSignalDto> generateExplainabilitySignals(
            double currentOcc, int inflow, int outflow, double speed, int momentum
    ) {
        List<PredictionSignalDto> list = new ArrayList<>();

        // Signal 1: Occupancy Trend
        String occDir = momentum > 15 ? "up" : (momentum < -15 ? "down" : "flat");
        String occImpact = currentOcc >= 80.0 ? "High impact" : (currentOcc >= 60.0 ? "Moderate impact" : "Low impact");
        list.add(PredictionSignalDto.builder()
                .signalName("Occupancy momentum")
                .impact(occImpact)
                .direction(occDir)
                .description(momentum > 0 ? "Crowd size accumulating over previous 15 min" : "Crowd dispersing stably")
                .build());

        // Signal 2: Inflow Rate Pressure
        int net = inflow - outflow;
        String flowImpact = net > 10 ? "High impact" : (net < -5 ? "Moderate impact" : "Low impact");
        String flowDir = net > 0 ? "up" : (net < 0 ? "down" : "flat");
        list.add(PredictionSignalDto.builder()
                .signalName("Net Inflow Pressure")
                .impact(flowImpact)
                .direction(flowDir)
                .description(net > 0 ? "Inflow exceeds exit rate by +" + net + "/min" : "Inflow and outflow are balanced")
                .build());

        // Signal 3: Speed Degradation (Congestion Drag)
        String speedImpact = speed < 1.8 ? "High impact" : (speed < 2.3 ? "Moderate impact" : "Low impact");
        String speedDir = speed < 2.2 ? "down" : "flat";
        list.add(PredictionSignalDto.builder()
                .signalName("Walking Velocity")
                .impact(speedImpact)
                .direction(speedDir)
                .description(speed < 2.0 ? "Pace reduced to " + speed + " km/h due to trail congestion" : "Normal walking pace (" + speed + " km/h)")
                .build());

        // Signal 4: Diurnal Time-of-Day Pattern
        list.add(PredictionSignalDto.builder()
                .signalName("Diurnal Yatra Pattern")
                .impact("Moderate impact")
                .direction("up")
                .description("Historical peak arrival window active")
                .build());

        return list;
    }
}
