package com.yatraflow.dto.analytics;

import lombok.*;

@Getter
@Setter
@NoArgsConstructor
@AllArgsConstructor
@Builder
public class HistoricalAnalyticsSummaryDto {
    private Integer peakCrowd;
    private Double peakOccupancyPercentage;
    private Double averageOccupancyPercentage;

    private Integer averageInflow;
    private Integer averageOutflow;
    private Integer maximumNetInflow;

    private Double averageWalkingSpeedKmH;
    private Double averageTransitTimeMinutes;

    private Integer minutesAboveWatchThreshold;   // >= 70% occupancy
    private Integer minutesAboveCriticalThreshold; // >= 92% occupancy
    private Integer bottleneckDurationMinutes;

    private Long totalDataPointsEvaluated;
}
