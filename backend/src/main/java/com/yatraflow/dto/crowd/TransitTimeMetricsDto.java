package com.yatraflow.dto.crowd;

import lombok.*;

@Getter
@Setter
@NoArgsConstructor
@AllArgsConstructor
@Builder
public class TransitTimeMetricsDto {
    private String segment;
    private String fromCheckpoint;
    private String toCheckpoint;
    private Double averageTransitMinutes;
    private Double expectedTransitMinutes;
    private Double deviationMinutes;
    private Integer activePilgrimsInTransit;
}
