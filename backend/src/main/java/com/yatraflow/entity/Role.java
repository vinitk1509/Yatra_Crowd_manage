package com.yatraflow.entity;

public enum Role {
    ADMIN,
    CONTROL_ROOM_OPERATOR,
    CHECKPOINT_OPERATOR,
    EMERGENCY_OFFICER,
    SUPERVISOR,
    PILGRIM;

    public String getAuthority() {
        return "ROLE_" + this.name();
    }
}
