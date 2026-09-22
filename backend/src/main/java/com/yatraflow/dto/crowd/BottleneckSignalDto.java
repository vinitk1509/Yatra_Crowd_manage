package com.yatraflow.dto.crowd;

import lombok.*;

import java.time.LocalDateTime;

@Getter
@Setter
@NoArgsConstructor
@AllArgsConstructor
@Builder
public class BottleneckSignalDto {
    private String segmentCode;
    private String fromCheckpoint;
    private String toCheckpoint;
    private String routeCode;
    private String severity; // LOW, MEDIUM, HIGH, CRITICAL
    private Double currentOccupancyPercentage;
    private Integer netAccumulationRate;
    private Double observedSpeedKmH;
    private Double normalSpeedKmH;
    private Double speedDropPercentage;
    private Double transitTimeMinutes;
    private String diagnosis;
    private LocalDateTime detectedAt;
}
