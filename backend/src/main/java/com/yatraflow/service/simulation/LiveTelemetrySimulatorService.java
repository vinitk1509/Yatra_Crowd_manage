package com.yatraflow.service.simulation;

import com.yatraflow.dto.pilgrim.CreatePilgrimRequest;
import com.yatraflow.dto.scan.CreateScanRequest;
import com.yatraflow.entity.*;
import com.yatraflow.repository.CheckpointRepository;
import com.yatraflow.repository.CrowdSnapshotRepository;
import com.yatraflow.repository.PilgrimRepository;
import com.yatraflow.repository.QrCodeRepository;
import com.yatraflow.repository.RouteRepository;
import com.yatraflow.service.CrowdIntelligenceService;
import com.yatraflow.service.PilgrimService;
import com.yatraflow.service.ScanEventService;
import lombok.Getter;
import lombok.RequiredArgsConstructor;
import lombok.Setter;
import lombok.extern.slf4j.Slf4j;
import org.springframework.scheduling.annotation.Scheduled;
import org.springframework.stereotype.Service;
import org.springframework.transaction.annotation.Transactional;

import java.time.LocalDateTime;
import java.util.List;
import java.util.Optional;
import java.util.Random;

@Service
@RequiredArgsConstructor
@Slf4j
public class LiveTelemetrySimulatorService {

    private final PilgrimRepository pilgrimRepository;
    private final CheckpointRepository checkpointRepository;
    private final RouteRepository routeRepository;
    private final QrCodeRepository qrCodeRepository;
    private final CrowdSnapshotRepository crowdSnapshotRepository;
    private final PilgrimService pilgrimService;
    private final ScanEventService scanEventService;
    private final CrowdIntelligenceService crowdIntelligenceService;

    private final Random random = new Random();

    @Getter
    @Setter
    private boolean active = true;

    private int tickCount = 0;

    private static final String[] SIM_NAMES = {
            "Rajesh Sharma", "Priya Verma", "Amitabh Sen", "Sunita Devi", "Vikram Rathore",
            "Deepak Joshi", "Meenakshi Gupta", "Rohan Malhotra", "Kavita Rao", "Sanjay Bhatt"
    };

    /**
     * Executes every 10 seconds to generate continuous, organic crowd flow telemetry.
     */
    @Scheduled(fixedRate = 10000, initialDelay = 15000)
    public void generateContinuousTelemetryTick() {
        if (!active) {
            return;
        }

        tickCount++;
        try {
            advancePilgrimFlow();

            // Every 3rd tick (30s), record fresh dynamic snapshot into history
            if (tickCount % 3 == 0) {
                recordDynamicCrowdSnapshots();
            }

            // Invalidate cache and broadcast live STOMP WebSocket update
            crowdIntelligenceService.invalidateCache();
            crowdIntelligenceService.broadcastLiveCrowdUpdate(null);

            log.debug("Continuous telemetry tick #{} completed.", tickCount);
        } catch (Exception e) {
            log.warn("Telemetry simulation tick encountered transient issue: {}", e.getMessage());
        }
    }

    @Transactional
    public void advancePilgrimFlow() {
        List<Pilgrim> allPilgrims = pilgrimRepository.findAll();

        // 1. If few active pilgrims exist, spawn a new simulated pilgrim
        long activeCount = allPilgrims.stream()
                .filter(p -> p.getStatus() == PilgrimStatus.REGISTERED || p.getStatus() == PilgrimStatus.IN_TRANSIT)
                .count();

        if (activeCount < 6) {
            String name = SIM_NAMES[random.nextInt(SIM_NAMES.length)] + " (" + (random.nextInt(900) + 100) + ")";
            CreatePilgrimRequest req = CreatePilgrimRequest.builder()
                    .name(name)
                    .age(25 + random.nextInt(40))
                    .gender(random.nextBoolean() ? "MALE" : "FEMALE")
                    .phoneNumber("+91 9" + (100000000 + random.nextInt(899999999)))
                    .emergencyContact("+91 9" + (100000000 + random.nextInt(899999999)))
                    .routeId(1L)
                    .build();
            pilgrimService.registerPilgrim(req);
            return;
        }

        // 2. Pick a pilgrim in transit or registered, and advance their scan
        for (Pilgrim p : allPilgrims) {
            Optional<QrCode> qrOpt = qrCodeRepository.findByPilgrimId(p.getId());
            if (qrOpt.isEmpty() || !qrOpt.get().isActive()) continue;
            QrCode qr = qrOpt.get();

            List<Checkpoint> routeCheckpoints = checkpointRepository.findByRouteIdOrderBySequenceOrderAsc(p.getRoute().getId());
            if (routeCheckpoints.isEmpty()) continue;

            if (p.getStatus() == PilgrimStatus.REGISTERED) {
                // First scan at Base Camp (CP-01)
                try {
                    CreateScanRequest scanReq = CreateScanRequest.builder()
                            .qrId(qr.getQrId())
                            .checkpointId(routeCheckpoints.get(0).getId())
                            .scanType(ScanType.ENTRY)
                            .build();
                    scanEventService.processScan(scanReq, "gate.operator@yatraflow.gov.in");
                    return;
                } catch (Exception ignored) {}
            } else if (p.getStatus() == PilgrimStatus.IN_TRANSIT && random.nextDouble() < 0.65) {
                // Advance to next checkpoint along the route
                Checkpoint targetCp = routeCheckpoints.get(Math.min(routeCheckpoints.size() - 1, random.nextInt(routeCheckpoints.size())));
                try {
                    CreateScanRequest scanReq = CreateScanRequest.builder()
                            .qrId(qr.getQrId())
                            .checkpointId(targetCp.getId())
                            .scanType(ScanType.TRANSIT)
                            .build();
                    scanEventService.processScan(scanReq, "checkpoint.operator@yatraflow.gov.in");
                    return;
                } catch (Exception ignored) {}
            }
        }
    }

    @Transactional
    public void recordDynamicCrowdSnapshots() {
        LocalDateTime now = LocalDateTime.now();
        List<Checkpoint> checkpoints = checkpointRepository.findAll();

        for (Checkpoint cp : checkpoints) {
            int baseCrowd = (int) (cp.getCapacity() * (0.45 + (random.nextDouble() * 0.40)));
            int inflow = 15 + random.nextInt(35);
            int outflow = 12 + random.nextInt(30);
            double speed = 1.6 + (random.nextDouble() * 1.5);
            double occupancy = Math.min(99.0, Math.round(((double) baseCrowd / cp.getCapacity()) * 1000.0) / 10.0);

            CrowdSnapshot snapshot = CrowdSnapshot.builder()
                    .checkpoint(cp)
                    .route(cp.getRoute())
                    .timestamp(now)
                    .crowdCount(baseCrowd)
                    .capacity(cp.getCapacity())
                    .occupancyPercentage(occupancy)
                    .inflow(inflow)
                    .outflow(outflow)
                    .netFlow(inflow - outflow)
                    .averageSpeed(Math.round(speed * 10.0) / 10.0)
                    .averageTransitTime(20.0 + random.nextInt(40))
                    .inTransitCount(40 + random.nextInt(100))
                    .status(occupancy >= 90 ? OperationalStatus.CRITICAL : occupancy >= 75 ? OperationalStatus.WATCH : OperationalStatus.NORMAL)
                    .dataStatus(DataFreshnessStatus.FRESH)
                    .build();

            crowdSnapshotRepository.save(snapshot);
        }
    }
}
