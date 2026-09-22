package com.yatraflow.controller;

import com.yatraflow.dto.common.ApiResponse;
import com.yatraflow.dto.qr.GenerateQrRequest;
import com.yatraflow.dto.qr.QrCodeDto;
import com.yatraflow.dto.qr.ValidateQrRequest;
import com.yatraflow.dto.qr.ValidateQrResponse;
import com.yatraflow.entity.Pilgrim;
import com.yatraflow.entity.QrCode;
import com.yatraflow.repository.PilgrimRepository;
import com.yatraflow.exception.ResourceNotFoundException;
import com.yatraflow.service.QrCodeService;
import jakarta.validation.Valid;
import lombok.RequiredArgsConstructor;
import org.springframework.http.HttpStatus;
import org.springframework.http.ResponseEntity;
import org.springframework.security.access.prepost.PreAuthorize;
import org.springframework.web.bind.annotation.*;

@RestController
@RequestMapping("/api/qr")
@RequiredArgsConstructor
public class QrCodeController {

    private final QrCodeService qrCodeService;
    private final PilgrimRepository pilgrimRepository;

    @PostMapping("/generate")
    @PreAuthorize("hasAnyRole('ADMIN', 'SUPERVISOR')")
    public ResponseEntity<ApiResponse<QrCodeDto>> generateQr(@Valid @RequestBody GenerateQrRequest request) {
        Pilgrim pilgrim = pilgrimRepository.findById(request.getPilgrimId())
                .orElseThrow(() -> new ResourceNotFoundException("Pilgrim not found with ID: " + request.getPilgrimId()));
        
        QrCode qrCode = qrCodeService.generateQr(pilgrim);
        return ResponseEntity.status(HttpStatus.CREATED)
                .body(ApiResponse.success("QR credential generated successfully", QrCodeDto.fromEntity(qrCode)));
    }

    @GetMapping("/{qrId}")
    public ResponseEntity<ApiResponse<QrCodeDto>> getQrById(@PathVariable String qrId) {
        QrCodeDto qrCode = qrCodeService.getQrByQrId(qrId);
        return ResponseEntity.ok(ApiResponse.success("QR details retrieved successfully", qrCode));
    }

    @PostMapping("/validate")
    public ResponseEntity<ApiResponse<ValidateQrResponse>> validateQr(@Valid @RequestBody ValidateQrRequest request) {
        ValidateQrResponse response = qrCodeService.validateQr(request.getQrId(), request.getCheckpointId());
        return ResponseEntity.ok(ApiResponse.success("QR validation completed", response));
    }
}
