package com.yatraflow.dto.crowd;

import lombok.*;

import java.util.List;

@Getter
@Setter
@NoArgsConstructor
@AllArgsConstructor
@Builder
public class SpeedMetricsDto {
    private String segment;
    private String fromCheckpoint;
    private String toCheckpoint;
    private Double segmentDistanceKm;
    private Double observedAverageSpeedKmH;
    private Double benchmarkSpeedKmH;
    private String speedCategory; // SLOW, NORMAL, FAST
    private Integer sampleScanCount;
}
