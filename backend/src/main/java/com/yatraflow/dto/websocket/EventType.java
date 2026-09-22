package com.yatraflow.dto.websocket;

public enum EventType {
    SCAN_RECEIVED,
    CROWD_UPDATED,
    CHECKPOINT_STATUS_CHANGED,
    BOTTLENECK_DETECTED,
    DATA_STALE,
    EMERGENCY_CREATED
}
