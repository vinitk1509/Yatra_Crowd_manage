package com.yatraflow;

import com.fasterxml.jackson.databind.ObjectMapper;
import com.yatraflow.dto.auth.LoginRequest;
import com.yatraflow.dto.emergency.CreatePersonalSosRequest;
import com.yatraflow.dto.emergency.ReportPublicHazardRequest;
import com.yatraflow.dto.emergency.UpdateIncidentStatusRequest;
import com.yatraflow.dto.emergency.VerifyHazardRequest;
import com.yatraflow.entity.*;
import com.yatraflow.repository.EmergencyIncidentRepository;
import com.yatraflow.repository.RouteRepository;
import org.junit.jupiter.api.BeforeEach;
import org.junit.jupiter.api.DisplayName;
import org.junit.jupiter.api.Test;
import org.springframework.beans.factory.annotation.Autowired;
import org.springframework.boot.test.autoconfigure.web.servlet.AutoConfigureMockMvc;
import org.springframework.boot.test.context.SpringBootTest;
import org.springframework.http.MediaType;
import org.springframework.test.web.servlet.MockMvc;
import org.springframework.test.web.servlet.MvcResult;

import static org.hamcrest.Matchers.*;
import static org.junit.jupiter.api.Assertions.assertTrue;
import static org.springframework.test.web.servlet.request.MockMvcRequestBuilders.*;
import static org.springframework.test.web.servlet.result.MockMvcResultMatchers.*;

@SpringBootTest
@AutoConfigureMockMvc
public class EmergencyIncidentIntegrationTest {

    @Autowired
    private MockMvc mockMvc;

    @Autowired
    private ObjectMapper objectMapper;

    @Autowired
    private RouteRepository routeRepository;

    @Autowired
    private EmergencyIncidentRepository emergencyIncidentRepository;

    private String pilgrimToken;
    private String emergencyOfficerToken;
    private Long baltalRouteId;

    @BeforeEach
    void setUp() throws Exception {
        // Authenticate Pilgrim
        LoginRequest pilgrimLogin = LoginRequest.builder()
                .email("pilgrim@yatraflow.gov.in")
                .password("Pilgrim@12345")
                .build();

        MvcResult pilgrimResult = mockMvc.perform(post("/api/auth/login")
                        .contentType(MediaType.APPLICATION_JSON)
                        .content(objectMapper.writeValueAsString(pilgrimLogin)))
                .andExpect(status().isOk())
                .andReturn();

        String pilgrimJson = pilgrimResult.getResponse().getContentAsString();
        pilgrimToken = objectMapper.readTree(pilgrimJson).path("data").path("token").asText();

        // Authenticate Emergency Officer
        LoginRequest officerLogin = LoginRequest.builder()
                .email("emergency@yatraflow.gov.in")
                .password("Emergency@12345")
                .build();

        MvcResult officerResult = mockMvc.perform(post("/api/auth/login")
                        .contentType(MediaType.APPLICATION_JSON)
                        .content(objectMapper.writeValueAsString(officerLogin)))
                .andExpect(status().isOk())
                .andReturn();

        String officerJson = officerResult.getResponse().getContentAsString();
        emergencyOfficerToken = objectMapper.readTree(officerJson).path("data").path("token").asText();

        baltalRouteId = routeRepository.findAll().get(0).getId();
    }

    @Test
    @DisplayName("Should create personal SOS with live GPS coordinates")
    void testCreatePersonalSosWithGps() throws Exception {
        CreatePersonalSosRequest request = CreatePersonalSosRequest.builder()
                .incidentType(IncidentType.MEDICAL)
                .description("Severe breathlessness and pulse drop near high pass")
                .latitude(34.2268)
                .longitude(75.3189)
                .locationAccuracy(8.5)
                .locationSource(LocationSource.LIVE_GPS)
                .routeId(baltalRouteId)
                .build();

        mockMvc.perform(post("/api/emergency/sos")
                        .header("Authorization", "Bearer " + pilgrimToken)
                        .contentType(MediaType.APPLICATION_JSON)
                        .content(objectMapper.writeValueAsString(request)))
                .andExpect(status().isCreated())
                .andExpect(jsonPath("$.success", is(true)))
                .andExpect(jsonPath("$.data.incidentCode", startsWith("EMG-SOS-")))
                .andExpect(jsonPath("$.data.incidentType", is("MEDICAL")))
                .andExpect(jsonPath("$.data.scope", is("PERSONAL")))
                .andExpect(jsonPath("$.data.severity", is("CRITICAL")))
                .andExpect(jsonPath("$.data.status", is("OPEN")))
                .andExpect(jsonPath("$.data.latitude", is(34.2268)))
                .andExpect(jsonPath("$.data.longitude", is(75.3189)))
                .andExpect(jsonPath("$.data.locationSource", is("LIVE_GPS")));
    }

