package com.yatraflow.dto.emergency;

import com.yatraflow.entity.IncidentType;
import com.yatraflow.entity.LocationSource;
import jakarta.validation.constraints.NotNull;
import lombok.AllArgsConstructor;
import lombok.Builder;
import lombok.Data;
import lombok.NoArgsConstructor;

@Data
@Builder
@NoArgsConstructor
@AllArgsConstructor
public class CreatePersonalSosRequest {

    @NotNull(message = "Emergency incident type is required")
    private IncidentType incidentType;

    private String description;

    private Double latitude;

    private Double longitude;

    private Double locationAccuracy;

    private LocationSource locationSource;

    private Long checkpointId;

    private Long routeId;
}
