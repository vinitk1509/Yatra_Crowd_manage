package com.yatraflow.dto.route;

import com.yatraflow.entity.Route;
import lombok.AllArgsConstructor;
import lombok.Builder;
import lombok.Data;
import lombok.NoArgsConstructor;

import java.time.LocalDateTime;

@Data
@Builder
@NoArgsConstructor
@AllArgsConstructor
public class RouteDto {
    private Long id;
    private String name;
    private String code;
    private String description;
    private boolean active;
    private LocalDateTime createdAt;
    private LocalDateTime updatedAt;

    public static RouteDto fromEntity(Route route) {
        if (route == null) return null;
        return RouteDto.builder()
                .id(route.getId())
                .name(route.getName())
                .code(route.getCode())
                .description(route.getDescription())
                .active(route.isActive())
                .createdAt(route.getCreatedAt())
                .updatedAt(route.getUpdatedAt())
                .build();
    }
}
