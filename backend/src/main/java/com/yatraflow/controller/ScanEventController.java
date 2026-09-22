package com.yatraflow.controller;

import com.yatraflow.dto.common.ApiResponse;
import com.yatraflow.dto.scan.CreateScanRequest;
import com.yatraflow.dto.scan.ScanEventDto;
import com.yatraflow.service.ScanEventService;
import jakarta.validation.Valid;
import lombok.RequiredArgsConstructor;
import org.springframework.http.HttpStatus;
import org.springframework.http.ResponseEntity;
import org.springframework.security.access.prepost.PreAuthorize;
import org.springframework.security.core.annotation.AuthenticationPrincipal;
import org.springframework.security.core.userdetails.UserDetails;
import org.springframework.web.bind.annotation.*;

import java.util.List;

@RestController
@RequiredArgsConstructor
public class ScanEventController {

    private final ScanEventService scanEventService;

    @PostMapping("/api/scans")
    @PreAuthorize("hasAnyRole('CHECKPOINT_OPERATOR', 'ADMIN', 'SUPERVISOR')")
    public ResponseEntity<ApiResponse<ScanEventDto>> recordScan(
            @Valid @RequestBody CreateScanRequest request,
            @AuthenticationPrincipal UserDetails userDetails
    ) {
        String operatorEmail = userDetails != null ? userDetails.getUsername() : "operator@yatraflow.gov.in";
        ScanEventDto scanEvent = scanEventService.processScan(request, operatorEmail);
        return ResponseEntity.status(HttpStatus.CREATED)
                .body(ApiResponse.success("Scan verified and movement logged successfully", scanEvent));
    }

    @GetMapping("/api/scans/{pilgrimId}")
    public ResponseEntity<ApiResponse<List<ScanEventDto>>> getScansForPilgrim(@PathVariable Long pilgrimId) {
        List<ScanEventDto> scans = scanEventService.getScansForPilgrim(pilgrimId);
        return ResponseEntity.ok(ApiResponse.success("Movement history retrieved successfully", scans));
    }

    @GetMapping("/api/checkpoints/{id}/scans")
    public ResponseEntity<ApiResponse<List<ScanEventDto>>> getScansForCheckpoint(@PathVariable Long id) {
        List<ScanEventDto> scans = scanEventService.getScansForCheckpoint(id);
        return ResponseEntity.ok(ApiResponse.success("Checkpoint scans retrieved successfully", scans));
    }
}
