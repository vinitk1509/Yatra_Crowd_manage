package com.yatraflow.dto.qr;

import com.yatraflow.dto.pilgrim.PilgrimDto;
import com.yatraflow.dto.route.RouteDto;
import com.yatraflow.dto.scan.ScanEventDto;
import lombok.AllArgsConstructor;
import lombok.Builder;
import lombok.Data;
import lombok.NoArgsConstructor;

@Data
@Builder
@NoArgsConstructor
@AllArgsConstructor
public class ValidateQrResponse {
    private boolean valid;
    private String status;
    private String message;
    private QrCodeDto qrCode;
    private PilgrimDto pilgrim;
    private RouteDto route;
    private ScanEventDto lastScan;
    private boolean routeMatchesCheckpoint;
}
