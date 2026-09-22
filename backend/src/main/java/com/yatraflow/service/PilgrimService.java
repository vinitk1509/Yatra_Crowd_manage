package com.yatraflow.service;

import com.yatraflow.dto.pilgrim.CreatePilgrimRequest;
import com.yatraflow.dto.pilgrim.PilgrimDto;
import com.yatraflow.dto.qr.QrCodeDto;
import com.yatraflow.entity.Pilgrim;
import com.yatraflow.entity.PilgrimStatus;
import com.yatraflow.entity.QrCode;
import com.yatraflow.entity.Route;
import com.yatraflow.exception.ResourceNotFoundException;
import com.yatraflow.repository.PilgrimRepository;
import com.yatraflow.repository.QrCodeRepository;
import com.yatraflow.repository.RouteRepository;
import lombok.RequiredArgsConstructor;
import lombok.extern.slf4j.Slf4j;
import org.springframework.stereotype.Service;
import org.springframework.transaction.annotation.Transactional;

import java.util.List;
import java.util.Optional;
import java.util.UUID;
import java.util.stream.Collectors;

@Service
@RequiredArgsConstructor
@Slf4j
public class PilgrimService {

    private final PilgrimRepository pilgrimRepository;
    private final RouteRepository routeRepository;
    private final QrCodeRepository qrCodeRepository;
    private final QrCodeService qrCodeService;

    @Transactional
    public PilgrimDto registerPilgrim(CreatePilgrimRequest request) {
        Route route = routeRepository.findById(request.getRouteId())
                .orElseThrow(() -> new ResourceNotFoundException("Route not found with ID: " + request.getRouteId()));

        long count = pilgrimRepository.count() + 1001;
        String randomSuffix = UUID.randomUUID().toString().substring(0, 4).toUpperCase();
        String pilgrimCode = String.format("PIL-2026-%04d-%s", count, randomSuffix);

        Pilgrim pilgrim = Pilgrim.builder()
                .pilgrimCode(pilgrimCode)
                .name(request.getName().trim())
                .age(request.getAge())
                .gender(request.getGender().trim().toUpperCase())
                .phoneNumber(request.getPhoneNumber() != null ? request.getPhoneNumber().trim() : null)
                .emergencyContact(request.getEmergencyContact() != null ? request.getEmergencyContact().trim() : null)
                .route(route)
                .status(PilgrimStatus.REGISTERED)
                .build();

        Pilgrim savedPilgrim = pilgrimRepository.save(pilgrim);

        // Automatically assign unique QR code upon pilgrim registration
        QrCode qrCode = qrCodeService.generateQr(savedPilgrim);

        PilgrimDto dto = PilgrimDto.fromEntity(savedPilgrim);
        dto.setQrCode(QrCodeDto.fromEntity(qrCode));
        return dto;
    }

    @Transactional(readOnly = true)
    public List<PilgrimDto> getAllPilgrims() {
        return pilgrimRepository.findAll().stream()
                .map(this::mapPilgrimWithQr)
                .collect(Collectors.toList());
    }

    @Transactional(readOnly = true)
    public PilgrimDto getPilgrimById(Long id) {
        Pilgrim pilgrim = pilgrimRepository.findById(id)
                .orElseThrow(() -> new ResourceNotFoundException("Pilgrim not found with ID: " + id));
        return mapPilgrimWithQr(pilgrim);
    }

    @Transactional(readOnly = true)
    public PilgrimDto getPilgrimByCode(String code) {
        Pilgrim pilgrim = pilgrimRepository.findByPilgrimCode(code)
                .orElseThrow(() -> new ResourceNotFoundException("Pilgrim not found with code: " + code));
        return mapPilgrimWithQr(pilgrim);
    }

    private PilgrimDto mapPilgrimWithQr(Pilgrim pilgrim) {
        PilgrimDto dto = PilgrimDto.fromEntity(pilgrim);
        Optional<QrCode> qrOpt = qrCodeRepository.findByPilgrimId(pilgrim.getId());
        qrOpt.ifPresent(qr -> dto.setQrCode(QrCodeDto.fromEntity(qr)));
        return dto;
    }
}
