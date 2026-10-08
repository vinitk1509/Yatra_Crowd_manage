package com.yatraflow.controller;

import com.yatraflow.dto.common.ApiResponse;
import com.yatraflow.dto.emergency.*;
import com.yatraflow.entity.EmergencyScope;
import com.yatraflow.entity.EmergencyStatus;
import com.yatraflow.service.EmergencyIncidentService;
import jakarta.validation.Valid;
import lombok.RequiredArgsConstructor;
import lombok.extern.slf4j.Slf4j;
import org.springframework.http.HttpStatus;
import org.springframework.http.ResponseEntity;
import org.springframework.security.access.prepost.PreAuthorize;
import org.springframework.security.core.Authentication;
import org.springframework.web.bind.annotation.*;

import java.util.List;

@RestController
@RequestMapping("/api/emergency")
@RequiredArgsConstructor
@Slf4j
public class EmergencyController {

    private final EmergencyIncidentService emergencyIncidentService;

    /**
     * Trigger a Personal / Medical Emergency SOS.
     * Enforces privacy: Available to authenticated pilgrims and admins.
     */
    @PostMapping("/sos")
    @PreAuthorize("hasAnyRole('PILGRIM', 'ADMIN')")
    public ResponseEntity<ApiResponse<EmergencyIncidentDto>> createPersonalSos(
            @Valid @RequestBody CreatePersonalSosRequest request,
            Authentication authentication) {
        log.info("Incoming Personal SOS request from user: {}", authentication.getName());
        EmergencyIncidentDto response = emergencyIncidentService.createPersonalSos(request, authentication.getName());
        return ResponseEntity.status(HttpStatus.CREATED)
                .body(ApiResponse.success("Emergency SOS triggered successfully. Response units notified.", response));
    }

    /**
     * Report a Public / Route Hazard.
     * Available to any authenticated user. Pilgrims create UNVERIFIED reports; Operators create confirmed alerts.
     */
    @PostMapping("/hazard")
    @PreAuthorize("isAuthenticated()")
    public ResponseEntity<ApiResponse<EmergencyIncidentDto>> reportPublicHazard(
            @Valid @RequestBody ReportPublicHazardRequest request,
            Authentication authentication) {
        log.info("Incoming Public Hazard report from user: {}", authentication.getName());
        EmergencyIncidentDto response = emergencyIncidentService.reportPublicHazard(request, authentication.getName());
        return ResponseEntity.status(HttpStatus.CREATED)
                .body(ApiResponse.success("Public hazard report submitted successfully.", response));
    }

    /**
     * Retrieve the current pilgrim's active emergency SOS status.
     */
    @GetMapping("/my-active")
    @PreAuthorize("hasAnyRole('PILGRIM', 'ADMIN')")
    public ResponseEntity<ApiResponse<EmergencyIncidentDto>> getMyActiveEmergency(Authentication authentication) {
        return emergencyIncidentService.getPilgrimActiveEmergency(authentication.getName())
                .map(dto -> ResponseEntity.ok(ApiResponse.success("Active emergency found", dto)))
                .orElseGet(() -> ResponseEntity.ok(ApiResponse.success("No active emergency", null)));
    }

    /**
     * Retrieve sanitized active public safety alerts (Safe for Pilgrims / General Public).
     * Excludes private pilgrim GPS and identity data.
     */
    @GetMapping("/public-alerts")
    public ResponseEntity<ApiResponse<List<PublicSafetyAlertDto>>> getActivePublicAlerts(
            @RequestParam(required = false) Long routeId,
            @RequestParam(required = false) Long checkpointId) {
        List<PublicSafetyAlertDto> alerts = emergencyIncidentService.getActivePublicAlerts(routeId, checkpointId);
        return ResponseEntity.ok(ApiResponse.success(alerts));
    }

    /**
     * Full Operational View: List all incidents with GPS and responder data.
     * Restricted to Emergency Officers, Control Room Leads, Supervisors, and Admins.
     */
    @GetMapping("/incidents")
    @PreAuthorize("hasAnyRole('EMERGENCY_OFFICER', 'CONTROL_ROOM_OPERATOR', 'SUPERVISOR', 'ADMIN')")
    public ResponseEntity<ApiResponse<List<EmergencyIncidentDto>>> getAllIncidents(
            @RequestParam(required = false) EmergencyScope scope,
            @RequestParam(required = false) EmergencyStatus status) {
        List<EmergencyIncidentDto> incidents = emergencyIncidentService.getAllIncidentsForOfficers(scope, status);
        return ResponseEntity.ok(ApiResponse.success(incidents));
    }

    /**
     * Verify an unverified hazard report and broadcast safety alerts across routes.
     * Restricted to authorized operational staff.
     */
    @PutMapping("/incidents/{id}/verify")
    @PreAuthorize("hasAnyRole('EMERGENCY_OFFICER', 'CONTROL_ROOM_OPERATOR', 'SUPERVISOR', 'ADMIN')")
    public ResponseEntity<ApiResponse<EmergencyIncidentDto>> verifyAndPublishHazard(
            @PathVariable Long id,
            @Valid @RequestBody VerifyHazardRequest request,
            Authentication authentication) {
        EmergencyIncidentDto updated = emergencyIncidentService.verifyAndPublishHazard(id, request, authentication.getName());
        return ResponseEntity.ok(ApiResponse.success("Hazard verified and public alert broadcasted successfully", updated));
    }

    /**
     * Update incident lifecycle status (Acknowledge, Dispatch Team, Resolve, False Alarm).
     * Restricted to authorized emergency operational staff.
     */
    @PutMapping("/incidents/{id}/status")
    @PreAuthorize("hasAnyRole('EMERGENCY_OFFICER', 'CONTROL_ROOM_OPERATOR', 'SUPERVISOR', 'ADMIN')")
    public ResponseEntity<ApiResponse<EmergencyIncidentDto>> updateIncidentStatus(
            @PathVariable Long id,
            @Valid @RequestBody UpdateIncidentStatusRequest request,
            Authentication authentication) {
        EmergencyIncidentDto updated = emergencyIncidentService.updateIncidentStatus(id, request, authentication.getName());
        return ResponseEntity.ok(ApiResponse.success("Incident status updated successfully", updated));
    }
}
