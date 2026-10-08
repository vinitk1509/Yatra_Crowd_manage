package com.yatraflow.service;

import com.yatraflow.dto.emergency.*;
import com.yatraflow.dto.websocket.EventType;
import com.yatraflow.dto.websocket.RealTimeEvent;
import com.yatraflow.entity.*;
import com.yatraflow.exception.BadRequestException;
import com.yatraflow.exception.ResourceNotFoundException;
import com.yatraflow.exception.UnauthorizedException;
import com.yatraflow.repository.*;
import lombok.RequiredArgsConstructor;
import lombok.extern.slf4j.Slf4j;
import org.springframework.messaging.simp.SimpMessagingTemplate;
import org.springframework.stereotype.Service;
import org.springframework.transaction.annotation.Transactional;

import java.time.LocalDateTime;
import java.time.format.DateTimeFormatter;
import java.util.*;
import java.util.concurrent.ThreadLocalRandom;
import java.util.stream.Collectors;

@Service
@RequiredArgsConstructor
@Slf4j
public class EmergencyIncidentService {

    private final EmergencyIncidentRepository emergencyIncidentRepository;
    private final PilgrimRepository pilgrimRepository;
    private final UserRepository userRepository;
    private final RouteRepository routeRepository;
    private final CheckpointRepository checkpointRepository;
    private final ScanEventRepository scanEventRepository;
    private final SimpMessagingTemplate messagingTemplate;

