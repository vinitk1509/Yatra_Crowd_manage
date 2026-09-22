package com.yatraflow.dto.crowd;

import lombok.*;

import java.util.List;

@Getter
@Setter
@NoArgsConstructor
@AllArgsConstructor
@Builder
public class RouteCrowdMetricsDto {
    private Long routeId;
    private String routeCode;
    private String routeName;
    private Integer totalActivePilgrims;
    private Integer totalCapacity;
    private Double overallOccupancyPercentage;
    private Integer totalInTransit;
    private Double averageRouteSpeedKmH;
    private List<CheckpointMetricsDto> checkpoints;
}
