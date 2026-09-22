package com.yatraflow.dto.qr;

import jakarta.validation.constraints.NotNull;
import lombok.AllArgsConstructor;
import lombok.Builder;
import lombok.Data;
import lombok.NoArgsConstructor;

@Data
@Builder
@NoArgsConstructor
@AllArgsConstructor
public class GenerateQrRequest {
    @NotNull(message = "Pilgrim ID is required")
    private Long pilgrimId;
}
