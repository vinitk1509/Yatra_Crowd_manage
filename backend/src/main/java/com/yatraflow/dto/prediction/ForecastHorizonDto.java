package com.yatraflow.dto.prediction;

import lombok.*;

@Getter
@Setter
@NoArgsConstructor
@AllArgsConstructor
@Builder
public class ForecastHorizonDto {
    private String horizon; // "+15 MIN", "+30 MIN", "+60 MIN"
    private Integer minutesAhead; // 15, 30, 60
    private Integer predictedCrowd;
    private Double predictedOccupancy;
    private String riskStatus; // "NORMAL", "PROJECTED_WATCH", "PROJECTED_HIGH", "PROJECTED_CRITICAL"

    // Model uncertainty bounds (e.g. 95% prediction interval: mean +/- 1.96 * RMSE)
    private Integer lowerCrowdBound;
    private Integer upperCrowdBound;
    private Double lowerOccupancyBound;
    private Double upperOccupancyBound;
}
