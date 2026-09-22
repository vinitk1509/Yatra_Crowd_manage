package com.yatraflow.dto.analytics;

import lombok.*;

import java.time.LocalDateTime;
import java.util.List;

@Getter
@Setter
@NoArgsConstructor
@AllArgsConstructor
@Builder
public class HistoricalAnalyticsResponseDto {
    private LocalDateTime startTime;
    private LocalDateTime endTime;
    private String interval; // "5m", "15m", "30m", "1h", "1d"
    private Long checkpointId;
    private String checkpointCode;
    private Long routeId;
    private String routeCode;

    private HistoricalAnalyticsSummaryDto summary;
    private List<HistoricalTimeSeriesPointDto> timeSeries;
    private List<MlTrainingSequenceDto> mlSequences;
}