    /**
     * Creates a personal medical / safety SOS for an authenticated pilgrim.
     * Enforces strict privacy: GPS and identity details are broadcast ONLY to /topic/emergency/private.
     */
    @Transactional
    public EmergencyIncidentDto createPersonalSos(CreatePersonalSosRequest request, String userEmail) {
        User user = userRepository.findByEmail(userEmail)
                .orElseThrow(() -> new UnauthorizedException("User session not found for email: " + userEmail));

        // Find or associate pilgrim
        Pilgrim pilgrim = pilgrimRepository.findByNameIgnoreCase(user.getName())
                .orElseGet(() -> {
                    List<Pilgrim> all = pilgrimRepository.findAll();
                    return all.stream()
                            .filter(p -> p.getName().equalsIgnoreCase(user.getName()) || 
                                    (p.getPhoneNumber() != null && user.getEmail().contains(p.getPhoneNumber())))
                            .findFirst()
                            .orElseGet(() -> all.isEmpty() ? null : all.get(0));
                });

        if (pilgrim == null) {
            throw new BadRequestException("No registered Pilgrim profile found for user account: " + userEmail);
        }

        // Prevent accidental rapid duplicate SOS spam of the same type within 60 seconds
        List<EmergencyIncident> activeSos = emergencyIncidentRepository.findActiveByPilgrimId(pilgrim.getId());
        if (!activeSos.isEmpty()) {
            EmergencyIncident latest = activeSos.get(0);
            if (latest.getIncidentType() == request.getIncidentType() && latest.getReportedAt().isAfter(LocalDateTime.now().minusSeconds(60))) {
                log.info("Duplicate SOS debounced for pilgrim {}. Returning active incident {}.", pilgrim.getName(), latest.getIncidentCode());
                return EmergencyIncidentDto.fromEntity(latest);
            }
        }

        Route route = pilgrim.getRoute();
        if (request.getRouteId() != null) {
            route = routeRepository.findById(request.getRouteId()).orElse(route);
        }

        Checkpoint checkpoint = null;
        if (request.getCheckpointId() != null) {
            checkpoint = checkpointRepository.findById(request.getCheckpointId()).orElse(null);
        }

        Double lat = request.getLatitude();
        Double lng = request.getLongitude();
        Double accuracy = request.getLocationAccuracy();
        LocationSource locSource = request.getLocationSource() != null ? request.getLocationSource() : LocationSource.UNAVAILABLE;

        if (lat != null && lng != null) {
            if (locSource == LocationSource.UNAVAILABLE) {
                locSource = LocationSource.LIVE_GPS;
            }
        } else {
            // Geolocation fallback: inspect last physical scan event
            List<ScanEvent> recentScans = scanEventRepository.findByPilgrimIdOrderByScanTimestampDesc(pilgrim.getId());
            if (!recentScans.isEmpty()) {
                ScanEvent lastScan = recentScans.get(0);
                checkpoint = lastScan.getCheckpoint();
                route = lastScan.getRoute();
                if (checkpoint != null) {
                    lat = checkpoint.getLatitude();
                    lng = checkpoint.getLongitude();
                    locSource = LocationSource.LAST_CHECKPOINT;
                }
            } else if (checkpoint != null) {
                lat = checkpoint.getLatitude();
                lng = checkpoint.getLongitude();
                locSource = LocationSource.LAST_CHECKPOINT;
            } else if (route != null) {
                List<Checkpoint> routeCps = checkpointRepository.findByRouteIdOrderBySequenceOrderAsc(route.getId());
                if (!routeCps.isEmpty()) {
                    checkpoint = routeCps.get(0);
                    lat = checkpoint.getLatitude();
                    lng = checkpoint.getLongitude();
                    locSource = LocationSource.LAST_CHECKPOINT;
                }
            }
        }

        String incidentCode = generateIncidentCode("SOS");
        String title = "Personal SOS: " + pilgrim.getName() + " (" + request.getIncidentType() + ")";
        String desc = request.getDescription() != null && !request.getDescription().isBlank()
                ? request.getDescription().trim()
                : "Pilgrim triggered emergency assistance at " + (checkpoint != null ? checkpoint.getName() : "trail");

        String instruction = "Emergency response team notified. Stay at your current location if safe. Help is on the way.";

        EmergencyIncident incident = EmergencyIncident.builder()
                .incidentCode(incidentCode)
                .incidentType(request.getIncidentType())
                .scope(EmergencyScope.PERSONAL)
                .severity(EmergencySeverity.CRITICAL)
                .status(EmergencyStatus.OPEN)
                .pilgrim(pilgrim)
                .route(route)
                .checkpoint(checkpoint)
                .latitude(lat)
                .longitude(lng)
                .locationAccuracy(accuracy)
                .locationSource(locSource)
                .title(title)
                .description(desc)
                .safetyInstruction(instruction)
                .verified(true)
                .reportedAt(LocalDateTime.now())
                .reportedByUser(user)
                .build();

        EmergencyIncident saved = emergencyIncidentRepository.save(incident);
        EmergencyIncidentDto dto = EmergencyIncidentDto.fromEntity(saved);

        // PRIVACY ENFORCEMENT: Broadcast solely to private emergency channel
        broadcastToPrivateEmergencyChannel(dto, EventType.EMERGENCY_CREATED, "Personal SOS received from " + pilgrim.getName());

        return dto;
    }

