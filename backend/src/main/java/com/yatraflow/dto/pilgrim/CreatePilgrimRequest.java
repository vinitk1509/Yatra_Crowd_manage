package com.yatraflow.dto.pilgrim;

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
public class CreatePilgrimRequest {

    @NotBlank(message = "Pilgrim name is required")
    @Size(min = 2, max = 100, message = "Pilgrim name must be between 2 and 100 characters")
    private String name;

    @NotNull(message = "Age is required")
    @Positive(message = "Age must be a positive number")
    private Integer age;

    @NotBlank(message = "Gender is required")
    private String gender;

    private String phoneNumber;

    private String emergencyContact;

    @NotNull(message = "Route ID is required")
    private Long routeId;
}
