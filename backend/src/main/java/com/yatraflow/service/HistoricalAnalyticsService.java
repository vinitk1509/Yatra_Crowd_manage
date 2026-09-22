package com.yatraflow.service;

import com.yatraflow.dto.analytics.HistoricalAnalyticsResponseDto;
import com.yatraflow.dto.analytics.HistoricalAnalyticsSummaryDto;
import com.yatraflow.dto.analytics.HistoricalTimeSeriesPointDto;
import com.yatraflow.dto.analytics.MlTrainingSequenceDto;
import com.yatraflow.entity.*;
import com.yatraflow.exception.BadRequestException;
import com.yatraflow.repository.CheckpointRepository;
import com.yatraflow.repository.CrowdSnapshotRepository;
import com.yatraflow.repository.RouteRepository;
import lombok.RequiredArgsConstructor;
import lombok.extern.slf4j.Slf4j;
import org.springframework.stereotype.Service;
import org.springframework.transaction.annotation.Transactional;

import java.time.Duration;
import java.time.LocalDateTime;
import java.time.format.DateTimeFormatter;
import java.time.temporal.ChronoUnit;
import java.util.*;
import java.util.stream.Collectors;

@Service
@RequiredArgsConstructor
@Slf4j
public class HistoricalAnalyticsService {

    private final CrowdSnapshotRepository crowdSnapshotRepository;
    private final CheckpointRepository checkpointRepository;
    private final RouteRepository routeRepository;

    private static final DateTimeFormatter TIME_LABEL_FMT = DateTimeFormatter.ofPattern("HH:mm");
    private static final DateTimeFormatter DATE_TIME_LABEL_FMT = DateTimeFormatter.ofPattern("MM-dd HH:mm");

    @Transactional(readOnly = true)
    public HistoricalAnalyticsResponseDto getHistoricalAnalytics(
            Long checkpointId,
            String checkpointCode,
            Long routeId,
            LocalDateTime startTime,
            LocalDateTime endTime,
            String interval,
            boolean includeMlSequences
    ) {
        // 1. Validate & Normalize Parameters
        LocalDateTime start = startTime != null ? startTime : LocalDateTime.now().minusHours(24);
        LocalDateTime end = endTime != null ? endTime : LocalDateTime.now();
        String intvl = (interval != null && !interval.trim().isEmpty()) ? interval.trim().toLowerCase() : "1h";

        if (start.isAfter(end)) {
            throw new BadRequestException("Start date/time (" + start + ") cannot be after end date/time (" + end + ")");
        }

        if (Duration.between(start, end).toDays() > 60) {
            throw new BadRequestException("Date range cannot exceed 60 days");
        }

        // 2. Fetch Matching Snapshots
        List<CrowdSnapshot> snapshots;
        String cpCodeFound = checkpointCode;
        String routeCodeFound = null;

        if (checkpointId != null) {
            snapshots = crowdSnapshotRepository.findByCheckpointIdAndTimestampBetweenOrderByTimestampAsc(checkpointId, start, end);
            Checkpoint cp = checkpointRepository.findById(checkpointId).orElse(null);
            if (cp != null) cpCodeFound = cp.getCode();
        } else if (checkpointCode != null && !checkpointCode.isBlank()) {
            snapshots = crowdSnapshotRepository.findByCheckpointCodeAndTimestampBetweenOrderByTimestampAsc(checkpointCode, start, end);
        } else if (routeId != null) {
            snapshots = crowdSnapshotRepository.findByRouteIdAndTimestampBetweenOrderByTimestampAsc(routeId, start, end);
            Route r = routeRepository.findById(routeId).orElse(null);
            if (r != null) routeCodeFound = r.getCode();
        } else {
            snapshots = crowdSnapshotRepository.findByTimestampBetweenOrderByTimestampAsc(start, end);
        }

        // 3. Aggregate Snapshots into Time Buckets
        long intervalSeconds = parseIntervalToSeconds(intvl);
        List<HistoricalTimeSeriesPointDto> timeSeries = aggregateIntoBuckets(snapshots, intervalSeconds);

        // 4. Calculate Derived Analytics Summaries
        HistoricalAnalyticsSummaryDto summary = calculateSummary(timeSeries, intervalSeconds);

        // 5. Generate ML Sequences if requested
        List<MlTrainingSequenceDto> mlSequences = includeMlSequences ? generateMlSequences(timeSeries) : Collections.emptyList();

        return HistoricalAnalyticsResponseDto.builder()
                .startTime(start)
                .endTime(end)
                .interval(intvl)
                .checkpointId(checkpointId)
                .checkpointCode(cpCodeFound)
                .routeId(routeId)
                .routeCode(routeCodeFound)
                .summary(summary)
                .timeSeries(timeSeries)
                .mlSequences(mlSequences)
                .build();
    }

