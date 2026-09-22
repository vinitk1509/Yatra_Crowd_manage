package com.yatraflow.controller;

import com.yatraflow.dto.analytics.HistoricalAnalyticsResponseDto;
import com.yatraflow.dto.analytics.MlTrainingSequenceDto;
import com.yatraflow.service.HistoricalAnalyticsService;
import lombok.RequiredArgsConstructor;
import lombok.extern.slf4j.Slf4j;
import org.springframework.format.annotation.DateTimeFormat;
import org.springframework.http.ResponseEntity;
import org.springframework.web.bind.annotation.*;

import java.time.LocalDateTime;
import java.util.List;

@RestController
@RequestMapping("/api/analytics")
@RequiredArgsConstructor
@Slf4j
public class HistoricalAnalyticsController {

    private final HistoricalAnalyticsService historicalAnalyticsService;

    @GetMapping("/crowd")
    public ResponseEntity<HistoricalAnalyticsResponseDto> getCrowdAnalytics(
            @RequestParam(required = false) Long checkpointId,
            @RequestParam(required = false) String checkpointCode,
            @RequestParam(required = false) Long routeId,
            @RequestParam(required = false) @DateTimeFormat(iso = DateTimeFormat.ISO.DATE_TIME) LocalDateTime start,
            @RequestParam(required = false) @DateTimeFormat(iso = DateTimeFormat.ISO.DATE_TIME) LocalDateTime end,
            @RequestParam(required = false, defaultValue = "1h") String interval
    ) {
        return ResponseEntity.ok(historicalAnalyticsService.getHistoricalAnalytics(
                checkpointId, checkpointCode, routeId, start, end, interval, false));
    }

    @GetMapping("/flow")
    public ResponseEntity<HistoricalAnalyticsResponseDto> getFlowAnalytics(
            @RequestParam(required = false) Long checkpointId,
            @RequestParam(required = false) String checkpointCode,
            @RequestParam(required = false) Long routeId,
            @RequestParam(required = false) @DateTimeFormat(iso = DateTimeFormat.ISO.DATE_TIME) LocalDateTime start,
            @RequestParam(required = false) @DateTimeFormat(iso = DateTimeFormat.ISO.DATE_TIME) LocalDateTime end,
            @RequestParam(required = false, defaultValue = "1h") String interval
    ) {
        return ResponseEntity.ok(historicalAnalyticsService.getHistoricalAnalytics(
                checkpointId, checkpointCode, routeId, start, end, interval, false));
    }

    @GetMapping("/occupancy")
    public ResponseEntity<HistoricalAnalyticsResponseDto> getOccupancyAnalytics(
            @RequestParam(required = false) Long checkpointId,
            @RequestParam(required = false) String checkpointCode,
            @RequestParam(required = false) Long routeId,
            @RequestParam(required = false) @DateTimeFormat(iso = DateTimeFormat.ISO.DATE_TIME) LocalDateTime start,
            @RequestParam(required = false) @DateTimeFormat(iso = DateTimeFormat.ISO.DATE_TIME) LocalDateTime end,
            @RequestParam(required = false, defaultValue = "1h") String interval
    ) {
        return ResponseEntity.ok(historicalAnalyticsService.getHistoricalAnalytics(
                checkpointId, checkpointCode, routeId, start, end, interval, false));
    }

    @GetMapping("/speed")
    public ResponseEntity<HistoricalAnalyticsResponseDto> getSpeedAnalytics(
            @RequestParam(required = false) Long checkpointId,
            @RequestParam(required = false) String checkpointCode,
            @RequestParam(required = false) Long routeId,
            @RequestParam(required = false) @DateTimeFormat(iso = DateTimeFormat.ISO.DATE_TIME) LocalDateTime start,
            @RequestParam(required = false) @DateTimeFormat(iso = DateTimeFormat.ISO.DATE_TIME) LocalDateTime end,
            @RequestParam(required = false, defaultValue = "1h") String interval
    ) {
        return ResponseEntity.ok(historicalAnalyticsService.getHistoricalAnalytics(
                checkpointId, checkpointCode, routeId, start, end, interval, false));
    }

    @GetMapping("/transit-time")
    public ResponseEntity<HistoricalAnalyticsResponseDto> getTransitTimeAnalytics(
            @RequestParam(required = false) Long checkpointId,
            @RequestParam(required = false) String checkpointCode,
            @RequestParam(required = false) Long routeId,
            @RequestParam(required = false) @DateTimeFormat(iso = DateTimeFormat.ISO.DATE_TIME) LocalDateTime start,
            @RequestParam(required = false) @DateTimeFormat(iso = DateTimeFormat.ISO.DATE_TIME) LocalDateTime end,
            @RequestParam(required = false, defaultValue = "1h") String interval
    ) {
        return ResponseEntity.ok(historicalAnalyticsService.getHistoricalAnalytics(
                checkpointId, checkpointCode, routeId, start, end, interval, false));
    }

    @GetMapping("/checkpoints/{id}")
    public ResponseEntity<HistoricalAnalyticsResponseDto> getCheckpointAnalytics(
            @PathVariable("id") Long checkpointId,
            @RequestParam(required = false) @DateTimeFormat(iso = DateTimeFormat.ISO.DATE_TIME) LocalDateTime start,
            @RequestParam(required = false) @DateTimeFormat(iso = DateTimeFormat.ISO.DATE_TIME) LocalDateTime end,
            @RequestParam(required = false, defaultValue = "1h") String interval
    ) {
        return ResponseEntity.ok(historicalAnalyticsService.getHistoricalAnalytics(
                checkpointId, null, null, start, end, interval, false));
    }

    @GetMapping("/routes/{id}")
    public ResponseEntity<HistoricalAnalyticsResponseDto> getRouteAnalytics(
            @PathVariable("id") Long routeId,
            @RequestParam(required = false) @DateTimeFormat(iso = DateTimeFormat.ISO.DATE_TIME) LocalDateTime start,
            @RequestParam(required = false) @DateTimeFormat(iso = DateTimeFormat.ISO.DATE_TIME) LocalDateTime end,
            @RequestParam(required = false, defaultValue = "1h") String interval
    ) {
        return ResponseEntity.ok(historicalAnalyticsService.getHistoricalAnalytics(
                null, null, routeId, start, end, interval, false));
    }

    @GetMapping("/ml-dataset")
    public ResponseEntity<List<MlTrainingSequenceDto>> getMlDataset(
            @RequestParam(required = false) Long checkpointId,
            @RequestParam(required = false) String checkpointCode,
            @RequestParam(required = false) @DateTimeFormat(iso = DateTimeFormat.ISO.DATE_TIME) LocalDateTime start,
            @RequestParam(required = false) @DateTimeFormat(iso = DateTimeFormat.ISO.DATE_TIME) LocalDateTime end,
            @RequestParam(required = false, defaultValue = "15m") String interval
    ) {
        HistoricalAnalyticsResponseDto response = historicalAnalyticsService.getHistoricalAnalytics(
                checkpointId, checkpointCode, null, start, end, interval, true);
        return ResponseEntity.ok(response.getMlSequences());
    }
}
