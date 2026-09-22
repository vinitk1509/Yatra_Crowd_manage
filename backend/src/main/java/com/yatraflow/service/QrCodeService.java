package com.yatraflow.service;

import com.fasterxml.jackson.core.JsonProcessingException;
import com.fasterxml.jackson.databind.ObjectMapper;
import com.yatraflow.dto.pilgrim.PilgrimDto;
import com.yatraflow.dto.qr.QrCodeDto;
import com.yatraflow.dto.qr.ValidateQrResponse;
import com.yatraflow.dto.route.RouteDto;
import com.yatraflow.dto.scan.ScanEventDto;
import com.yatraflow.entity.*;
import com.yatraflow.exception.BadRequestException;
import com.yatraflow.exception.ResourceNotFoundException;
import com.yatraflow.repository.CheckpointRepository;
import com.yatraflow.repository.QrCodeRepository;
import com.yatraflow.repository.ScanEventRepository;
import lombok.RequiredArgsConstructor;
import lombok.extern.slf4j.Slf4j;
import org.springframework.stereotype.Service;
import org.springframework.transaction.annotation.Transactional;

import java.util.LinkedHashMap;
import java.util.Map;
import java.util.Optional;
import java.util.UUID;

@Service
@RequiredArgsConstructor
@Slf4j
public class QrCodeService {

    private final QrCodeRepository qrCodeRepository;
    private final CheckpointRepository checkpointRepository;
    private final ScanEventRepository scanEventRepository;
    private final ObjectMapper objectMapper;

    @Transactional
    public QrCode generateQr(Pilgrim pilgrim) {
        // If an active QR already exists for this pilgrim, return it
        Optional<QrCode> existing = qrCodeRepository.findByPilgrimId(pilgrim.getId());
        if (existing.isPresent()) {
            return existing.get();
        }

        String uniqueSuffix = UUID.randomUUID().toString().substring(0, 8).toUpperCase();
        String qrId = "QR-YF-" + pilgrim.getId() + "-" + uniqueSuffix;

        // Minimal required identifiers only - NO dynamic tracking/location info
        Map<String, String> payloadMap = new LinkedHashMap<>();
        payloadMap.put("qrId", qrId);
        payloadMap.put("pilgrimId", pilgrim.getPilgrimCode());
        payloadMap.put("routeId", pilgrim.getRoute().getCode());
        payloadMap.put("v", "1.0");

        String payload;
        try {
            payload = objectMapper.writeValueAsString(payloadMap);
        } catch (JsonProcessingException e) {
            payload = String.format("{\"qrId\":\"%s\",\"pilgrimId\":\"%s\",\"routeId\":\"%s\",\"v\":\"1.0\"}",
                    qrId, pilgrim.getPilgrimCode(), pilgrim.getRoute().getCode());
        }

        QrCode qrCode = QrCode.builder()
                .qrId(qrId)
                .pilgrim(pilgrim)
                .route(pilgrim.getRoute())
                .version("1.0")
                .active(true)
                .payload(payload)
                .build();

        return qrCodeRepository.save(qrCode);
    }

    @Transactional(readOnly = true)
    public QrCodeDto getQrByQrId(String qrId) {
        String cleanedQrId = extractCleanQrId(qrId);
        QrCode qr = qrCodeRepository.findByQrId(cleanedQrId)
                .orElseThrow(() -> new ResourceNotFoundException("QR Code not found with ID: " + cleanedQrId));
        return QrCodeDto.fromEntity(qr);
    }

    @Transactional(readOnly = true)
    public ValidateQrResponse validateQr(String rawQrInput, Long checkpointId) {
        String qrId = extractCleanQrId(rawQrInput);
        Optional<QrCode> qrOpt = qrCodeRepository.findByQrId(qrId);

        if (qrOpt.isEmpty()) {
            return ValidateQrResponse.builder()
                    .valid(false)
                    .status("UNKNOWN_QR")
                    .message("QR Code does not exist in the Yatra registry")
                    .build();
        }

        QrCode qr = qrOpt.get();
        if (!qr.isActive()) {
            return ValidateQrResponse.builder()
                    .valid(false)
                    .status("INACTIVE_QR")
                    .message("This QR Code credential is deactivated/revoked")
                    .qrCode(QrCodeDto.fromEntity(qr))
                    .pilgrim(PilgrimDto.fromEntity(qr.getPilgrim()))
                    .build();
        }

        Pilgrim pilgrim = qr.getPilgrim();
        if (pilgrim == null || pilgrim.getStatus() == PilgrimStatus.DEACTIVATED) {
            return ValidateQrResponse.builder()
                    .valid(false)
                    .status("DEACTIVATED_PILGRIM")
                    .message("Pilgrim profile is suspended or inactive")
                    .build();
        }

        boolean routeMatches = true;
        String checkpointMessage = "QR credentials verified successfully";

        if (checkpointId != null) {
            Checkpoint checkpoint = checkpointRepository.findById(checkpointId)
                    .orElseThrow(() -> new ResourceNotFoundException("Checkpoint not found with ID: " + checkpointId));

            if (!checkpoint.getRoute().getId().equals(pilgrim.getRoute().getId())) {
                routeMatches = false;
                checkpointMessage = String.format("Wrong route! Pilgrim is registered for '%s', but checkpoint '%s' belongs to '%s'",
                        pilgrim.getRoute().getName(), checkpoint.getName(), checkpoint.getRoute().getName());
            }
        }

        // Fetch last scan event if present
        Optional<ScanEvent> lastScan = scanEventRepository.findTopByPilgrimIdOrderByScanTimestampDesc(pilgrim.getId());

        return ValidateQrResponse.builder()
                .valid(routeMatches)
                .status(routeMatches ? "VALID" : "WRONG_ROUTE")
                .message(checkpointMessage)
                .qrCode(QrCodeDto.fromEntity(qr))
                .pilgrim(PilgrimDto.fromEntity(pilgrim))
                .route(RouteDto.fromEntity(pilgrim.getRoute()))
                .lastScan(lastScan.map(ScanEventDto::fromEntity).orElse(null))
                .routeMatchesCheckpoint(routeMatches)
                .build();
    }

    public String extractCleanQrId(String input) {
        if (input == null || input.trim().isEmpty()) {
            throw new BadRequestException("QR input is required");
        }
        String trimmed = input.trim();
        // If JSON payload is scanned directly
        if (trimmed.startsWith("{") && trimmed.contains("\"qrId\"")) {
            try {
                Map<?, ?> map = objectMapper.readValue(trimmed, Map.class);
                if (map.containsKey("qrId")) {
                    return map.get("qrId").toString();
                }
            } catch (Exception ignored) {
            }
        }
        return trimmed;
    }
}
