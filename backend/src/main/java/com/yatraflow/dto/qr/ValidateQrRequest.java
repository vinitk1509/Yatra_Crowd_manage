package com.yatraflow.dto.qr;

import jakarta.validation.constraints.NotBlank;
import lombok.AllArgsConstructor;
import lombok.Builder;
import lombok.Data;
import lombok.NoArgsConstructor;

@Data
@Builder
@NoArgsConstructor
@AllArgsConstructor
public class ValidateQrRequest {

    @NotBlank(message = "QR ID is required")
    private String qrId;

    private Long checkpointId;
}
