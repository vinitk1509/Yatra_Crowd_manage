package com.yatraflow.dto.websocket;

import com.yatraflow.entity.DataFreshnessStatus;
import lombok.AllArgsConstructor;
import lombok.Builder;
import lombok.Data;
import lombok.NoArgsConstructor;

import java.time.LocalDateTime;

@Data
@Builder
@NoArgsConstructor
@AllArgsConstructor
public class RealTimeEvent<T> {
    private EventType eventType;
    @Builder.Default
    private LocalDateTime timestamp = LocalDateTime.now();
    private String topic;
    private DataFreshnessStatus dataFreshness;
    private T payload;
    private String message;
}