    /**
     * Reports a public or route-wide hazard (e.g., landslide, bad weather).
     * If reported by a Pilgrim, marked UNVERIFIED_REPORT until verified by an Officer.
     * If reported by an Operational User, marked CONFIRMED and broadcast publicly.
     */
    @Transactional
    public EmergencyIncidentDto reportPublicHazard(ReportPublicHazardRequest request, String userEmail) {
        User user = userRepository.findByEmail(userEmail)
                .orElseThrow(() -> new UnauthorizedException("User session not found for email: " + userEmail));

        Route route = routeRepository.findById(request.getRouteId())
                .orElseThrow(() -> new ResourceNotFoundException("Route not found with ID: " + request.getRouteId()));

        Checkpoint checkpoint = null;
        if (request.getCheckpointId() != null) {
            checkpoint = checkpointRepository.findById(request.getCheckpointId()).orElse(null);
        }

        boolean isOperator = user.getRole() == Role.ADMIN ||
                user.getRole() == Role.EMERGENCY_OFFICER ||
                user.getRole() == Role.CONTROL_ROOM_OPERATOR ||
                user.getRole() == Role.SUPERVISOR;

        EmergencyStatus initialStatus = isOperator ? EmergencyStatus.OPEN : EmergencyStatus.UNVERIFIED_REPORT;
        boolean isVerified = isOperator;
        EmergencySeverity severity = request.getSeverity() != null ? request.getSeverity() : EmergencySeverity.WARNING;
        EmergencyScope scope = checkpoint != null ? EmergencyScope.CHECKPOINT : EmergencyScope.ROUTE;

        String incidentCode = generateIncidentCode("HAZ");
        String instruction = isVerified
                ? "Caution: Route hazard confirmed. Follow gate instructions and maintain safe distance."
                : "Hazard report received and currently under verification by Control Room.";

        EmergencyIncident incident = EmergencyIncident.builder()
                .incidentCode(incidentCode)
                .incidentType(request.getIncidentType())
                .scope(scope)
                .severity(severity)
                .status(initialStatus)
                .route(route)
                .checkpoint(checkpoint)
                .latitude(request.getLatitude() != null ? request.getLatitude() : (checkpoint != null ? checkpoint.getLatitude() : null))
                .longitude(request.getLongitude() != null ? request.getLongitude() : (checkpoint != null ? checkpoint.getLongitude() : null))
                .locationSource(request.getLatitude() != null ? LocationSource.LIVE_GPS : LocationSource.LAST_CHECKPOINT)
                .title(request.getTitle().trim())
                .description(request.getDescription() != null ? request.getDescription().trim() : "")
                .safetyInstruction(instruction)
                .verified(isVerified)
                .reportedAt(LocalDateTime.now())
                .reportedByUser(user)
                .build();

        EmergencyIncident saved = emergencyIncidentRepository.save(incident);
        EmergencyIncidentDto dto = EmergencyIncidentDto.fromEntity(saved);

        // Notify private operational room for inspection
        broadcastToPrivateEmergencyChannel(dto, EventType.EMERGENCY_CREATED, "Hazard incident reported: " + incident.getTitle());

        // If verified immediately by operator, broadcast public safety alert
        if (isVerified) {
            broadcastPublicSafetyAlert(PublicSafetyAlertDto.fromEntity(saved));
        }

        return dto;
    }

    /**
     * Verifies an unverified hazard report and broadcasts public safety alerts.
     */
    @Transactional
    public EmergencyIncidentDto verifyAndPublishHazard(Long incidentId, VerifyHazardRequest request, String officerEmail) {
        User officer = userRepository.findByEmail(officerEmail)
                .orElseThrow(() -> new UnauthorizedException("Officer session not found: " + officerEmail));

        EmergencyIncident incident = emergencyIncidentRepository.findById(incidentId)
                .orElseThrow(() -> new ResourceNotFoundException("Emergency incident not found with ID: " + incidentId));

        incident.setVerified(true);
        incident.setStatus(request.getStatus() != null ? request.getStatus() : EmergencyStatus.OPEN);
        incident.setSeverity(request.getSeverity());
        incident.setScope(request.getScope());
        incident.setSafetyInstruction(request.getSafetyInstruction().trim());
        incident.setAssignedResponder(officer);
        incident.setAcknowledgedAt(LocalDateTime.now());
        if (request.getResponderNotes() != null) {
            incident.setResponderNotes(request.getResponderNotes().trim());
        }

        EmergencyIncident saved = emergencyIncidentRepository.save(incident);
        EmergencyIncidentDto dto = EmergencyIncidentDto.fromEntity(saved);

        // Broadcast to private channel
        broadcastToPrivateEmergencyChannel(dto, EventType.CHECKPOINT_STATUS_CHANGED, "Hazard verified: " + saved.getTitle());

        // Broadcast public alert to affected routes & pilgrims
        broadcastPublicSafetyAlert(PublicSafetyAlertDto.fromEntity(saved));

        return dto;
    }