    @Test
    @DisplayName("Should fallback gracefully when GPS coordinates are unavailable")
    void testCreatePersonalSosWithoutGps() throws Exception {
        CreatePersonalSosRequest request = CreatePersonalSosRequest.builder()
                .incidentType(IncidentType.LOST_PILGRIM)
                .description("Separated from family group in fog")
                .locationSource(LocationSource.UNAVAILABLE)
                .routeId(baltalRouteId)
                .build();

        mockMvc.perform(post("/api/emergency/sos")
                        .header("Authorization", "Bearer " + pilgrimToken)
                        .contentType(MediaType.APPLICATION_JSON)
                        .content(objectMapper.writeValueAsString(request)))
                .andExpect(status().isCreated())
                .andExpect(jsonPath("$.success", is(true)))
                .andExpect(jsonPath("$.data.scope", is("PERSONAL")))
                .andExpect(jsonPath("$.data.status", is("OPEN")));
    }

    @Test
    @DisplayName("Should enforce privacy: Public alerts endpoint must NOT expose personal SOS or private coordinates")
    void testPublicAlertsPrivacy() throws Exception {
        mockMvc.perform(get("/api/emergency/public-alerts"))
                .andExpect(status().isOk())
                .andExpect(jsonPath("$.success", is(true)))
                .andExpect(jsonPath("$.data", isA(Iterable.class)))
                .andExpect(jsonPath("$.data[*].scope", not(hasItem("PERSONAL"))))
                .andExpect(jsonPath("$.data[*].latitude").doesNotExist())
                .andExpect(jsonPath("$.data[*].longitude").doesNotExist());
    }

    @Test
    @DisplayName("Pilgrim reporting public hazard creates UNVERIFIED report")
    void testPilgrimReportHazard() throws Exception {
        ReportPublicHazardRequest request = ReportPublicHazardRequest.builder()
                .incidentType(IncidentType.LANDSLIDE)
                .routeId(baltalRouteId)
                .title("Small rockslide near Sangam bridge")
                .description("Rocks falling across lower track")
                .severity(EmergencySeverity.WARNING)
                .build();

        mockMvc.perform(post("/api/emergency/hazard")
                        .header("Authorization", "Bearer " + pilgrimToken)
                        .contentType(MediaType.APPLICATION_JSON)
                        .content(objectMapper.writeValueAsString(request)))
                .andExpect(status().isCreated())
                .andExpect(jsonPath("$.success", is(true)))
                .andExpect(jsonPath("$.data.status", is("UNVERIFIED_REPORT")))
                .andExpect(jsonPath("$.data.verified", is(false)));
    }

    @Test
    @DisplayName("Emergency Officer can verify unverified hazard and broadcast confirmed alert")
    void testOfficerVerifyHazard() throws Exception {
        // First, report an unverified hazard
        ReportPublicHazardRequest report = ReportPublicHazardRequest.builder()
                .incidentType(IncidentType.WEATHER)
                .routeId(baltalRouteId)
                .title("Sudden hail and freezing winds")
                .description("Trail slippery near high camp")
                .severity(EmergencySeverity.ADVISORY)
                .build();

        MvcResult result = mockMvc.perform(post("/api/emergency/hazard")
                        .header("Authorization", "Bearer " + pilgrimToken)
                        .contentType(MediaType.APPLICATION_JSON)
                        .content(objectMapper.writeValueAsString(report)))
                .andExpect(status().isCreated())
                .andReturn();

        long incidentId = objectMapper.readTree(result.getResponse().getContentAsString()).path("data").path("id").asLong();

        // Officer verifies
        VerifyHazardRequest verify = VerifyHazardRequest.builder()
                .status(EmergencyStatus.OPEN)
                .severity(EmergencySeverity.WARNING)
                .scope(EmergencyScope.ROUTE)
                .safetyInstruction("Severe weather alert. Trek with caution and use shelter huts.")
                .responderNotes("Field weather station confirmed 40kt gusts.")
                .build();

        mockMvc.perform(put("/api/emergency/incidents/" + incidentId + "/verify")
                        .header("Authorization", "Bearer " + emergencyOfficerToken)
                        .contentType(MediaType.APPLICATION_JSON)
                        .content(objectMapper.writeValueAsString(verify)))
                .andExpect(status().isOk())
                .andExpect(jsonPath("$.success", is(true)))
                .andExpect(jsonPath("$.data.verified", is(true)))
                .andExpect(jsonPath("$.data.status", is("OPEN")))
                .andExpect(jsonPath("$.data.safetyInstruction", containsString("Severe weather alert")));
    }

