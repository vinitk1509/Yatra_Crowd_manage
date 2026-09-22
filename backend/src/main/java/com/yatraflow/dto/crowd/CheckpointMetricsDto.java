package com.yatraflow.dto.crowd;

import com.yatraflow.entity.DataFreshnessStatus;
import com.yatraflow.entity.OperationalStatus;
import lombok.*;

import java.time.LocalDateTime;

@Getter
@Setter
@NoArgsConstructor
@AllArgsConstructor
@Builder
public class CheckpointMetricsDto {
    private Long checkpointId;
    private String checkpointCode;
    private String checkpointName;
    private Long routeId;
    private String routeCode;
    private String routeName;
    private Integer sequenceOrder;
    private Double distanceFromStartKm;
    private Double distanceFromPrevKm;

    private Integer currentCrowd;
    private Integer capacity;
    private Double occupancyPercentage;

    private Integer inflow; // Scans into this checkpoint in window
    private Integer outflow; // Pilgrims advanced to downstream checkpoints
    private Integer netFlow; // inflow - outflow

    private Double averageSpeedKmH; // Walking speed from prev checkpoint
    private Double averageTransitTimeMinutes; // Transit duration from prev checkpoint
    private Integer inTransitCount; // Pilgrims on trail towards this checkpoint

    private LocalDateTime lastScanTimestamp;
    private OperationalStatus operationalStatus;
    private DataFreshnessStatus dataFreshnessStatus;
}