    /**
     * Updates an incident's lifecycle status (Acknowledge, Dispatch Team, Resolve, False Alarm).
     */
    @Transactional
    public EmergencyIncidentDto updateIncidentStatus(Long incidentId, UpdateIncidentStatusRequest request, String officerEmail) {
        User officer = userRepository.findByEmail(officerEmail)
                .orElseThrow(() -> new UnauthorizedException("Officer session not found: " + officerEmail));

        EmergencyIncident incident = emergencyIncidentRepository.findById(incidentId)
                .orElseThrow(() -> new ResourceNotFoundException("Emergency incident not found with ID: " + incidentId));

        EmergencyStatus oldStatus = incident.getStatus();
        incident.setStatus(request.getStatus());

        if (request.getAssignedResponderId() != null) {
            User responder = userRepository.findById(request.getAssignedResponderId()).orElse(officer);
            incident.setAssignedResponder(responder);
        } else if (incident.getAssignedResponder() == null) {
            incident.setAssignedResponder(officer);
        }

        LocalDateTime now = LocalDateTime.now();
        if (request.getStatus() == EmergencyStatus.ACKNOWLEDGED && incident.getAcknowledgedAt() == null) {
            incident.setAcknowledgedAt(now);
        } else if (request.getStatus() == EmergencyStatus.TEAM_DISPATCHED && incident.getDispatchedAt() == null) {
            incident.setDispatchedAt(now);
            if (incident.getAcknowledgedAt() == null) incident.setAcknowledgedAt(now);
        } else if (request.getStatus() == EmergencyStatus.RESOLVED || request.getStatus() == EmergencyStatus.FALSE_ALARM) {
            incident.setResolvedAt(now);
        }

        if (request.getResponderNotes() != null) {
            incident.setResponderNotes(request.getResponderNotes().trim());
        }
        if (request.getSafetyInstruction() != null) {
            incident.setSafetyInstruction(request.getSafetyInstruction().trim());
        }

        EmergencyIncident saved = emergencyIncidentRepository.save(incident);
        EmergencyIncidentDto dto = EmergencyIncidentDto.fromEntity(saved);

        // Notify private operational room
        broadcastToPrivateEmergencyChannel(dto, EventType.CHECKPOINT_STATUS_CHANGED, 
                "Incident " + saved.getIncidentCode() + " status updated from " + oldStatus + " to " + saved.getStatus());

        // If public hazard, update public alert stream
        if (saved.isVerified() && saved.getScope() != EmergencyScope.PERSONAL) {
            broadcastPublicSafetyAlert(PublicSafetyAlertDto.fromEntity(saved));
        }

        return dto;
    }

    /**
     * Retrieves all active/historical incidents for Emergency Officers & Admins.
     */
    @Transactional(readOnly = true)
    public List<EmergencyIncidentDto> getAllIncidentsForOfficers(EmergencyScope scope, EmergencyStatus status) {
        List<EmergencyIncident> list = emergencyIncidentRepository.findAllByOrderByReportedAtDesc();

        return list.stream()
                .filter(i -> scope == null || i.getScope() == scope)
                .filter(i -> status == null || i.getStatus() == status)
                .map(EmergencyIncidentDto::fromEntity)
                .collect(Collectors.toList());
    }

    /**
     * Retrieves sanitized public safety alerts for pilgrims & general operators.
     * Contains NO private pilgrim GPS coordinates.
     */
    @Transactional(readOnly = true)
    public List<PublicSafetyAlertDto> getActivePublicAlerts(Long routeId, Long checkpointId) {
        List<EmergencyIncident> list;
        if (routeId != null || checkpointId != null) {
            list = emergencyIncidentRepository.findActivePublicAlertsForRouteOrCheckpoint(routeId, checkpointId);
        } else {
            list = emergencyIncidentRepository.findActivePublicAlerts();
        }

        return list.stream()
                .map(PublicSafetyAlertDto::fromEntity)
                .collect(Collectors.toList());
    }

