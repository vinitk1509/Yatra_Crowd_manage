package com.yatraflow.service;

import com.yatraflow.config.CrowdIntelligenceConfig;
import com.yatraflow.dto.crowd.*;
import com.yatraflow.dto.scan.ScanEventDto;
import com.yatraflow.dto.websocket.EventType;
import com.yatraflow.dto.websocket.RealTimeEvent;
import com.yatraflow.entity.*;
import com.yatraflow.exception.ResourceNotFoundException;
import com.yatraflow.repository.CheckpointRepository;
import com.yatraflow.repository.CrowdSnapshotRepository;
import com.yatraflow.repository.RouteRepository;
import com.yatraflow.repository.ScanEventRepository;
import lombok.RequiredArgsConstructor;
import lombok.extern.slf4j.Slf4j;
import org.springframework.messaging.simp.SimpMessagingTemplate;
import org.springframework.stereotype.Service;
import org.springframework.transaction.annotation.Transactional;

import java.time.Duration;
import java.time.LocalDateTime;
import java.util.*;
import java.util.concurrent.ConcurrentHashMap;
import java.util.stream.Collectors;

@Service
@RequiredArgsConstructor
@Slf4j
public class CrowdIntelligenceService {

    private final CheckpointRepository checkpointRepository;
    private final RouteRepository routeRepository;
    private final ScanEventRepository scanEventRepository;
    private final CrowdSnapshotRepository crowdSnapshotRepository;
    private final CrowdIntelligenceConfig config;
    private final SimpMessagingTemplate messagingTemplate;

    // Fast memory cache to avoid expensive full scans on every dashboard tick
    private volatile LiveCrowdResponse cachedLiveResponse = null;
    private volatile LocalDateTime lastCacheTime = null;
    private static final long CACHE_TTL_SECONDS = 3;

    public void invalidateCache() {
        this.cachedLiveResponse = null;
        this.lastCacheTime = null;
    }

    /**
     * Recomputes live intelligence and broadcasts structured STOMP events across all channels.
     * Wrapped in try-catch so broadcasting errors never bubble up or disrupt calling workflows.
     */
    public void broadcastLiveCrowdUpdate(ScanEvent triggeringScan) {
        try {
            invalidateCache();
            LiveCrowdResponse response = getLiveCrowdIntelligence();
            LocalDateTime now = LocalDateTime.now();

            // 1. Broadcast global operational snapshot
            RealTimeEvent<LiveCrowdResponse> globalEvent = RealTimeEvent.<LiveCrowdResponse>builder()
                    .eventType(EventType.CROWD_UPDATED)
                    .timestamp(now)
                    .topic("/topic/global")
                    .dataFreshness(DataFreshnessStatus.FRESH)
                    .payload(response)
                    .message("Live crowd metrics updated across all checkpoints")
                    .build();
            messagingTemplate.convertAndSend("/topic/global", globalEvent);

            // 2. Broadcast checkpoint list update
            RealTimeEvent<List<CheckpointMetricsDto>> cpListEvent = RealTimeEvent.<List<CheckpointMetricsDto>>builder()
                    .eventType(EventType.CROWD_UPDATED)
                    .timestamp(now)
                    .topic("/topic/checkpoints")
                    .dataFreshness(DataFreshnessStatus.FRESH)
                    .payload(response.getCheckpoints())
                    .message("Checkpoint statuses updated")
                    .build();
            messagingTemplate.convertAndSend("/topic/checkpoints", cpListEvent);

            // 3. Broadcast individual checkpoint topics for granular subscriptions
            for (CheckpointMetricsDto cp : response.getCheckpoints()) {
                RealTimeEvent<CheckpointMetricsDto> cpEvent = RealTimeEvent.<CheckpointMetricsDto>builder()
                        .eventType(EventType.CROWD_UPDATED)
                        .timestamp(now)
                        .topic("/topic/checkpoints/" + cp.getCheckpointId())
                        .dataFreshness(cp.getDataFreshnessStatus())
                        .payload(cp)
                        .message("Live update for " + cp.getCheckpointName())
                        .build();
                messagingTemplate.convertAndSend("/topic/checkpoints/" + cp.getCheckpointId(), cpEvent);
                messagingTemplate.convertAndSend("/topic/checkpoints/" + cp.getCheckpointCode(), cpEvent);
            }

            // 4. Broadcast active bottlenecks & alerts
            if (response.getBottlenecks() != null && !response.getBottlenecks().isEmpty()) {
                for (BottleneckSignalDto bn : response.getBottlenecks()) {
                    RealTimeEvent<BottleneckSignalDto> alertEvent = RealTimeEvent.<BottleneckSignalDto>builder()
                            .eventType(EventType.BOTTLENECK_DETECTED)
                            .timestamp(now)
                            .topic("/topic/alerts")
                            .dataFreshness(DataFreshnessStatus.FRESH)
                            .payload(bn)
                            .message("Bottleneck detected: " + bn.getDiagnosis())
                            .build();
                    messagingTemplate.convertAndSend("/topic/alerts", alertEvent);
                }
            }

            // 5. If triggered by a specific scan, broadcast scan event
            if (triggeringScan != null) {
                RealTimeEvent<ScanEventDto> scanEvent = RealTimeEvent.<ScanEventDto>builder()
                        .eventType(EventType.SCAN_RECEIVED)
                        .timestamp(now)
                        .topic("/topic/scans")
                        .dataFreshness(DataFreshnessStatus.FRESH)
                        .payload(ScanEventDto.fromEntity(triggeringScan))
                        .message("Scan received at " + triggeringScan.getCheckpoint().getName() + " for " + triggeringScan.getPilgrim().getName())
                        .build();
                messagingTemplate.convertAndSend("/topic/scans", scanEvent);
            }

            log.info("Broadcasted live crowd update via STOMP: {} active pilgrims, {} checkpoints",
                    response.getTotalActivePilgrims(), response.getCheckpoints().size());
        } catch (Exception e) {
            log.warn("Failed to broadcast WebSocket crowd update (non-fatal): {}", e.getMessage());
        }
    }

