package com.yatraflow;

import com.fasterxml.jackson.databind.ObjectMapper;
import com.yatraflow.dto.auth.LoginRequest;
import com.yatraflow.dto.crowd.LiveCrowdResponse;
import com.yatraflow.dto.pilgrim.CreatePilgrimRequest;
import com.yatraflow.dto.scan.CreateScanRequest;
import com.yatraflow.entity.Checkpoint;
import com.yatraflow.entity.Route;
import com.yatraflow.repository.CheckpointRepository;
import com.yatraflow.repository.RouteRepository;
import org.junit.jupiter.api.DisplayName;
import org.junit.jupiter.api.Test;
import org.springframework.beans.factory.annotation.Autowired;
import org.springframework.boot.test.autoconfigure.web.servlet.AutoConfigureMockMvc;
import org.springframework.boot.test.context.SpringBootTest;
import org.springframework.http.MediaType;
import org.springframework.test.web.servlet.MockMvc;
import org.springframework.test.web.servlet.MvcResult;

import static org.hamcrest.Matchers.*;
import static org.springframework.test.web.servlet.request.MockMvcRequestBuilders.get;
import static org.springframework.test.web.servlet.request.MockMvcRequestBuilders.post;
import static org.springframework.test.web.servlet.result.MockMvcResultMatchers.jsonPath;
import static org.springframework.test.web.servlet.result.MockMvcResultMatchers.status;

@SpringBootTest
@AutoConfigureMockMvc
public class CrowdIntelligenceIntegrationTest {

    @Autowired
    private MockMvc mockMvc;

    @Autowired
    private ObjectMapper objectMapper;

    @Autowired
    private RouteRepository routeRepository;

    @Autowired
    private CheckpointRepository checkpointRepository;

    private String getAuthToken(String email, String password) throws Exception {
        LoginRequest loginRequest = LoginRequest.builder()
                .email(email)
                .password(password)
                .build();

        MvcResult result = mockMvc.perform(post("/api/auth/login")
                        .contentType(MediaType.APPLICATION_JSON)
                        .content(objectMapper.writeValueAsString(loginRequest)))
                .andExpect(status().isOk())
                .andReturn();

        return objectMapper.readTree(result.getResponse().getContentAsString())
                .path("data").path("token").asText();
    }

    @Test
    @DisplayName("GET /api/crowd/live should return full crowd intelligence metrics")
    void testLiveCrowdIntelligence() throws Exception {
        String token = getAuthToken("control@yatraflow.gov.in", "Control@12345");

        mockMvc.perform(get("/api/crowd/live")
                        .header("Authorization", "Bearer " + token))
                .andExpect(status().isOk())
                .andExpect(jsonPath("$.success", is(true)))
                .andExpect(jsonPath("$.data.totalActivePilgrims", greaterThanOrEqualTo(0)))
                .andExpect(jsonPath("$.data.totalCapacity", greaterThan(0)))
                .andExpect(jsonPath("$.data.overallOccupancyPercentage", greaterThanOrEqualTo(0.0)))
                .andExpect(jsonPath("$.data.averageWalkingSpeedKmH", greaterThan(0.0)))
                .andExpect(jsonPath("$.data.checkpoints", hasSize(greaterThanOrEqualTo(5))))
                .andExpect(jsonPath("$.data.checkpoints[0].checkpointCode", notNullValue()))
                .andExpect(jsonPath("$.data.checkpoints[0].capacity", greaterThan(0)))
                .andExpect(jsonPath("$.data.checkpoints[0].operationalStatus", notNullValue()));
    }

    @Test
    @DisplayName("GET /api/crowd/checkpoints/{id} should return specific checkpoint crowd metrics")
    void testCheckpointCrowdMetrics() throws Exception {
        String token = getAuthToken("checkpoint@yatraflow.gov.in", "Checkpoint@12345");
        Checkpoint cp1 = checkpointRepository.findByCode("CP-01").orElseThrow();

        mockMvc.perform(get("/api/crowd/checkpoints/" + cp1.getId())
                        .header("Authorization", "Bearer " + token))
                .andExpect(status().isOk())
                .andExpect(jsonPath("$.success", is(true)))
                .andExpect(jsonPath("$.data.checkpointCode", is("CP-01")))
                .andExpect(jsonPath("$.data.capacity", is(4050)))
                .andExpect(jsonPath("$.data.distanceFromStartKm", is(0.0)))
                .andExpect(jsonPath("$.data.operationalStatus", notNullValue()));
    }

    @Test
    @DisplayName("GET /api/crowd/routes/{id} should return aggregated route crowd metrics")
    void testRouteCrowdMetrics() throws Exception {
        String token = getAuthToken("control@yatraflow.gov.in", "Control@12345");
        Route baltal = routeRepository.findByCode("RT-BALTAL").orElseThrow();

        mockMvc.perform(get("/api/crowd/routes/" + baltal.getId())
                        .header("Authorization", "Bearer " + token))
                .andExpect(status().isOk())
                .andExpect(jsonPath("$.success", is(true)))
                .andExpect(jsonPath("$.data.routeCode", is("RT-BALTAL")))
                .andExpect(jsonPath("$.data.totalCapacity", greaterThan(0)))
                .andExpect(jsonPath("$.data.checkpoints", hasSize(greaterThanOrEqualTo(3))));
    }

    @Test
    @DisplayName("GET /api/crowd/bottlenecks should return active deterministic bottleneck signals")
    void testBottlenecksEndpoint() throws Exception {
        String token = getAuthToken("supervisor@yatraflow.gov.in", "Supervisor@12345");

        mockMvc.perform(get("/api/crowd/bottlenecks")
                        .header("Authorization", "Bearer " + token))
                .andExpect(status().isOk())
                .andExpect(jsonPath("$.success", is(true)))
                .andExpect(jsonPath("$.data", notNullValue()));
    }

    @Test
    @DisplayName("GET /api/metrics/flow, speed, transit-time should return valid operational telemetry")
    void testMetricsEndpoints() throws Exception {
        String token = getAuthToken("admin@yatraflow.gov.in", "Admin@12345");

        // Inflow
        mockMvc.perform(get("/api/metrics/inflow")
                        .header("Authorization", "Bearer " + token))
                .andExpect(status().isOk())
                .andExpect(jsonPath("$.success", is(true)))
                .andExpect(jsonPath("$.data", hasSize(greaterThanOrEqualTo(5))));

        // Outflow
        mockMvc.perform(get("/api/metrics/outflow")
                        .header("Authorization", "Bearer " + token))
                .andExpect(status().isOk())
                .andExpect(jsonPath("$.success", is(true)))
                .andExpect(jsonPath("$.data", hasSize(greaterThanOrEqualTo(5))));

        // Speed
        mockMvc.perform(get("/api/metrics/speed")
                        .header("Authorization", "Bearer " + token))
                .andExpect(status().isOk())
                .andExpect(jsonPath("$.success", is(true)));

        // Transit Time
        mockMvc.perform(get("/api/metrics/transit-time")
                        .header("Authorization", "Bearer " + token))
                .andExpect(status().isOk())
                .andExpect(jsonPath("$.success", is(true)));
    }
}
