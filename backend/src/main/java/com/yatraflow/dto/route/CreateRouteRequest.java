package com.yatraflow.dto.route;

import jakarta.validation.constraints.NotBlank;
import jakarta.validation.constraints.Size;
import lombok.AllArgsConstructor;
import lombok.Builder;
import lombok.Data;
import lombok.NoArgsConstructor;

@Data
@Builder
@NoArgsConstructor
@AllArgsConstructor
public class CreateRouteRequest {

    @NotBlank(message = "Route name is required")
    @Size(min = 3, max = 100, message = "Route name must be between 3 and 100 characters")
    private String name;

    @NotBlank(message = "Route code is required")
    @Size(min = 2, max = 50, message = "Route code must be between 2 and 50 characters")
    private String code;

    private String description;

    @Builder.Default
    private boolean active = true;
}
