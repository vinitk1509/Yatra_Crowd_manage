package com.yatraflow.dto.emergency;

import com.yatraflow.entity.EmergencyIncident;
import com.yatraflow.entity.EmergencyScope;
import com.yatraflow.entity.EmergencySeverity;
import com.yatraflow.entity.EmergencyStatus;
import com.yatraflow.entity.IncidentType;
import lombok.AllArgsConstructor;
import lombok.Builder;
import lombok.Data;
import lombok.NoArgsConstructor;

import java.time.LocalDateTime;

@Data
@Builder
@NoArgsConstructor
@AllArgsConstructor
public class PublicSafetyAlertDto {

    private Long id;
    private String incidentCode;
    private IncidentType incidentType;
    private EmergencyScope scope;
    private EmergencySeverity severity;
    private EmergencyStatus status;

    private Long routeId;
    private String routeName;
    private String routeCode;

    private Long checkpointId;
    private String checkpointName;
    private String checkpointCode;

    private String title;
    private String description;
    private String safetyInstruction;

    private LocalDateTime reportedAt;
    private LocalDateTime updatedAt;

    public static PublicSafetyAlertDto fromEntity(EmergencyIncident entity) {
        if (entity == null) return null;

        PublicSafetyAlertDto.PublicSafetyAlertDtoBuilder builder = PublicSafetyAlertDto.builder()
                .id(entity.getId())
                .incidentCode(entity.getIncidentCode())
                .incidentType(entity.getIncidentType())
                .scope(entity.getScope())
                .severity(entity.getSeverity())
                .status(entity.getStatus())
                .title(entity.getTitle())
                .description(entity.getDescription())
                .safetyInstruction(entity.getSafetyInstruction())
                .reportedAt(entity.getReportedAt())
                .updatedAt(entity.getUpdatedAt() != null ? entity.getUpdatedAt() : entity.getReportedAt());

        if (entity.getRoute() != null) {
            builder.routeId(entity.getRoute().getId())
                    .routeName(entity.getRoute().getName())
                    .routeCode(entity.getRoute().getCode());
        }

        if (entity.getCheckpoint() != null) {
            builder.checkpointId(entity.getCheckpoint().getId())
                    .checkpointName(entity.getCheckpoint().getName())
                    .checkpointCode(entity.getCheckpoint().getCode());
        }

        return builder.build();
    }
}
