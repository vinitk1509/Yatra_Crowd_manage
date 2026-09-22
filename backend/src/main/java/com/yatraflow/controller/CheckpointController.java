package com.yatraflow.controller;

import com.yatraflow.dto.checkpoint.CheckpointDto;
import com.yatraflow.dto.checkpoint.CreateCheckpointRequest;
import com.yatraflow.dto.common.ApiResponse;
import com.yatraflow.service.CheckpointService;
import jakarta.validation.Valid;
import lombok.RequiredArgsConstructor;
import org.springframework.http.HttpStatus;
import org.springframework.http.ResponseEntity;
import org.springframework.security.access.prepost.PreAuthorize;
import org.springframework.web.bind.annotation.*;

import java.util.List;

@RestController
@RequestMapping("/api/checkpoints")
@RequiredArgsConstructor
public class CheckpointController {

    private final CheckpointService checkpointService;

    @GetMapping
    public ResponseEntity<ApiResponse<List<CheckpointDto>>> getAllCheckpoints() {
        List<CheckpointDto> checkpoints = checkpointService.getAllCheckpoints();
        return ResponseEntity.ok(ApiResponse.success("Checkpoints retrieved successfully", checkpoints));
    }

    @GetMapping("/{id}")
    public ResponseEntity<ApiResponse<CheckpointDto>> getCheckpointById(@PathVariable Long id) {
        CheckpointDto checkpoint = checkpointService.getCheckpointById(id);
        return ResponseEntity.ok(ApiResponse.success("Checkpoint retrieved successfully", checkpoint));
    }

    @GetMapping("/route/{routeId}")
    public ResponseEntity<ApiResponse<List<CheckpointDto>>> getCheckpointsByRoute(@PathVariable Long routeId) {
        List<CheckpointDto> checkpoints = checkpointService.getCheckpointsByRoute(routeId);
        return ResponseEntity.ok(ApiResponse.success("Checkpoints for route retrieved successfully", checkpoints));
    }

    @PostMapping
    @PreAuthorize("hasAnyRole('ADMIN', 'SUPERVISOR')")
    public ResponseEntity<ApiResponse<CheckpointDto>> createCheckpoint(@Valid @RequestBody CreateCheckpointRequest request) {
        CheckpointDto createdCheckpoint = checkpointService.createCheckpoint(request);
        return ResponseEntity.status(HttpStatus.CREATED)
                .body(ApiResponse.success("Checkpoint created successfully", createdCheckpoint));
    }
}
