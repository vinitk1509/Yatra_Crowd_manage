package com.yatraflow.dto.analytics;

import lombok.*;

import java.time.LocalDateTime;

@Getter
@Setter
@NoArgsConstructor
@AllArgsConstructor
@Builder
public class MlTrainingSequenceDto {
    private LocalDateTime timestamp;
    private String checkpointCode;
    private String routeCode;

    // Temporal lag features (e.g. 5m / 15m steps)
    private Integer crowd_t_minus_4;
    private Integer crowd_t_minus_3;
    private Integer crowd_t_minus_2;
    private Integer crowd_t_minus_1;
    private Integer current_crowd;

    private Integer inflow;
    private Integer outflow;
    private Integer netFlow;
    private Double speed;
    private Double transitTimeMinutes;
    private Double occupancyPercentage;
    private Integer capacity;

    // Temporal context
    private Double timeOfDayHour; // e.g. 14.5 for 14:30
    private Integer dayOfWeek;    // 1 (Monday) to 7 (Sunday)
    private Boolean isWeekend;
}
