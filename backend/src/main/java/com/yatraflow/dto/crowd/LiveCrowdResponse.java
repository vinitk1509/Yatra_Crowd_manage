package com.yatraflow.dto.crowd;

import lombok.*;

import java.time.LocalDateTime;
import java.util.List;

@Getter
@Setter
@NoArgsConstructor
@AllArgsConstructor
@Builder
public class LiveCrowdResponse {
    private Integer totalActivePilgrims;
    private Integer totalInTransit;
    private Integer totalCapacity;
    private Double overallOccupancyPercentage;
    private Double averageWalkingSpeedKmH;
    private Integer averageNetFlowPerMinute;
    private Integer activeAlertsCount;
    private LocalDateTime generatedAt;
    private List<CheckpointMetricsDto> checkpoints;
    private List<BottleneckSignalDto> bottlenecks;
}
