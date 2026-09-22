package com.yatraflow.dto.analytics;

import com.yatraflow.entity.DataFreshnessStatus;
import com.yatraflow.entity.OperationalStatus;
import lombok.*;

import java.time.LocalDateTime;

@Getter
@Setter
@NoArgsConstructor
@AllArgsConstructor
@Builder
public class HistoricalTimeSeriesPointDto {
    private LocalDateTime timestamp;
    private String timeLabel; // "08:00", "08:15", "2026-09-22 08:00"
    private Long checkpointId;
    private String checkpointCode;
    private String checkpointName;
    private Long routeId;
    private String routeCode;

    private Integer crowdCount;
    private Integer capacity;
    private Double occupancyPercentage;

    private Integer inflow;
    private Integer outflow;
    private Integer netFlow;

    private Double averageSpeedKmH;
    private Double averageTransitTimeMinutes;
    private Integer inTransitCount;

    private OperationalStatus operationalStatus;
    private DataFreshnessStatus dataStatus;
    private Boolean isBottleneck;
}