    @Test
    @DisplayName("Emergency Officer can update incident status lifecycle")
    void testOfficerUpdateStatus() throws Exception {
        CreatePersonalSosRequest request = CreatePersonalSosRequest.builder()
                .incidentType(IncidentType.MEDICAL)
                .description("Chest discomfort")
                .routeId(baltalRouteId)
                .build();

        MvcResult result = mockMvc.perform(post("/api/emergency/sos")
                        .header("Authorization", "Bearer " + pilgrimToken)
                        .contentType(MediaType.APPLICATION_JSON)
                        .content(objectMapper.writeValueAsString(request)))
                .andExpect(status().isCreated())
                .andReturn();

        long incidentId = objectMapper.readTree(result.getResponse().getContentAsString()).path("data").path("id").asLong();

        // 1. Acknowledge
        UpdateIncidentStatusRequest ack = UpdateIncidentStatusRequest.builder()
                .status(EmergencyStatus.ACKNOWLEDGED)
                .responderNotes("Acknowledged by Dr. Sen. Locating nearest medical team.")
                .build();

        mockMvc.perform(put("/api/emergency/incidents/" + incidentId + "/status")
                        .header("Authorization", "Bearer " + emergencyOfficerToken)
                        .contentType(MediaType.APPLICATION_JSON)
                        .content(objectMapper.writeValueAsString(ack)))
                .andExpect(status().isOk())
                .andExpect(jsonPath("$.data.status", is("ACKNOWLEDGED")))
                .andExpect(jsonPath("$.data.acknowledgedAt", notNullValue()));

        // 2. Dispatch Team
        UpdateIncidentStatusRequest dispatch = UpdateIncidentStatusRequest.builder()
                .status(EmergencyStatus.TEAM_DISPATCHED)
                .responderNotes("Paramedic team Beta dispatched with stretcher.")
                .build();

        mockMvc.perform(put("/api/emergency/incidents/" + incidentId + "/status")
                        .header("Authorization", "Bearer " + emergencyOfficerToken)
                        .contentType(MediaType.APPLICATION_JSON)
                        .content(objectMapper.writeValueAsString(dispatch)))
                .andExpect(status().isOk())
                .andExpect(jsonPath("$.data.status", is("TEAM_DISPATCHED")))
                .andExpect(jsonPath("$.data.dispatchedAt", notNullValue()));

        // 3. Resolve
        UpdateIncidentStatusRequest resolve = UpdateIncidentStatusRequest.builder()
                .status(EmergencyStatus.RESOLVED)
                .responderNotes("Yatri stabilized and escorted to base camp medical post.")
                .build();

        mockMvc.perform(put("/api/emergency/incidents/" + incidentId + "/status")
                        .header("Authorization", "Bearer " + emergencyOfficerToken)
                        .contentType(MediaType.APPLICATION_JSON)
                        .content(objectMapper.writeValueAsString(resolve)))
                .andExpect(status().isOk())
                .andExpect(jsonPath("$.data.status", is("RESOLVED")))
                .andExpect(jsonPath("$.data.resolvedAt", notNullValue()));
    }

    @Test
    @DisplayName("Pilgrim cannot access full operational incidents list (RBAC check)")
    void testPilgrimCannotAccessIncidentsList() throws Exception {
        mockMvc.perform(get("/api/emergency/incidents")
                        .header("Authorization", "Bearer " + pilgrimToken))
                .andExpect(status().isForbidden());
    }
}