    /**
     * Retrieves the current authenticated pilgrim's active SOS status.
     */
    @Transactional(readOnly = true)
    public Optional<EmergencyIncidentDto> getPilgrimActiveEmergency(String userEmail) {
        User user = userRepository.findByEmail(userEmail).orElse(null);
        if (user == null) return Optional.empty();

        Pilgrim pilgrim = pilgrimRepository.findByNameIgnoreCase(user.getName())
                .orElseGet(() -> {
                    List<Pilgrim> all = pilgrimRepository.findAll();
                    return all.stream()
                            .filter(p -> p.getName().equalsIgnoreCase(user.getName()) ||
                                    (p.getPhoneNumber() != null && user.getEmail().contains(p.getPhoneNumber())))
                            .findFirst()
                            .orElse(null);
                });

        if (pilgrim == null) return Optional.empty();

        List<EmergencyIncident> list = emergencyIncidentRepository.findActiveByPilgrimId(pilgrim.getId());
        return list.isEmpty() ? Optional.empty() : Optional.of(EmergencyIncidentDto.fromEntity(list.get(0)));
    }

    // ==========================================
    // Real-Time STOMP Broadcasting Helpers
    // ==========================================

    private void broadcastToPrivateEmergencyChannel(EmergencyIncidentDto payload, EventType eventType, String msg) {
        try {
            RealTimeEvent<EmergencyIncidentDto> event = RealTimeEvent.<EmergencyIncidentDto>builder()
                    .eventType(eventType)
                    .timestamp(LocalDateTime.now())
                    .topic("/topic/emergency/private")
                    .dataFreshness(DataFreshnessStatus.FRESH)
                    .payload(payload)
                    .message(msg)
                    .build();

            messagingTemplate.convertAndSend("/topic/emergency/private", event);
        } catch (Exception e) {
            log.warn("Failed to broadcast private emergency STOMP event: {}", e.getMessage());
        }
    }

    private void broadcastPublicSafetyAlert(PublicSafetyAlertDto payload) {
        try {
            LocalDateTime now = LocalDateTime.now();

            // 1. Broadcast to global emergency channel
            RealTimeEvent<PublicSafetyAlertDto> globalEvent = RealTimeEvent.<PublicSafetyAlertDto>builder()
                    .eventType(EventType.EMERGENCY_CREATED)
                    .timestamp(now)
                    .topic("/topic/emergency/global")
                    .dataFreshness(DataFreshnessStatus.FRESH)
                    .payload(payload)
                    .message("Safety Alert: " + payload.getTitle())
                    .build();
            messagingTemplate.convertAndSend("/topic/emergency/global", globalEvent);
            messagingTemplate.convertAndSend("/topic/alerts", globalEvent);

            // 2. Broadcast to targeted route channel
            if (payload.getRouteId() != null) {
                String routeTopic = "/topic/emergency/route/" + payload.getRouteId();
                messagingTemplate.convertAndSend(routeTopic, globalEvent);
            }

            // 3. Broadcast to targeted checkpoint channel
            if (payload.getCheckpointId() != null) {
                String cpTopic = "/topic/emergency/checkpoint/" + payload.getCheckpointId();
                messagingTemplate.convertAndSend(cpTopic, globalEvent);
            }
        } catch (Exception e) {
            log.warn("Failed to broadcast public safety STOMP alert: {}", e.getMessage());
        }
    }

    private String generateIncidentCode(String prefix) {
        String datePart = LocalDateTime.now().format(DateTimeFormatter.ofPattern("yyMMdd"));
        int rand = ThreadLocalRandom.current().nextInt(1000, 9999);
        return "EMG-" + prefix + "-" + datePart + "-" + rand;
    }
}
