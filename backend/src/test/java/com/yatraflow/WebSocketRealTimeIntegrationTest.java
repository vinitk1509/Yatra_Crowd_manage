package com.yatraflow;

import com.yatraflow.dto.crowd.LiveCrowdResponse;
import com.yatraflow.dto.scan.CreateScanRequest;
import com.yatraflow.dto.scan.ScanEventDto;
import com.yatraflow.dto.websocket.EventType;
import com.yatraflow.dto.websocket.RealTimeEvent;
import com.yatraflow.entity.*;
import com.yatraflow.repository.CheckpointRepository;
import com.yatraflow.repository.PilgrimRepository;
import com.yatraflow.repository.QrCodeRepository;
import com.yatraflow.service.CrowdIntelligenceService;
import com.yatraflow.service.ScanEventService;
import org.junit.jupiter.api.BeforeEach;
import org.junit.jupiter.api.DisplayName;
import org.junit.jupiter.api.Test;
import org.springframework.beans.factory.annotation.Autowired;
import org.springframework.boot.test.context.SpringBootTest;
import org.springframework.messaging.simp.SimpMessagingTemplate;
import org.springframework.test.context.ActiveProfiles;
import org.springframework.transaction.annotation.Transactional;

import java.time.LocalDateTime;
import java.util.Optional;

import static org.assertj.core.api.Assertions.assertThat;
import static org.junit.jupiter.api.Assertions.assertDoesNotThrow;

@SpringBootTest(webEnvironment = SpringBootTest.WebEnvironment.RANDOM_PORT)
@ActiveProfiles("default")
public class WebSocketRealTimeIntegrationTest {

    @Autowired
    private ScanEventService scanEventService;

    @Autowired
    private CrowdIntelligenceService crowdIntelligenceService;

    @Autowired
    private CheckpointRepository checkpointRepository;

    @Autowired
    private PilgrimRepository pilgrimRepository;

    @Autowired
    private QrCodeRepository qrCodeRepository;

    @Autowired
    private SimpMessagingTemplate simpMessagingTemplate;

    private Checkpoint baltalCheckpoint;
    private Checkpoint domelCheckpoint;
    private Pilgrim testPilgrim;
    private QrCode testQr;

    @BeforeEach
    void setUp() {
        baltalCheckpoint = checkpointRepository.findByCode("CP-01").orElseThrow();
        domelCheckpoint = checkpointRepository.findByCode("CP-02").orElseThrow();

        Optional<Pilgrim> pOpt = pilgrimRepository.findByPilgrimCode("PIL-2026-1001-A91B");
        if (pOpt.isPresent()) {
            testPilgrim = pOpt.get();
        } else {
            testPilgrim = pilgrimRepository.findAll().get(0);
        }

        testQr = qrCodeRepository.findByPilgrimId(testPilgrim.getId()).orElseThrow();
    }

    @Test
    @DisplayName("Should broadcast live crowd update across STOMP channels without throwing exceptions")
    void shouldBroadcastLiveCrowdUpdateSuccessfully() {
        assertDoesNotThrow(() -> {
            crowdIntelligenceService.broadcastLiveCrowdUpdate(null);
        });

        LiveCrowdResponse response = crowdIntelligenceService.getLiveCrowdIntelligence();
        assertThat(response).isNotNull();
        assertThat(response.getCheckpoints()).isNotEmpty();
    }

    @Test
    @DisplayName("Should process scan event and trigger real-time crowd recomputation")
    @Transactional
    void shouldProcessScanAndRecomputeCrowd() {
        CreateScanRequest request = CreateScanRequest.builder()
                .qrId(testQr.getQrId())
                .checkpointId(domelCheckpoint.getId())
                .scanType(ScanType.TRANSIT)
                .build();

        ScanEventDto result = scanEventService.processScan(request, "checkpoint@yatraflow.gov.in");

        assertThat(result).isNotNull();
        assertThat(result.getValidationStatus()).isEqualTo(ScanValidationStatus.VALID);
        assertThat(result.getCheckpointCode()).isEqualTo("CP-02");

        // Verify that broadcast method executes safely even with the scan event attached
        assertDoesNotThrow(() -> {
            crowdIntelligenceService.broadcastLiveCrowdUpdate(null);
        });
    }

    @Test
    @DisplayName("Should construct typed RealTimeEvent payload with valid data freshness")
    void shouldConstructValidRealTimeEventPayload() {
        LiveCrowdResponse crowd = crowdIntelligenceService.getLiveCrowdIntelligence();

        RealTimeEvent<LiveCrowdResponse> event = RealTimeEvent.<LiveCrowdResponse>builder()
                .eventType(EventType.CROWD_UPDATED)
                .timestamp(LocalDateTime.now())
                .topic("/topic/global")
                .dataFreshness(DataFreshnessStatus.FRESH)
                .payload(crowd)
                .message("Real-time control room test broadcast")
                .build();

        assertThat(event.getEventType()).isEqualTo(EventType.CROWD_UPDATED);
        assertThat(event.getDataFreshness()).isEqualTo(DataFreshnessStatus.FRESH);
        assertThat(event.getPayload().getCheckpoints()).isNotEmpty();
        assertThat(event.getTopic()).isEqualTo("/topic/global");

        // Verify template converts and sends without error
        assertDoesNotThrow(() -> {
            simpMessagingTemplate.convertAndSend("/topic/global", event);
        });
    }
}