    private long parseIntervalToSeconds(String interval) {
        return switch (interval) {
            case "5m" -> 300L;
            case "15m" -> 900L;
            case "30m" -> 1800L;
            case "1h" -> 3600L;
            case "1d" -> 86400L;
            default -> 3600L;
        };
    }

    private List<HistoricalTimeSeriesPointDto> aggregateIntoBuckets(List<CrowdSnapshot> snapshots, long intervalSeconds) {
        if (snapshots == null || snapshots.isEmpty()) {
            return Collections.emptyList();
        }

        // Group snapshots by bucket timestamp
        Map<LocalDateTime, List<CrowdSnapshot>> bucketMap = new TreeMap<>();
        for (CrowdSnapshot s : snapshots) {
            LocalDateTime bucketTime = roundToBucket(s.getTimestamp(), intervalSeconds);
            bucketMap.computeIfAbsent(bucketTime, k -> new ArrayList<>()).add(s);
        }

        List<HistoricalTimeSeriesPointDto> result = new ArrayList<>();
        for (Map.Entry<LocalDateTime, List<CrowdSnapshot>> entry : bucketMap.entrySet()) {
            LocalDateTime bucketTime = entry.getKey();
            List<CrowdSnapshot> bucketSnapshots = entry.getValue();

            int avgCrowd = (int) Math.round(bucketSnapshots.stream().mapToInt(CrowdSnapshot::getCrowdCount).average().orElse(0));
            int avgCap = (int) Math.round(bucketSnapshots.stream().mapToInt(CrowdSnapshot::getCapacity).average().orElse(4000));
            double avgOcc = bucketSnapshots.stream().mapToDouble(CrowdSnapshot::getOccupancyPercentage).average().orElse(0.0);
            int avgInflow = (int) Math.round(bucketSnapshots.stream().mapToInt(CrowdSnapshot::getInflow).average().orElse(0));
            int avgOutflow = (int) Math.round(bucketSnapshots.stream().mapToInt(CrowdSnapshot::getOutflow).average().orElse(0));
            int avgNet = avgInflow - avgOutflow;
            double avgSpeed = bucketSnapshots.stream()
                    .mapToDouble(s -> s.getAverageSpeed() != null ? s.getAverageSpeed() : 2.5)
                    .average().orElse(2.5);
            double avgTransit = bucketSnapshots.stream()
                    .mapToDouble(s -> s.getAverageTransitTime() != null ? s.getAverageTransitTime() : 45.0)
                    .average().orElse(45.0);
            int avgInTransit = (int) Math.round(bucketSnapshots.stream().mapToInt(CrowdSnapshot::getInTransitCount).average().orElse(0));

            // Highest severity status in bucket
            OperationalStatus worstStatus = bucketSnapshots.stream()
                    .map(CrowdSnapshot::getStatus)
                    .filter(Objects::nonNull)
                    .max(Comparator.comparingInt(Enum::ordinal))
                    .orElse(OperationalStatus.NORMAL);

            // Data status
            DataFreshnessStatus dataStatus = bucketSnapshots.stream()
                    .map(CrowdSnapshot::getDataStatus)
                    .filter(Objects::nonNull)
                    .filter(ds -> ds == DataFreshnessStatus.FRESH)
                    .findFirst()
                    .orElse(bucketSnapshots.get(0).getDataStatus() != null ? bucketSnapshots.get(0).getDataStatus() : DataFreshnessStatus.FRESH);

            CrowdSnapshot sample = bucketSnapshots.get(0);
            boolean isBottleneck = avgOcc >= 70.0 && avgNet > 0 && avgSpeed < 2.0;

            String label = intervalSeconds >= 86400L ? bucketTime.toLocalDate().toString() :
                    (intervalSeconds >= 3600L ? bucketTime.format(DATE_TIME_LABEL_FMT) : bucketTime.format(TIME_LABEL_FMT));

            result.add(HistoricalTimeSeriesPointDto.builder()
                    .timestamp(bucketTime)
                    .timeLabel(label)
                    .checkpointId(sample.getCheckpoint() != null ? sample.getCheckpoint().getId() : null)
                    .checkpointCode(sample.getCheckpoint() != null ? sample.getCheckpoint().getCode() : null)
                    .checkpointName(sample.getCheckpoint() != null ? sample.getCheckpoint().getName() : null)
                    .routeId(sample.getRoute() != null ? sample.getRoute().getId() : (sample.getCheckpoint() != null && sample.getCheckpoint().getRoute() != null ? sample.getCheckpoint().getRoute().getId() : null))
                    .routeCode(sample.getRoute() != null ? sample.getRoute().getCode() : (sample.getCheckpoint() != null && sample.getCheckpoint().getRoute() != null ? sample.getCheckpoint().getRoute().getCode() : null))
                    .crowdCount(avgCrowd)
                    .capacity(avgCap)
                    .occupancyPercentage(Math.round(avgOcc * 10.0) / 10.0)
                    .inflow(avgInflow)
                    .outflow(avgOutflow)
                    .netFlow(avgNet)
                    .averageSpeedKmH(Math.round(avgSpeed * 10.0) / 10.0)
                    .averageTransitTimeMinutes(Math.round(avgTransit * 10.0) / 10.0)
                    .inTransitCount(avgInTransit)
                    .operationalStatus(worstStatus)
                    .dataStatus(dataStatus)
                    .isBottleneck(isBottleneck)
                    .build());
        }

        return result;
    }

