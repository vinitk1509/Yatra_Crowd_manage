package com.yatraflow.dto.checkpoint;

import jakarta.validation.constraints.NotBlank;
import jakarta.validation.constraints.NotNull;
import jakarta.validation.constraints.Positive;
import jakarta.validation.constraints.Size;
import lombok.AllArgsConstructor;
import lombok.Builder;
import lombok.Data;
import lombok.NoArgsConstructor;

@Data
@Builder
@NoArgsConstructor
@AllArgsConstructor
public class CreateCheckpointRequest {

    @NotBlank(message = "Checkpoint name is required")
    @Size(min = 2, max = 100, message = "Checkpoint name must be between 2 and 100 characters")
    private String name;

    @NotBlank(message = "Checkpoint code is required")
    @Size(min = 2, max = 50, message = "Checkpoint code must be between 2 and 50 characters")
    private String code;

    @NotNull(message = "Route ID is required")
    private Long routeId;

    @NotNull(message = "Capacity is required")
    @Positive(message = "Capacity must be greater than zero")
    private Integer capacity;

    @NotNull(message = "Latitude is required")
    private Double latitude;

    @NotNull(message = "Longitude is required")
    private Double longitude;

    @Builder.Default
    private boolean active = true;
}
