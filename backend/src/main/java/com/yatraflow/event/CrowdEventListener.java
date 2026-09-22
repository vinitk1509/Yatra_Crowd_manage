package com.yatraflow.event;

import com.yatraflow.service.CrowdIntelligenceService;
import lombok.RequiredArgsConstructor;
import lombok.extern.slf4j.Slf4j;
import org.springframework.scheduling.annotation.Async;
import org.springframework.stereotype.Component;
import org.springframework.transaction.event.TransactionPhase;
import org.springframework.transaction.event.TransactionalEventListener;

@Component
@RequiredArgsConstructor
@Slf4j
public class CrowdEventListener {

    private final CrowdIntelligenceService crowdIntelligenceService;

    @TransactionalEventListener(phase = TransactionPhase.AFTER_COMMIT)
    public void onScanProcessed(ScanProcessedEvent event) {
        log.info("Handling ScanProcessedEvent for scan ID: {}, valid: {}", 
                event.getScanEvent().getId(), event.isValid());
        // Trigger live crowd recomputation and STOMP broadcast
        crowdIntelligenceService.broadcastLiveCrowdUpdate(event.getScanEvent());
    }
}
