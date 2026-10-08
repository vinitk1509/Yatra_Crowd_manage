package com.yatraflow.dto.emergency;

import com.yatraflow.entity.EmergencySeverity;
import com.yatraflow.entity.IncidentType;
import jakarta.validation.constraints.NotBlank;
import jakarta.validation.constraints.NotNull;
import lombok.AllArgsConstructor;
import lombok.Builder;
import lombok.Data;
import lombok.NoArgsConstructor;

@Data
@Builder
@NoArgsConstructor
@AllArgsConstructor
public class ReportPublicHazardRequest {

    @NotNull(message = "Hazard incident type is required")
    private IncidentType incidentType;

    @NotNull(message = "Route ID is required")
    private Long routeId;

    private Long checkpointId;

    @NotBlank(message = "Title is required")
    private String title;

    private String description;

    private EmergencySeverity severity;

    private Double latitude;

    private Double longitude;
}
