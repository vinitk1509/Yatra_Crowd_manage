package com.yatraflow.service;

import com.yatraflow.dto.checkpoint.CheckpointDto;
import com.yatraflow.dto.checkpoint.CreateCheckpointRequest;
import com.yatraflow.entity.Checkpoint;
import com.yatraflow.entity.Route;
import com.yatraflow.exception.BadRequestException;
import com.yatraflow.exception.ResourceNotFoundException;
import com.yatraflow.repository.CheckpointRepository;
import com.yatraflow.repository.RouteRepository;
import lombok.RequiredArgsConstructor;
import org.springframework.stereotype.Service;
import org.springframework.transaction.annotation.Transactional;

import java.util.List;
import java.util.stream.Collectors;

@Service
@RequiredArgsConstructor
public class CheckpointService {

    private final CheckpointRepository checkpointRepository;
    private final RouteRepository routeRepository;

    @Transactional(readOnly = true)
    public List<CheckpointDto> getAllCheckpoints() {
        return checkpointRepository.findAll().stream()
                .map(CheckpointDto::fromEntity)
                .collect(Collectors.toList());
    }

    @Transactional(readOnly = true)
    public CheckpointDto getCheckpointById(Long id) {
        Checkpoint cp = checkpointRepository.findById(id)
                .orElseThrow(() -> new ResourceNotFoundException("Checkpoint not found with id: " + id));
        return CheckpointDto.fromEntity(cp);
    }

    @Transactional(readOnly = true)
    public List<CheckpointDto> getCheckpointsByRoute(Long routeId) {
        return checkpointRepository.findByRouteId(routeId).stream()
                .map(CheckpointDto::fromEntity)
                .collect(Collectors.toList());
    }

    @Transactional
    public CheckpointDto createCheckpoint(CreateCheckpointRequest request) {
        if (checkpointRepository.existsByCode(request.getCode().trim().toUpperCase())) {
            throw new BadRequestException("Checkpoint with code '" + request.getCode() + "' already exists");
        }

        Route route = routeRepository.findById(request.getRouteId())
                .orElseThrow(() -> new ResourceNotFoundException("Route not found with id: " + request.getRouteId()));

        Checkpoint checkpoint = Checkpoint.builder()
                .name(request.getName().trim())
                .code(request.getCode().trim().toUpperCase())
                .route(route)
                .capacity(request.getCapacity())
                .latitude(request.getLatitude())
                .longitude(request.getLongitude())
                .active(request.isActive())
                .build();

        return CheckpointDto.fromEntity(checkpointRepository.save(checkpoint));
    }
}
