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
public class LivePredictionsResponseDto {
    private LocalDateTime generatedAt;
    private Integer totalActivePilgrims;
    private Integer totalPredictedCrowd30m;
    private Double overallCurrentOccupancy;
    private Double overallPredictedOccupancy30m;
    private Integer criticalCheckpointsCount30m;
    private List<CheckpointPredictionDto> checkpointPredictions;
    private DataFreshnessStatus dataStatus;
    private String modelVersion;
}
