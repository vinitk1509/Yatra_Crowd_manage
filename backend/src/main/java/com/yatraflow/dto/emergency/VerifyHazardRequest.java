package com.yatraflow.dto.emergency;

import com.yatraflow.entity.EmergencyScope;
import com.yatraflow.entity.EmergencySeverity;
import com.yatraflow.entity.EmergencyStatus;
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
public class VerifyHazardRequest {

    @NotNull(message = "Status is required")
    private EmergencyStatus status;

    @NotNull(message = "Severity is required")
    private EmergencySeverity severity;

    @NotNull(message = "Scope is required")
    private EmergencyScope scope;

    @NotBlank(message = "Safety instruction is required for verified hazards")
    private String safetyInstruction;

    private String responderNotes;
}