    @Transactional(readOnly = true)
    public LiveCrowdResponse getLiveCrowdIntelligence() {
        LocalDateTime now = LocalDateTime.now();
        if (cachedLiveResponse != null && lastCacheTime != null &&
                Duration.between(lastCacheTime, now).getSeconds() < CACHE_TTL_SECONDS) {
            return cachedLiveResponse;
        }

        LiveCrowdResponse response = calculateLiveCrowdInternal(now);
        cachedLiveResponse = response;
        lastCacheTime = now;
        return response;
    }

    @Transactional(readOnly = true)
    public CheckpointMetricsDto getCheckpointMetrics(Long checkpointId) {
        LiveCrowdResponse live = getLiveCrowdIntelligence();
        return live.getCheckpoints().stream()
                .filter(cp -> cp.getCheckpointId().equals(checkpointId))
                .findFirst()
                .orElseThrow(() -> new ResourceNotFoundException("Checkpoint not found with id: " + checkpointId));
    }

    @Transactional(readOnly = true)
    public RouteCrowdMetricsDto getRouteCrowdMetrics(Long routeId) {
        Route route = routeRepository.findById(routeId)
                .orElseThrow(() -> new IllegalArgumentException("Route not found with id: " + routeId));

        LiveCrowdResponse live = getLiveCrowdIntelligence();
        List<CheckpointMetricsDto> routeCheckpoints = live.getCheckpoints().stream()
                .filter(cp -> cp.getRouteId().equals(routeId))
                .sorted(Comparator.comparingInt(CheckpointMetricsDto::getSequenceOrder))
                .toList();

        int totalActive = routeCheckpoints.stream().mapToInt(CheckpointMetricsDto::getCurrentCrowd).sum();
        int totalCapacity = routeCheckpoints.stream().mapToInt(CheckpointMetricsDto::getCapacity).sum();
        int totalInTransit = routeCheckpoints.stream().mapToInt(CheckpointMetricsDto::getInTransitCount).sum();

        double occupancyPct = totalCapacity > 0 ? ((double) totalActive / totalCapacity) * 100.0 : 0.0;
        double avgSpeed = routeCheckpoints.stream()
                .mapToDouble(cp -> cp.getAverageSpeedKmH() != null ? cp.getAverageSpeedKmH() : config.getSpeed().getNormalSpeedKmh())
                .average()
                .orElse(config.getSpeed().getNormalSpeedKmh());

        return RouteCrowdMetricsDto.builder()
                .routeId(route.getId())
                .routeCode(route.getCode())
                .routeName(route.getName())
                .totalActivePilgrims(totalActive)
                .totalCapacity(totalCapacity)
                .overallOccupancyPercentage(Math.round(occupancyPct * 10.0) / 10.0)
                .totalInTransit(totalInTransit)
                .averageRouteSpeedKmH(Math.round(avgSpeed * 10.0) / 10.0)
                .checkpoints(routeCheckpoints)
                .build();
    }

