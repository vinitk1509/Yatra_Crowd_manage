package com.yatraflow.entity;

public enum ScanValidationStatus {
    VALID,
    DUPLICATE_SCAN,
    WRONG_ROUTE,
    INACTIVE_QR,
    UNKNOWN_PILGRIM,
    INVALID_SEQUENCE,
    UNAUTHORIZED_CHECKPOINT
}
