package com.yatraflow.event;

import com.yatraflow.entity.ScanEvent;
import lombok.Getter;
import org.springframework.context.ApplicationEvent;

@Getter
public class ScanProcessedEvent extends ApplicationEvent {

    private final ScanEvent scanEvent;
    private final boolean valid;

    public ScanProcessedEvent(Object source, ScanEvent scanEvent, boolean valid) {
        super(source);
        this.scanEvent = scanEvent;
        this.valid = valid;
    }
}
