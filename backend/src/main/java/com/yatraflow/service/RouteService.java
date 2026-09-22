package com.yatraflow.service;

import com.yatraflow.dto.route.CreateRouteRequest;
import com.yatraflow.dto.route.RouteDto;
import com.yatraflow.entity.Route;
import com.yatraflow.exception.BadRequestException;
import com.yatraflow.exception.ResourceNotFoundException;
import com.yatraflow.repository.RouteRepository;
import lombok.RequiredArgsConstructor;
import org.springframework.stereotype.Service;
import org.springframework.transaction.annotation.Transactional;

import java.util.List;
import java.util.stream.Collectors;

@Service
@RequiredArgsConstructor
public class RouteService {

    private final RouteRepository routeRepository;

    @Transactional(readOnly = true)
    public List<RouteDto> getAllRoutes() {
        return routeRepository.findAll().stream()
                .map(RouteDto::fromEntity)
                .collect(Collectors.toList());
    }

    @Transactional(readOnly = true)
    public RouteDto getRouteById(Long id) {
        Route route = routeRepository.findById(id)
                .orElseThrow(() -> new ResourceNotFoundException("Route not found with id: " + id));
        return RouteDto.fromEntity(route);
    }

    @Transactional
    public RouteDto createRoute(CreateRouteRequest request) {
        if (routeRepository.existsByCode(request.getCode().trim().toUpperCase())) {
            throw new BadRequestException("Route with code '" + request.getCode() + "' already exists");
        }

        Route route = Route.builder()
                .name(request.getName().trim())
                .code(request.getCode().trim().toUpperCase())
                .description(request.getDescription())
                .active(request.isActive())
                .build();

        return RouteDto.fromEntity(routeRepository.save(route));
    }
}
