package com.yatraflow.dto.scan;

import com.yatraflow.entity.ScanEvent;
import com.yatraflow.entity.ScanType;
import com.yatraflow.entity.ScanValidationStatus;
import lombok.AllArgsConstructor;
import lombok.Builder;
import lombok.Data;
import lombok.NoArgsConstructor;

import java.time.LocalDateTime;

@Data
@Builder
@NoArgsConstructor
@AllArgsConstructor
public class ScanEventDto {
    private Long id;
    private String qrId;
    private Long pilgrimId;
    private String pilgrimCode;
    private String pilgrimName;
    private Long checkpointId;
    private String checkpointName;
    private String checkpointCode;
    private Long routeId;
    private String routeName;
    private String routeCode;
    private LocalDateTime scanTimestamp;
    private ScanType scanType;
    private String operatorEmail;
    private ScanValidationStatus validationStatus;
    private String failureReason;
    private LocalDateTime createdAt;

    public static ScanEventDto fromEntity(ScanEvent event) {
        if (event == null) return null;
        return ScanEventDto.builder()
                .id(event.getId())
                .qrId(event.getQrId())
                .pilgrimId(event.getPilgrim() != null ? event.getPilgrim().getId() : null)
                .pilgrimCode(event.getPilgrim() != null ? event.getPilgrim().getPilgrimCode() : null)
                .pilgrimName(event.getPilgrim() != null ? event.getPilgrim().getName() : null)
                .checkpointId(event.getCheckpoint() != null ? event.getCheckpoint().getId() : null)
                .checkpointName(event.getCheckpoint() != null ? event.getCheckpoint().getName() : null)
                .checkpointCode(event.getCheckpoint() != null ? event.getCheckpoint().getCode() : null)
                .routeId(event.getRoute() != null ? event.getRoute().getId() : null)
                .routeName(event.getRoute() != null ? event.getRoute().getName() : null)
                .routeCode(event.getRoute() != null ? event.getRoute().getCode() : null)
                .scanTimestamp(event.getScanTimestamp())
                .scanType(event.getScanType())
                .operatorEmail(event.getOperatorEmail())
                .validationStatus(event.getValidationStatus())
                .failureReason(event.getFailureReason())
                .createdAt(event.getCreatedAt())
                .build();
    }
}