    private LocalDateTime roundToBucket(LocalDateTime time, long intervalSeconds) {
        if (intervalSeconds == 86400L) {
            return time.truncatedTo(ChronoUnit.DAYS);
        }
        if (intervalSeconds == 3600L) {
            return time.truncatedTo(ChronoUnit.HOURS);
        }
        long minuteBucket = intervalSeconds / 60L;
        int unroundedMinute = time.getMinute();
        int roundedMinute = (int) ((unroundedMinute / minuteBucket) * minuteBucket);
        return time.truncatedTo(ChronoUnit.HOURS).plusMinutes(roundedMinute);
    }

    private HistoricalAnalyticsSummaryDto calculateSummary(List<HistoricalTimeSeriesPointDto> points, long intervalSeconds) {
        if (points == null || points.isEmpty()) {
            return HistoricalAnalyticsSummaryDto.builder()
                    .peakCrowd(0)
                    .peakOccupancyPercentage(0.0)
                    .averageOccupancyPercentage(0.0)
                    .averageInflow(0)
                    .averageOutflow(0)
                    .maximumNetInflow(0)
                    .averageWalkingSpeedKmH(2.5)
                    .averageTransitTimeMinutes(0.0)
                    .minutesAboveWatchThreshold(0)
                    .minutesAboveCriticalThreshold(0)
                    .bottleneckDurationMinutes(0)
                    .totalDataPointsEvaluated(0L)
                    .build();
        }

        int peakCrowd = points.stream().mapToInt(HistoricalTimeSeriesPointDto::getCrowdCount).max().orElse(0);
        double peakOcc = points.stream().mapToDouble(HistoricalTimeSeriesPointDto::getOccupancyPercentage).max().orElse(0.0);
        double avgOcc = points.stream().mapToDouble(HistoricalTimeSeriesPointDto::getOccupancyPercentage).average().orElse(0.0);
        int avgIn = (int) Math.round(points.stream().mapToInt(HistoricalTimeSeriesPointDto::getInflow).average().orElse(0));
        int avgOut = (int) Math.round(points.stream().mapToInt(HistoricalTimeSeriesPointDto::getOutflow).average().orElse(0));
        int maxNet = points.stream().mapToInt(HistoricalTimeSeriesPointDto::getNetFlow).max().orElse(0);
        double avgSpeed = points.stream().mapToDouble(HistoricalTimeSeriesPointDto::getAverageSpeedKmH).average().orElse(2.5);
        double avgTransit = points.stream().mapToDouble(HistoricalTimeSeriesPointDto::getAverageTransitTimeMinutes).average().orElse(0.0);

        int bucketMinutes = (int) Math.max(1, intervalSeconds / 60L);
        long watchBuckets = points.stream().filter(p -> p.getOccupancyPercentage() >= 70.0).count();
        long critBuckets = points.stream().filter(p -> p.getOccupancyPercentage() >= 92.0).count();
        long bottleneckBuckets = points.stream().filter(p -> Boolean.TRUE.equals(p.getIsBottleneck())).count();

        return HistoricalAnalyticsSummaryDto.builder()
                .peakCrowd(peakCrowd)
                .peakOccupancyPercentage(Math.round(peakOcc * 10.0) / 10.0)
                .averageOccupancyPercentage(Math.round(avgOcc * 10.0) / 10.0)
                .averageInflow(avgIn)
                .averageOutflow(avgOut)
                .maximumNetInflow(maxNet)
                .averageWalkingSpeedKmH(Math.round(avgSpeed * 10.0) / 10.0)
                .averageTransitTimeMinutes(Math.round(avgTransit * 10.0) / 10.0)
                .minutesAboveWatchThreshold((int) (watchBuckets * bucketMinutes))
                .minutesAboveCriticalThreshold((int) (critBuckets * bucketMinutes))
                .bottleneckDurationMinutes((int) (bottleneckBuckets * bucketMinutes))
                .totalDataPointsEvaluated((long) points.size())
                .build();
    }

