package com.yatraflow.dto.prediction;

import lombok.*;

@Getter
@Setter
@NoArgsConstructor
@AllArgsConstructor
@Builder
public class PredictionSignalDto {
    private String signalName; // e.g. "Occupancy Trend", "Inflow Rate Pressure", "Walking Speed Degradation"
    private String impact;     // "High impact", "Moderate impact", "Low impact"
    private String direction;  // "up", "down", "flat"
    private String description;
}
