package com.yatraflow.dto.qr;

import com.yatraflow.entity.QrCode;
import lombok.AllArgsConstructor;
import lombok.Builder;
import lombok.Data;
import lombok.NoArgsConstructor;

import java.time.LocalDateTime;

@Data
@Builder
@NoArgsConstructor
@AllArgsConstructor
public class QrCodeDto {
    private Long id;
    private String qrId;
    private Long pilgrimId;
    private String pilgrimCode;
    private String pilgrimName;
    private Long routeId;
    private String routeName;
    private String routeCode;
    private String version;
    private boolean active;
    private String payload;
    private LocalDateTime createdAt;

    public static QrCodeDto fromEntity(QrCode qr) {
        if (qr == null) return null;
        return QrCodeDto.builder()
                .id(qr.getId())
                .qrId(qr.getQrId())
                .pilgrimId(qr.getPilgrim() != null ? qr.getPilgrim().getId() : null)
                .pilgrimCode(qr.getPilgrim() != null ? qr.getPilgrim().getPilgrimCode() : null)
                .pilgrimName(qr.getPilgrim() != null ? qr.getPilgrim().getName() : null)
                .routeId(qr.getRoute() != null ? qr.getRoute().getId() : null)
                .routeName(qr.getRoute() != null ? qr.getRoute().getName() : null)
                .routeCode(qr.getRoute() != null ? qr.getRoute().getCode() : null)
                .version(qr.getVersion())
                .active(qr.isActive())
                .payload(qr.getPayload())
                .createdAt(qr.getCreatedAt())
                .build();
    }
}
