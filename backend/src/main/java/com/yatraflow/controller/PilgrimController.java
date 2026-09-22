package com.yatraflow.controller;

import com.yatraflow.dto.common.ApiResponse;
import com.yatraflow.dto.pilgrim.CreatePilgrimRequest;
import com.yatraflow.dto.pilgrim.PilgrimDto;
import com.yatraflow.service.PilgrimService;
import jakarta.validation.Valid;
import lombok.RequiredArgsConstructor;
import org.springframework.http.HttpStatus;
import org.springframework.http.ResponseEntity;
import org.springframework.security.access.prepost.PreAuthorize;
import org.springframework.web.bind.annotation.*;

import java.util.List;

@RestController
@RequestMapping("/api/pilgrims")
@RequiredArgsConstructor
public class PilgrimController {

    private final PilgrimService pilgrimService;

    @PostMapping
    @PreAuthorize("hasAnyRole('ADMIN', 'SUPERVISOR', 'CONTROL_ROOM_OPERATOR', 'PILGRIM')")
    public ResponseEntity<ApiResponse<PilgrimDto>> registerPilgrim(@Valid @RequestBody CreatePilgrimRequest request) {
        PilgrimDto createdPilgrim = pilgrimService.registerPilgrim(request);
        return ResponseEntity.status(HttpStatus.CREATED)
                .body(ApiResponse.success("Pilgrim registered and QR credential issued successfully", createdPilgrim));
    }

    @GetMapping
    public ResponseEntity<ApiResponse<List<PilgrimDto>>> getAllPilgrims() {
        List<PilgrimDto> pilgrims = pilgrimService.getAllPilgrims();
        return ResponseEntity.ok(ApiResponse.success("Pilgrims retrieved successfully", pilgrims));
    }

    @GetMapping("/{id}")
    public ResponseEntity<ApiResponse<PilgrimDto>> getPilgrimById(@PathVariable Long id) {
        PilgrimDto pilgrim = pilgrimService.getPilgrimById(id);
        return ResponseEntity.ok(ApiResponse.success("Pilgrim details retrieved successfully", pilgrim));
    }

    @GetMapping("/code/{code}")
    public ResponseEntity<ApiResponse<PilgrimDto>> getPilgrimByCode(@PathVariable String code) {
        PilgrimDto pilgrim = pilgrimService.getPilgrimByCode(code);
        return ResponseEntity.ok(ApiResponse.success("Pilgrim details retrieved successfully", pilgrim));
    }
}