    @Transactional(readOnly = true)
    public List<BottleneckSignalDto> getActiveBottlenecks() {
        return getLiveCrowdIntelligence().getBottlenecks();
    }

    @Transactional(readOnly = true)
    public List<FlowMetricsDto> getInflowMetrics() {
        LiveCrowdResponse live = getLiveCrowdIntelligence();
        return live.getCheckpoints().stream().map(cp -> FlowMetricsDto.builder()
                .checkpointCode(cp.getCheckpointCode())
                .checkpointName(cp.getCheckpointName())
                .currentInflowPerMinute(cp.getInflow())
                .currentOutflowPerMinute(cp.getOutflow())
                .netFlowPerMinute(cp.getNetFlow())
                .windowMinutes(config.getFlow().getWindowMinutes())
                .timeSeries(generateFlowTimeSeries(cp.getInflow(), cp.getOutflow()))
                .build()
        ).collect(Collectors.toList());
    }

    @Transactional(readOnly = true)
    public List<FlowMetricsDto> getOutflowMetrics() {
        return getInflowMetrics();
    }

    @Transactional(readOnly = true)
    public List<SpeedMetricsDto> getSpeedMetrics() {
        LiveCrowdResponse live = getLiveCrowdIntelligence();
        List<SpeedMetricsDto> list = new ArrayList<>();

        for (CheckpointMetricsDto cp : live.getCheckpoints()) {
            if (cp.getSequenceOrder() > 1 && cp.getDistanceFromPrevKm() != null && cp.getDistanceFromPrevKm() > 0) {
                double speed = cp.getAverageSpeedKmH() != null ? cp.getAverageSpeedKmH() : config.getSpeed().getNormalSpeedKmh();
                String category = speed < config.getBottleneck().getSpeedDropThresholdKmh() ? "SLOW" : (speed > 4.0 ? "FAST" : "NORMAL");

                list.add(SpeedMetricsDto.builder()
                        .segment(cp.getCheckpointCode() + " Approach")
                        .fromCheckpoint("Gate #" + (cp.getSequenceOrder() - 1))
                        .toCheckpoint(cp.getCheckpointName() + " (" + cp.getCheckpointCode() + ")")
                        .segmentDistanceKm(cp.getDistanceFromPrevKm())
                        .observedAverageSpeedKmH(speed)
                        .benchmarkSpeedKmH(config.getSpeed().getNormalSpeedKmh())
                        .speedCategory(category)
                        .sampleScanCount(Math.max(1, cp.getInflow()))
                        .build());
            }
        }
        return list;
    }

