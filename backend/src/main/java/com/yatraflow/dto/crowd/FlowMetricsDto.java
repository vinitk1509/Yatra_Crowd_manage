package com.yatraflow.dto.crowd;

import lombok.*;

import java.time.LocalDateTime;
import java.util.List;

@Getter
@Setter
@NoArgsConstructor
@AllArgsConstructor
@Builder
public class FlowMetricsDto {
    private String checkpointCode;
    private String checkpointName;
    private Integer currentInflowPerMinute;
    private Integer currentOutflowPerMinute;
    private Integer netFlowPerMinute;
    private Integer windowMinutes;
    private List<FlowTimePointDto> timeSeries;

    @Getter
    @Setter
    @NoArgsConstructor
    @AllArgsConstructor
    @Builder
    public static class FlowTimePointDto {
        private String timeLabel;
        private Integer inflow;
        private Integer outflow;
    }
}
