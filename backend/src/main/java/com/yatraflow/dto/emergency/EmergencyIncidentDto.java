package com.yatraflow.dto.emergency;

import com.yatraflow.entity.*;
import lombok.AllArgsConstructor;
import lombok.Builder;
import lombok.Data;
import lombok.NoArgsConstructor;

import java.time.LocalDateTime;

@Data
@Builder
@NoArgsConstructor
@AllArgsConstructor
public class EmergencyIncidentDto {

    private Long id;
    private String incidentCode;
    private IncidentType incidentType;
    private EmergencyScope scope;
    private EmergencySeverity severity;
    private EmergencyStatus status;

    // Pilgrim Details (Present for Personal SOS)
    private Long pilgrimId;
    private String pilgrimName;
    private String pilgrimRegistrationNumber;
    private String pilgrimPhone;
    private String pilgrimEmergencyContact;
    private String pilgrimBloodGroup;
    private Integer pilgrimAge;
    private String pilgrimGender;

    // Route & Checkpoint
    private Long routeId;
    private String routeName;
    private String routeCode;

    private Long checkpointId;
    private String checkpointName;
    private String checkpointCode;

    // Location Data (Protected: Accessible only to Emergency Officers / Admins)
    private Double latitude;
    private Double longitude;
    private Double locationAccuracy;
    private LocationSource locationSource;

    private String title;
    private String description;
    private String safetyInstruction;
    private boolean verified;

    private LocalDateTime reportedAt;
    private LocalDateTime acknowledgedAt;
    private LocalDateTime dispatchedAt;
    private LocalDateTime resolvedAt;

    private String reportedByUserName;
    private String reportedByUserEmail;
    private String assignedResponderName;
    private String responderNotes;

    public static EmergencyIncidentDto fromEntity(EmergencyIncident entity) {
        if (entity == null) return null;

        EmergencyIncidentDto.EmergencyIncidentDtoBuilder builder = EmergencyIncidentDto.builder()
                .id(entity.getId())
                .incidentCode(entity.getIncidentCode())
                .incidentType(entity.getIncidentType())
                .scope(entity.getScope())
                .severity(entity.getSeverity())
                .status(entity.getStatus())
                .latitude(entity.getLatitude())
                .longitude(entity.getLongitude())
                .locationAccuracy(entity.getLocationAccuracy())
                .locationSource(entity.getLocationSource())
                .title(entity.getTitle())
                .description(entity.getDescription())
                .safetyInstruction(entity.getSafetyInstruction())
                .verified(entity.isVerified())
                .reportedAt(entity.getReportedAt())
                .acknowledgedAt(entity.getAcknowledgedAt())
                .dispatchedAt(entity.getDispatchedAt())
                .resolvedAt(entity.getResolvedAt())
                .responderNotes(entity.getResponderNotes());

        if (entity.getPilgrim() != null) {
            Pilgrim p = entity.getPilgrim();
            builder.pilgrimId(p.getId())
                    .pilgrimName(p.getName())
                    .pilgrimRegistrationNumber(p.getPilgrimCode())
                    .pilgrimPhone(p.getPhoneNumber())
                    .pilgrimEmergencyContact(p.getEmergencyContact())
                    .pilgrimBloodGroup("O+ (Verified)")
                    .pilgrimAge(p.getAge())
                    .pilgrimGender(p.getGender());
        }

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

        if (entity.getReportedByUser() != null) {
            builder.reportedByUserName(entity.getReportedByUser().getName())
                    .reportedByUserEmail(entity.getReportedByUser().getEmail());
        }

        if (entity.getAssignedResponder() != null) {
            builder.assignedResponderName(entity.getAssignedResponder().getName());
        }

        return builder.build();
    }
}