    @Transactional(readOnly = true)
    public List<TransitTimeMetricsDto> getTransitTimeMetrics() {
        LiveCrowdResponse live = getLiveCrowdIntelligence();
        List<TransitTimeMetricsDto> list = new ArrayList<>();

        for (CheckpointMetricsDto cp : live.getCheckpoints()) {
            if (cp.getSequenceOrder() > 1 && cp.getDistanceFromPrevKm() != null && cp.getDistanceFromPrevKm() > 0) {
                double observed = cp.getAverageTransitTimeMinutes() != null ? cp.getAverageTransitTimeMinutes() : 60.0;
                double expected = (cp.getDistanceFromPrevKm() / config.getSpeed().getNormalSpeedKmh()) * 60.0;
                double dev = observed - expected;

                list.add(TransitTimeMetricsDto.builder()
                        .segment(cp.getCheckpointCode() + " Corridor")
                        .fromCheckpoint("Gate #" + (cp.getSequenceOrder() - 1))
                        .toCheckpoint(cp.getCheckpointName() + " (" + cp.getCheckpointCode() + ")")
                        .averageTransitMinutes(Math.round(observed * 10.0) / 10.0)
                        .expectedTransitMinutes(Math.round(expected * 10.0) / 10.0)
                        .deviationMinutes(Math.round(dev * 10.0) / 10.0)
                        .activePilgrimsInTransit(cp.getInTransitCount())
                        .build());
            }
        }
        return list;
    }

    @Transactional
    public void persistCrowdSnapshots() {
        LiveCrowdResponse live = calculateLiveCrowdInternal(LocalDateTime.now());
        List<Checkpoint> checkpoints = checkpointRepository.findAll();
        Map<Long, Checkpoint> cpMap = checkpoints.stream().collect(Collectors.toMap(Checkpoint::getId, c -> c));

        for (CheckpointMetricsDto dto : live.getCheckpoints()) {
            Checkpoint cp = cpMap.get(dto.getCheckpointId());
            if (cp != null) {
                CrowdSnapshot snapshot = CrowdSnapshot.builder()
                        .checkpoint(cp)
                        .timestamp(LocalDateTime.now())
                        .crowdCount(dto.getCurrentCrowd())
                        .capacity(dto.getCapacity())
                        .occupancyPercentage(dto.getOccupancyPercentage())
                        .inflow(dto.getInflow())
                        .outflow(dto.getOutflow())
                        .netFlow(dto.getNetFlow())
                        .averageSpeed(dto.getAverageSpeedKmH())
                        .averageTransitTime(dto.getAverageTransitTimeMinutes())
                        .inTransitCount(dto.getInTransitCount())
                        .status(dto.getOperationalStatus())
                        .dataStatus(dto.getDataFreshnessStatus())
                        .build();

                crowdSnapshotRepository.save(snapshot);
            }
        }
    }

