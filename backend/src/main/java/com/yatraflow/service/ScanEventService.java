package com.yatraflow.service;

import com.yatraflow.dto.scan.CreateScanRequest;
import com.yatraflow.dto.scan.ScanEventDto;
import com.yatraflow.entity.*;
import com.yatraflow.exception.BadRequestException;
import com.yatraflow.exception.ResourceNotFoundException;
import com.yatraflow.event.ScanProcessedEvent;
import com.yatraflow.repository.CheckpointRepository;
import com.yatraflow.repository.PilgrimRepository;
import com.yatraflow.repository.QrCodeRepository;
import com.yatraflow.repository.ScanEventRepository;
import lombok.RequiredArgsConstructor;
import lombok.extern.slf4j.Slf4j;
import org.springframework.context.ApplicationEventPublisher;
import org.springframework.stereotype.Service;
import org.springframework.transaction.annotation.Transactional;

import java.time.LocalDateTime;
import java.util.List;
import java.util.Optional;
import java.util.stream.Collectors;

@Service
@RequiredArgsConstructor
@Slf4j
public class ScanEventService {

    private final ScanEventRepository scanEventRepository;
    private final QrCodeRepository qrCodeRepository;
    private final CheckpointRepository checkpointRepository;
    private final PilgrimRepository pilgrimRepository;
    private final QrCodeService qrCodeService;
    private final ApplicationEventPublisher applicationEventPublisher;

    @Transactional
    public ScanEventDto processScan(CreateScanRequest request, String operatorEmail) {
        LocalDateTime trustedServerTime = LocalDateTime.now();
        String cleanQrId = qrCodeService.extractCleanQrId(request.getQrId());

        // 1. Verify Checkpoint existence
        Checkpoint checkpoint = checkpointRepository.findById(request.getCheckpointId())
                .orElseThrow(() -> new ResourceNotFoundException("Checkpoint not found with ID: " + request.getCheckpointId()));

        // 2. Locate QR Code
        Optional<QrCode> qrOpt = qrCodeRepository.findByQrId(cleanQrId);
        if (qrOpt.isEmpty()) {
            throw new ResourceNotFoundException("Unrecognized QR Code: " + cleanQrId);
        }

        QrCode qrCode = qrOpt.get();
        Pilgrim pilgrim = qrCode.getPilgrim();
        Route route = pilgrim.getRoute();
        ScanType scanType = request.getScanType() != null ? request.getScanType() : ScanType.TRANSIT;

        // 3. Validation: Inactive QR
        if (!qrCode.isActive() || pilgrim.getStatus() == PilgrimStatus.DEACTIVATED) {
            recordScanEvent(cleanQrId, pilgrim, checkpoint, route, trustedServerTime, scanType, operatorEmail,
                    ScanValidationStatus.INACTIVE_QR, "QR credential or pilgrim is inactive");
            throw new BadRequestException("Scan rejected: QR code credential is deactivated or revoked");
        }

        // 4. Validation: Wrong Route (Checkpoint is not on pilgrim's registered route)
        if (!checkpoint.getRoute().getId().equals(route.getId())) {
            String reason = String.format("Route mismatch: Pilgrim is registered for '%s', but checkpoint '%s' is on '%s'",
                    route.getName(), checkpoint.getName(), checkpoint.getRoute().getName());
            recordScanEvent(cleanQrId, pilgrim, checkpoint, route, trustedServerTime, scanType, operatorEmail,
                    ScanValidationStatus.WRONG_ROUTE, reason);
            throw new BadRequestException("Scan rejected: " + reason);
        }

        // 5. Validation: Duplicate Scan Guard (Anti-passback / duplicate scan check within 60 seconds at same checkpoint)
        Optional<ScanEvent> latestScanOpt = scanEventRepository.findTopByPilgrimIdOrderByScanTimestampDesc(pilgrim.getId());
        if (latestScanOpt.isPresent()) {
            ScanEvent latestScan = latestScanOpt.get();
            if (latestScan.getCheckpoint().getId().equals(checkpoint.getId())
                    && latestScan.getValidationStatus() == ScanValidationStatus.VALID
                    && latestScan.getScanTimestamp().isAfter(trustedServerTime.minusSeconds(60))) {
                
                String reason = String.format("Duplicate scan detected at %s within 60 seconds", checkpoint.getName());
                recordScanEvent(cleanQrId, pilgrim, checkpoint, route, trustedServerTime, scanType, operatorEmail,
                        ScanValidationStatus.DUPLICATE_SCAN, reason);
                throw new BadRequestException("Scan rejected: " + reason);
            }
        }

        // 6. Valid Movement Event
        ScanEvent validScan = recordScanEvent(cleanQrId, pilgrim, checkpoint, route, trustedServerTime, scanType, operatorEmail,
                ScanValidationStatus.VALID, null);

        // 7. Update Pilgrim Transit State
        if (checkpoint.getCode().equalsIgnoreCase("CP-05") || checkpoint.getName().toLowerCase().contains("holy cave")) {
            pilgrim.setStatus(PilgrimStatus.COMPLETED);
        } else if (pilgrim.getStatus() == PilgrimStatus.REGISTERED) {
            pilgrim.setStatus(PilgrimStatus.IN_TRANSIT);
        }
        pilgrimRepository.save(pilgrim);

        log.info("Recorded valid scan event for pilgrim {} [{}] at checkpoint {} [{}] by {}",
                pilgrim.getName(), pilgrim.getPilgrimCode(), checkpoint.getName(), checkpoint.getCode(), operatorEmail);

        return ScanEventDto.fromEntity(validScan);
    }

    private ScanEvent recordScanEvent(
            String qrId,
            Pilgrim pilgrim,
            Checkpoint checkpoint,
            Route route,
            LocalDateTime timestamp,
            ScanType scanType,
            String operatorEmail,
            ScanValidationStatus status,
            String failureReason
    ) {
        ScanEvent scanEvent = ScanEvent.builder()
                .qrId(qrId)
                .pilgrim(pilgrim)
                .checkpoint(checkpoint)
                .route(route)
                .scanTimestamp(timestamp)
                .scanType(scanType)
                .operatorEmail(operatorEmail != null ? operatorEmail : "system@yatraflow.gov.in")
                .validationStatus(status)
                .failureReason(failureReason)
                .build();

        ScanEvent saved = scanEventRepository.save(scanEvent);
        // Publish event for transactional listeners (AFTER_COMMIT WebSocket broadcast)
        applicationEventPublisher.publishEvent(new ScanProcessedEvent(this, saved, status == ScanValidationStatus.VALID));
        return saved;
    }

    @Transactional(readOnly = true)
    public List<ScanEventDto> getScansForPilgrim(Long pilgrimId) {
        return scanEventRepository.findByPilgrimIdOrderByScanTimestampDesc(pilgrimId).stream()
                .map(ScanEventDto::fromEntity)
                .collect(Collectors.toList());
    }

    @Transactional(readOnly = true)
    public List<ScanEventDto> getScansForCheckpoint(Long checkpointId) {
        return scanEventRepository.findByCheckpointIdOrderByScanTimestampDesc(checkpointId).stream()
                .map(ScanEventDto::fromEntity)
                .collect(Collectors.toList());
    }
}
