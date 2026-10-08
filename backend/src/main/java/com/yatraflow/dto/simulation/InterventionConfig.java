package com.yatraflow.dto.simulation;

import lombok.AllArgsConstructor;
import lombok.Builder;
import lombok.Data;
import lombok.NoArgsConstructor;

import java.util.List;

@Data
@Builder
@NoArgsConstructor
@AllArgsConstructor
public class InterventionConfig {
    private String type; // TRAIL_CLOSURE, GATE_THROTTLE, WEATHER_DISRUPTION, EMERGENCY_EVENT, COMBINED
    private String targetCheckpointCode;
    private String targetSegmentCode;
    private int startMinute;
    private int durationMinutes;
    private double throttlePercentage; // 0.0 to 100.0 (e.g. 40% release rate)
    private String weatherSeverity; // CLEAR, RAIN, STORM, FOG
    private boolean enableRerouting;
    private String emergencyType; // LANDSLIDE, MEDICAL_SOS, TRACK_COLLAPSE
    private String description;
}