    public List<MlTrainingSequenceDto> generateMlSequences(List<HistoricalTimeSeriesPointDto> points) {
        if (points == null || points.size() < 5) {
            return Collections.emptyList();
        }

        List<MlTrainingSequenceDto> sequences = new ArrayList<>();
        for (int i = 4; i < points.size(); i++) {
            HistoricalTimeSeriesPointDto t0 = points.get(i);
            HistoricalTimeSeriesPointDto tm1 = points.get(i - 1);
            HistoricalTimeSeriesPointDto tm2 = points.get(i - 2);
            HistoricalTimeSeriesPointDto tm3 = points.get(i - 3);
            HistoricalTimeSeriesPointDto tm4 = points.get(i - 4);

            double timeOfDay = t0.getTimestamp().getHour() + (t0.getTimestamp().getMinute() / 60.0);
            int dayOfWeek = t0.getTimestamp().getDayOfWeek().getValue();

            sequences.add(MlTrainingSequenceDto.builder()
                    .timestamp(t0.getTimestamp())
                    .checkpointCode(t0.getCheckpointCode())
                    .routeCode(t0.getRouteCode())
                    .crowd_t_minus_4(tm4.getCrowdCount())
                    .crowd_t_minus_3(tm3.getCrowdCount())
                    .crowd_t_minus_2(tm2.getCrowdCount())
                    .crowd_t_minus_1(tm1.getCrowdCount())
                    .current_crowd(t0.getCrowdCount())
                    .inflow(t0.getInflow())
                    .outflow(t0.getOutflow())
                    .netFlow(t0.getNetFlow())
                    .speed(t0.getAverageSpeedKmH())
                    .transitTimeMinutes(t0.getAverageTransitTimeMinutes())
                    .occupancyPercentage(t0.getOccupancyPercentage())
                    .capacity(t0.getCapacity())
                    .timeOfDayHour(Math.round(timeOfDay * 100.0) / 100.0)
                    .dayOfWeek(dayOfWeek)
                    .isWeekend(dayOfWeek >= 6)
                    .build());
        }

        return sequences;
    }
}