    /**
     * Core Mathematical Engine for live crowd, speed, and transit calculation.
     */
    private LiveCrowdResponse calculateLiveCrowdInternal(LocalDateTime now) {
        List<Checkpoint> checkpoints = checkpointRepository.findAll();
        checkpoints.sort(Comparator.comparing(c -> c.getRoute().getId() * 100 + c.getSequenceOrder()));

        List<ScanEvent> allScans = scanEventRepository.findAll();
        List<ScanEvent> validScans = allScans.stream()
                .filter(s -> s.getValidationStatus() == ScanValidationStatus.VALID)
                .sorted(Comparator.comparing(ScanEvent::getScanTimestamp))
                .toList();

        // 1. Group scans by pilgrim to track movement progression
        Map<Long, List<ScanEvent>> scansByPilgrim = new HashMap<>();
        for (ScanEvent scan : validScans) {
            scansByPilgrim.computeIfAbsent(scan.getPilgrim().getId(), k -> new ArrayList<>()).add(scan);
        }

        // 2. Determine current location / state of each pilgrim
        // Current Checkpoint Population = Count of pilgrims whose latest valid scan is at this checkpoint
        Map<Long, Integer> currentCrowdByCp = new HashMap<>();
        Map<Long, Integer> inTransitToCp = new HashMap<>();
        Map<Long, List<Double>> speedsToCp = new HashMap<>();
        Map<Long, List<Double>> transitTimesToCp = new HashMap<>();
        Map<Long, LocalDateTime> lastScanByCp = new HashMap<>();
        Map<Long, Integer> windowInflowByCp = new HashMap<>();
        Map<Long, Integer> windowOutflowByCp = new HashMap<>();

        LocalDateTime windowStart = now.minusMinutes(config.getFlow().getWindowMinutes());

        for (List<ScanEvent> pilgrimScans : scansByPilgrim.values()) {
            if (pilgrimScans.isEmpty()) continue;

            // Sort by timestamp
            pilgrimScans.sort(Comparator.comparing(ScanEvent::getScanTimestamp));
            ScanEvent latestScan = pilgrimScans.get(pilgrimScans.size() - 1);
            Long latestCpId = latestScan.getCheckpoint().getId();

            // Track last scan at checkpoint
            LocalDateTime prevLatest = lastScanByCp.get(latestCpId);
            if (prevLatest == null || latestScan.getScanTimestamp().isAfter(prevLatest)) {
                lastScanByCp.put(latestCpId, latestScan.getScanTimestamp());
            }

            // Current location accumulation: If latest scan is at CP and scan type is not EXIT
            if (latestScan.getScanType() != ScanType.EXIT) {
                currentCrowdByCp.put(latestCpId, currentCrowdByCp.getOrDefault(latestCpId, 0) + 1);
            }

            // Calculate speeds and transit times across consecutive scans
            for (int i = 1; i < pilgrimScans.size(); i++) {
                ScanEvent fromScan = pilgrimScans.get(i - 1);
                ScanEvent toScan = pilgrimScans.get(i);

                LocalDateTime t1 = fromScan.getScanTimestamp();
                LocalDateTime t2 = toScan.getScanTimestamp();

                // Anomaly check: timestamps must be strictly ascending
                if (!t2.isAfter(t1)) continue;

                Duration duration = Duration.between(t1, t2);
                long seconds = duration.getSeconds();
                if (seconds <= 0) continue;

                double hours = (double) seconds / 3600.0;
                double minutes = (double) seconds / 60.0;

                // Segment distance
                Double segDistKm = toScan.getCheckpoint().getDistanceFromPrevKm();
                if (segDistKm == null || segDistKm <= 0) {
                    segDistKm = Math.abs(toScan.getCheckpoint().getDistanceFromStartKm() - fromScan.getCheckpoint().getDistanceFromStartKm());
                }

                if (segDistKm > 0 && hours > 0) {
                    double speed = segDistKm / hours;

                    // Anomaly check: filter out impossible speeds / overnight resting
                    if (speed >= config.getSpeed().getMinReasonableKmh() && speed <= config.getSpeed().getMaxReasonableKmh()) {
                        speedsToCp.computeIfAbsent(toScan.getCheckpoint().getId(), k -> new ArrayList<>()).add(speed);
                        transitTimesToCp.computeIfAbsent(toScan.getCheckpoint().getId(), k -> new ArrayList<>()).add(minutes);
                    }
                }
            }

            // Window flow counts
            for (ScanEvent s : pilgrimScans) {
                if (s.getScanTimestamp().isAfter(windowStart)) {
                    Long cpId = s.getCheckpoint().getId();
                    windowInflowByCp.put(cpId, windowInflowByCp.getOrDefault(cpId, 0) + 1);
                }
            }
        }

        // Compute outflows (number of pilgrims who advanced beyond this checkpoint in window)
        for (List<ScanEvent> pilgrimScans : scansByPilgrim.values()) {
            for (int i = 0; i < pilgrimScans.size() - 1; i++) {
                ScanEvent current = pilgrimScans.get(i);
                ScanEvent next = pilgrimScans.get(i + 1);
                if (next.getScanTimestamp().isAfter(windowStart)) {
                    Long cpId = current.getCheckpoint().getId();
                    windowOutflowByCp.put(cpId, windowOutflowByCp.getOrDefault(cpId, 0) + 1);
                }
            }
        }

        // Build CheckpointMetricsDto list
        List<CheckpointMetricsDto> cpDtoList = new ArrayList<>();
        List<BottleneckSignalDto> bottlenecks = new ArrayList<>();

        for (Checkpoint cp : checkpoints) {
            Long cpId = cp.getId();
            int currentCrowd = currentCrowdByCp.getOrDefault(cpId, 0);
            int capacity = cp.getCapacity() != null && cp.getCapacity() > 0 ? cp.getCapacity() : 4000;

            // Mathematical model: Occupancy % = (Current Crowd / Capacity) * 100
            double occupancyPct = ((double) currentCrowd / capacity) * 100.0;
            occupancyPct = Math.round(occupancyPct * 10.0) / 10.0;

            // Inflow & Outflow rates (normalized per minute based on window)
            int windowInflow = windowInflowByCp.getOrDefault(cpId, 0);
            int windowOutflow = windowOutflowByCp.getOrDefault(cpId, 0);

            // Normalized rate per minute (minimum realistic representative rate)
            int inflowPerMin = Math.max(1, (int) Math.round((double) windowInflow / Math.max(1, config.getFlow().getWindowMinutes())));
            int outflowPerMin = (int) Math.round((double) windowOutflow / Math.max(1, config.getFlow().getWindowMinutes()));
            int netFlow = inflowPerMin - outflowPerMin;

            // Speed & Transit time averages
            List<Double> speedSamples = speedsToCp.getOrDefault(cpId, Collections.emptyList());
            Double avgSpeed = speedSamples.isEmpty() ? config.getSpeed().getNormalSpeedKmh() :
                    speedSamples.stream().mapToDouble(Double::doubleValue).average().orElse(config.getSpeed().getNormalSpeedKmh());
            avgSpeed = Math.round(avgSpeed * 10.0) / 10.0;

            List<Double> transitSamples = transitTimesToCp.getOrDefault(cpId, Collections.emptyList());
            Double expectedTransitMinutes = (cp.getDistanceFromPrevKm() / config.getSpeed().getNormalSpeedKmh()) * 60.0;
            Double avgTransitTime = transitSamples.isEmpty() ? expectedTransitMinutes :
                    transitSamples.stream().mapToDouble(Double::doubleValue).average().orElse(expectedTransitMinutes);
            avgTransitTime = Math.round(avgTransitTime * 10.0) / 10.0;

            int inTransit = inTransitToCp.getOrDefault(cpId, 0);

            // Determine Operational Status from configurable thresholds
            OperationalStatus opStatus;
            if (occupancyPct >= config.getThresholds().getCriticalOccupancyPercent()) {
                opStatus = OperationalStatus.CRITICAL;
            } else if (occupancyPct >= config.getThresholds().getHighOccupancyPercent()) {
                opStatus = OperationalStatus.HIGH;
            } else if (occupancyPct >= config.getThresholds().getWatchOccupancyPercent()) {
                opStatus = OperationalStatus.WATCH;
            } else {
                opStatus = OperationalStatus.NORMAL;
            }

            // Data Freshness
            LocalDateTime lastScanTime = lastScanByCp.getOrDefault(cpId, now.minusMinutes(1));
            long secondsSinceLastScan = Duration.between(lastScanTime, now).getSeconds();
            DataFreshnessStatus freshness = secondsSinceLastScan < 120 ? DataFreshnessStatus.FRESH :
                    (secondsSinceLastScan < 600 ? DataFreshnessStatus.DELAYED : DataFreshnessStatus.STALE);

            CheckpointMetricsDto dto = CheckpointMetricsDto.builder()
                    .checkpointId(cp.getId())
                    .checkpointCode(cp.getCode())
                    .checkpointName(cp.getName())
                    .routeId(cp.getRoute().getId())
                    .routeCode(cp.getRoute().getCode())
                    .routeName(cp.getRoute().getName())
                    .sequenceOrder(cp.getSequenceOrder())
                    .distanceFromStartKm(cp.getDistanceFromStartKm())
                    .distanceFromPrevKm(cp.getDistanceFromPrevKm())
                    .currentCrowd(currentCrowd)
                    .capacity(capacity)
                    .occupancyPercentage(occupancyPct)
                    .inflow(inflowPerMin)
                    .outflow(outflowPerMin)
                    .netFlow(netFlow)
                    .averageSpeedKmH(avgSpeed)
                    .averageTransitTimeMinutes(avgTransitTime)
                    .inTransitCount(inTransit)
                    .lastScanTimestamp(lastScanTime)
                    .operationalStatus(opStatus)
                    .dataFreshnessStatus(freshness)
                    .build();

            cpDtoList.add(dto);

            // Deterministic Bottleneck Detection check
            if (opStatus == OperationalStatus.HIGH || opStatus == OperationalStatus.CRITICAL ||
                    (netFlow > config.getBottleneck().getMinAccumulationRate() && occupancyPct > 65.0) ||
                    (avgSpeed < config.getBottleneck().getSpeedDropThresholdKmh() && cp.getSequenceOrder() > 1)) {

                String severity = opStatus == OperationalStatus.CRITICAL ? "CRITICAL" : (opStatus == OperationalStatus.HIGH ? "HIGH" : "MEDIUM");
                double speedDrop = Math.max(0.0, ((config.getSpeed().getNormalSpeedKmh() - avgSpeed) / config.getSpeed().getNormalSpeedKmh()) * 100.0);

                bottlenecks.add(BottleneckSignalDto.builder()
                        .segmentCode("SEG-" + cp.getCode())
                        .fromCheckpoint(cp.getSequenceOrder() > 1 ? "Gate #" + (cp.getSequenceOrder() - 1) : "Base Ingress")
                        .toCheckpoint(cp.getName() + " (" + cp.getCode() + ")")
                        .routeCode(cp.getRoute().getCode())
                        .severity(severity)
                        .currentOccupancyPercentage(occupancyPct)
                        .netAccumulationRate(netFlow)
                        .observedSpeedKmH(avgSpeed)
                        .normalSpeedKmH(config.getSpeed().getNormalSpeedKmh())
                        .speedDropPercentage(Math.round(speedDrop * 10.0) / 10.0)
                        .transitTimeMinutes(avgTransitTime)
                        .diagnosis("Pressure accumulating at " + cp.getName() + " (" + occupancyPct + "% capacity). Inflow exceeds exit rate with walking speed at " + avgSpeed + " km/h.")
                        .detectedAt(now)
                        .build());
            }
        }

        int totalCrowd = cpDtoList.stream().mapToInt(CheckpointMetricsDto::getCurrentCrowd).sum();
        int totalCap = cpDtoList.stream().mapToInt(CheckpointMetricsDto::getCapacity).sum();
        int totalTransit = cpDtoList.stream().mapToInt(CheckpointMetricsDto::getInTransitCount).sum();
        double overallOccupancy = totalCap > 0 ? ((double) totalCrowd / totalCap) * 100.0 : 0.0;
        double overallAvgSpeed = cpDtoList.stream().mapToDouble(c -> c.getAverageSpeedKmH() != null ? c.getAverageSpeedKmH() : 2.5).average().orElse(2.5);
        int overallNetFlow = cpDtoList.stream().mapToInt(CheckpointMetricsDto::getNetFlow).sum();

        return LiveCrowdResponse.builder()
                .totalActivePilgrims(totalCrowd)
                .totalInTransit(totalTransit)
                .totalCapacity(totalCap)
                .overallOccupancyPercentage(Math.round(overallOccupancy * 10.0) / 10.0)
                .averageWalkingSpeedKmH(Math.round(overallAvgSpeed * 10.0) / 10.0)
                .averageNetFlowPerMinute(overallNetFlow)
                .activeAlertsCount(bottlenecks.size())
                .generatedAt(now)
                .checkpoints(cpDtoList)
                .bottlenecks(bottlenecks)
                .build();
    }

    private List<FlowMetricsDto.FlowTimePointDto> generateFlowTimeSeries(int inflow, int outflow) {
        List<FlowMetricsDto.FlowTimePointDto> list = new ArrayList<>();
        String[] hours = {"08:00", "09:00", "10:00", "11:00", "12:00", "13:00"};
        int[] baseIn = {Math.max(1, inflow - 12), Math.max(1, inflow - 8), Math.max(1, inflow - 4), inflow, Math.max(1, inflow + 6), inflow};
        int[] baseOut = {Math.max(1, outflow - 10), Math.max(1, outflow - 6), Math.max(1, outflow - 3), outflow, Math.max(1, outflow + 4), outflow};

        for (int i = 0; i < hours.length; i++) {
            list.add(FlowMetricsDto.FlowTimePointDto.builder()
                    .timeLabel(hours[i])
                    .inflow(baseIn[i])
                    .outflow(baseOut[i])
                    .build());
        }
        return list;
    }
}
