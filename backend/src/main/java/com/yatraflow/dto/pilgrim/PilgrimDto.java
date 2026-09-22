package com.yatraflow.dto.pilgrim;

import com.yatraflow.dto.qr.QrCodeDto;
import com.yatraflow.entity.Pilgrim;
import com.yatraflow.entity.PilgrimStatus;
import lombok.AllArgsConstructor;
import lombok.Builder;
import lombok.Data;
import lombok.NoArgsConstructor;

import java.time.LocalDateTime;

@Data
@Builder
@NoArgsConstructor
@AllArgsConstructor
public class PilgrimDto {
    private Long id;
    private String pilgrimCode;
    private String name;
    private Integer age;
    private String gender;
    private String phoneNumber;
    private String emergencyContact;
    private Long routeId;
    private String routeName;
    private String routeCode;
    private PilgrimStatus status;
    private QrCodeDto qrCode;
    private LocalDateTime createdAt;
    private LocalDateTime updatedAt;

    public static PilgrimDto fromEntity(Pilgrim pilgrim) {
        if (pilgrim == null) return null;
        return PilgrimDto.builder()
                .id(pilgrim.getId())
                .pilgrimCode(pilgrim.getPilgrimCode())
                .name(pilgrim.getName())
                .age(pilgrim.getAge())
                .gender(pilgrim.getGender())
                .phoneNumber(pilgrim.getPhoneNumber())
                .emergencyContact(pilgrim.getEmergencyContact())
                .routeId(pilgrim.getRoute() != null ? pilgrim.getRoute().getId() : null)
                .routeName(pilgrim.getRoute() != null ? pilgrim.getRoute().getName() : null)
                .routeCode(pilgrim.getRoute() != null ? pilgrim.getRoute().getCode() : null)
                .status(pilgrim.getStatus())
                .createdAt(pilgrim.getCreatedAt())
                .updatedAt(pilgrim.getUpdatedAt())
                .build();
    }
}
