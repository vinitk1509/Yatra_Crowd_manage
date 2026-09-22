package com.yatraflow;

import com.fasterxml.jackson.databind.ObjectMapper;
import com.yatraflow.dto.auth.LoginRequest;
import com.yatraflow.dto.checkpoint.CreateCheckpointRequest;
import com.yatraflow.entity.Route;
import com.yatraflow.repository.RouteRepository;
import org.junit.jupiter.api.DisplayName;
import org.junit.jupiter.api.Test;
import org.springframework.beans.factory.annotation.Autowired;
import org.springframework.boot.test.autoconfigure.web.servlet.AutoConfigureMockMvc;
import org.springframework.boot.test.context.SpringBootTest;
import org.springframework.http.MediaType;
import org.springframework.test.web.servlet.MockMvc;
import org.springframework.test.web.servlet.MvcResult;

import static org.hamcrest.Matchers.is;
import static org.springframework.test.web.servlet.request.MockMvcRequestBuilders.get;
import static org.springframework.test.web.servlet.request.MockMvcRequestBuilders.post;
import static org.springframework.test.web.servlet.result.MockMvcResultMatchers.jsonPath;
import static org.springframework.test.web.servlet.result.MockMvcResultMatchers.status;

@SpringBootTest
@AutoConfigureMockMvc
public class SecurityRbacIntegrationTest {

    @Autowired
    private MockMvc mockMvc;

    @Autowired
    private ObjectMapper objectMapper;

    @Autowired
    private RouteRepository routeRepository;

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
    @DisplayName("Unauthenticated request to protected endpoint should return 401 Unauthorized")
    void testUnauthenticatedAccess() throws Exception {
        mockMvc.perform(get("/api/routes"))
                .andExpect(status().isUnauthorized())
                .andExpect(jsonPath("$.status", is(401)));
    }

    @Test
    @DisplayName("Invalid JWT token should return 401 Unauthorized")
    void testInvalidJwtToken() throws Exception {
        mockMvc.perform(get("/api/routes")
                        .header("Authorization", "Bearer invalid.token.value"))
                .andExpect(status().isUnauthorized())
                .andExpect(jsonPath("$.status", is(401)));
    }

    @Test
    @DisplayName("ADMIN role should access /api/admin/users successfully (200 OK)")
    void testAdminAccessToAdminEndpoint() throws Exception {
        String adminToken = getAuthToken("admin@yatraflow.gov.in", "Admin@12345");

        mockMvc.perform(get("/api/admin/users")
                        .header("Authorization", "Bearer " + adminToken))
                .andExpect(status().isOk())
                .andExpect(jsonPath("$.success", is(true)));
    }

    @Test
    @DisplayName("CONTROL_ROOM_OPERATOR should receive 403 Forbidden when accessing /api/admin/users")
    void testNonAdminAccessToAdminEndpointForbidden() throws Exception {
        String controlToken = getAuthToken("control@yatraflow.gov.in", "Control@12345");

        mockMvc.perform(get("/api/admin/users")
                        .header("Authorization", "Bearer " + controlToken))
                .andExpect(status().isForbidden())
                .andExpect(jsonPath("$.status", is(403)));
    }

    @Test
    @DisplayName("SUPERVISOR role can create checkpoints (201 Created)")
    void testSupervisorCanCreateCheckpoint() throws Exception {
        String supervisorToken = getAuthToken("supervisor@yatraflow.gov.in", "Supervisor@12345");
        Route route = routeRepository.findAll().get(0);

        CreateCheckpointRequest request = CreateCheckpointRequest.builder()
                .name("Sangam Junction Transit")
                .code("CP-SANGAM-" + System.currentTimeMillis() % 10000)
                .routeId(route.getId())
                .capacity(3500)
                .latitude(34.2340)
                .longitude(75.4890)
                .active(true)
                .build();

        mockMvc.perform(post("/api/checkpoints")
                        .header("Authorization", "Bearer " + supervisorToken)
                        .contentType(MediaType.APPLICATION_JSON)
                        .content(objectMapper.writeValueAsString(request)))
                .andExpect(status().isCreated())
                .andExpect(jsonPath("$.success", is(true)))
                .andExpect(jsonPath("$.data.name", is("Sangam Junction Transit")));
    }

    @Test
    @DisplayName("CHECKPOINT_OPERATOR should receive 403 Forbidden when trying to create a checkpoint")
    void testCheckpointOperatorCannotCreateCheckpoint() throws Exception {
        String checkpointOpToken = getAuthToken("checkpoint@yatraflow.gov.in", "Checkpoint@12345");
        Route route = routeRepository.findAll().get(0);

        CreateCheckpointRequest request = CreateCheckpointRequest.builder()
                .name("Unauthorized Checkpoint")
                .code("CP-UNAUTH-" + System.currentTimeMillis() % 10000)
                .routeId(route.getId())
                .capacity(1000)
                .latitude(34.2000)
                .longitude(75.5000)
                .active(true)
                .build();

        mockMvc.perform(post("/api/checkpoints")
                        .header("Authorization", "Bearer " + checkpointOpToken)
                        .contentType(MediaType.APPLICATION_JSON)
                        .content(objectMapper.writeValueAsString(request)))
                .andExpect(status().isForbidden())
                .andExpect(jsonPath("$.status", is(403)));
    }
}
