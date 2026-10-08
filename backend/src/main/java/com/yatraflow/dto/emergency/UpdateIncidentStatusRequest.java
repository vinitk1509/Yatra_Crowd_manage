package com.yatraflow.dto.emergency;

import com.yatraflow.entity.EmergencyStatus;
import jakarta.validation.constraints.NotNull;
import lombok.AllArgsConstructor;
import lombok.Builder;
import lombok.Data;
import lombok.NoArgsConstructor;

@Data
@Builder
@NoArgsConstructor
@AllArgsConstructor
public class UpdateIncidentStatusRequest {

    @NotNull(message = "Incident status is required")
    private EmergencyStatus status;

    private Long assignedResponderId;

    private String responderNotes;

    private String safetyInstruction;
}
