package com.yatraflow.dto.prediction;

import com.yatraflow.entity.DataFreshnessStatus;
import lombok.*;

import java.time.LocalDateTime;
import java.util.List;

@Getter
@Setter
@NoArgsConstructor
@AllArgsConstructor
@Builder
public class CheckpointPredictionDto {
    private Long checkpointId;
    private String checkpointCode;
    private String checkpointName;
    private Long routeId;
    private String routeCode;

    private Integer currentCrowd;
    private Integer capacity;
    private Double currentOccupancy;

    private ForecastHorizonDto forecast15m;
    private ForecastHorizonDto forecast30m;
    private ForecastHorizonDto forecast60m;

    private List<PredictionSignalDto> signals;

    private LocalDateTime generatedAt;
    private DataFreshnessStatus dataStatus;
    private String modelVersion;
}
