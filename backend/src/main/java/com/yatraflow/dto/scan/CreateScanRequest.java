package com.yatraflow.dto.scan;

import com.yatraflow.entity.ScanType;
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
public class CreateScanRequest {

    @NotBlank(message = "QR ID or QR Code payload is required")
    private String qrId;

    @NotNull(message = "Checkpoint ID is required")
    private Long checkpointId;

    @Builder.Default
    private ScanType scanType = ScanType.TRANSIT;
}
