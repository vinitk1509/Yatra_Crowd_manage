package com.yatraflow.dto.checkpoint;

import com.yatraflow.dto.route.RouteDto;
import com.yatraflow.entity.Checkpoint;
import lombok.AllArgsConstructor;
import lombok.Builder;
import lombok.Data;
import lombok.NoArgsConstructor;

import java.time.LocalDateTime;

@Data
@Builder
@NoArgsConstructor
@AllArgsConstructor
public class CheckpointDto {
    private Long id;
    private String name;
    private String code;
    private Long routeId;
    private String routeName;
    private String routeCode;
    private Integer capacity;
    private Double latitude;
    private Double longitude;
    private boolean active;
    private LocalDateTime createdAt;
    private LocalDateTime updatedAt;

    public static CheckpointDto fromEntity(Checkpoint cp) {
        if (cp == null) return null;
        return CheckpointDto.builder()
                .id(cp.getId())
                .name(cp.getName())
                .code(cp.getCode())
                .routeId(cp.getRoute() != null ? cp.getRoute().getId() : null)
                .routeName(cp.getRoute() != null ? cp.getRoute().getName() : null)
                .routeCode(cp.getRoute() != null ? cp.getRoute().getCode() : null)
                .capacity(cp.getCapacity())
                .latitude(cp.getLatitude())
                .longitude(cp.getLongitude())
                .active(cp.isActive())
                .createdAt(cp.getCreatedAt())
                .updatedAt(cp.getUpdatedAt())
                .build();
    }
}
