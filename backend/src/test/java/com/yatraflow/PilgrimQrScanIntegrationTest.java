package com.yatraflow;

import com.fasterxml.jackson.databind.ObjectMapper;
import com.yatraflow.dto.auth.LoginRequest;
import com.yatraflow.dto.pilgrim.CreatePilgrimRequest;
import com.yatraflow.dto.qr.ValidateQrRequest;
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
public class PilgrimQrScanIntegrationTest {

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
    @DisplayName("Pilgrim registration should auto-generate unique QR code")
    void testRegisterPilgrimAutoGeneratesQr() throws Exception {
        String adminToken = getAuthToken("admin@yatraflow.gov.in", "Admin@12345");
        Route baltal = routeRepository.findByCode("RT-BALTAL").orElseThrow();

        CreatePilgrimRequest request = CreatePilgrimRequest.builder()
                .name("Kavita Joshi")
                .age(29)
                .gender("FEMALE")
                .phoneNumber("+91 9988776655")
                .emergencyContact("+91 9988776600")
                .routeId(baltal.getId())
                .build();

        mockMvc.perform(post("/api/pilgrims")
                        .header("Authorization", "Bearer " + adminToken)
                        .contentType(MediaType.APPLICATION_JSON)
                        .content(objectMapper.writeValueAsString(request)))
                .andExpect(status().isCreated())
                .andExpect(jsonPath("$.success", is(true)))
                .andExpect(jsonPath("$.data.pilgrimCode", containsString("PIL-2026-")))
                .andExpect(jsonPath("$.data.qrCode.qrId", containsString("QR-YF-")))
                .andExpect(jsonPath("$.data.qrCode.payload", containsString("qrId")))
                .andExpect(jsonPath("$.data.qrCode.active", is(true)));
    }

    @Test
    @DisplayName("QR validation should confirm validity and match route")
    void testValidateQrCode() throws Exception {
        String adminToken = getAuthToken("admin@yatraflow.gov.in", "Admin@12345");
        Route baltal = routeRepository.findByCode("RT-BALTAL").orElseThrow();
        Checkpoint baltalCp = checkpointRepository.findByCode("CP-01").orElseThrow();

        // 1. Register pilgrim
        CreatePilgrimRequest pilgrimReq = CreatePilgrimRequest.builder()
                .name("Suresh Raina")
                .age(42)
                .gender("MALE")
                .routeId(baltal.getId())
                .build();

        MvcResult regResult = mockMvc.perform(post("/api/pilgrims")
                        .header("Authorization", "Bearer " + adminToken)
                        .contentType(MediaType.APPLICATION_JSON)
                        .content(objectMapper.writeValueAsString(pilgrimReq)))
                .andExpect(status().isCreated())
                .andReturn();

        String qrId = objectMapper.readTree(regResult.getResponse().getContentAsString())
                .path("data").path("qrCode").path("qrId").asText();

        // 2. Validate QR at Baltal checkpoint
        ValidateQrRequest valReq = ValidateQrRequest.builder()
                .qrId(qrId)
                .checkpointId(baltalCp.getId())
                .build();

        mockMvc.perform(post("/api/qr/validate")
                        .header("Authorization", "Bearer " + adminToken)
                        .contentType(MediaType.APPLICATION_JSON)
                        .content(objectMapper.writeValueAsString(valReq)))
                .andExpect(status().isOk())
                .andExpect(jsonPath("$.success", is(true)))
                .andExpect(jsonPath("$.data.valid", is(true)))
                .andExpect(jsonPath("$.data.routeMatchesCheckpoint", is(true)));
    }

    @Test
    @DisplayName("CHECKPOINT_OPERATOR should successfully scan valid pilgrim and record movement")
    void testCheckpointOperatorSuccessfulScan() throws Exception {
        String adminToken = getAuthToken("admin@yatraflow.gov.in", "Admin@12345");
        String checkpointOpToken = getAuthToken("checkpoint@yatraflow.gov.in", "Checkpoint@12345");
        Route baltal = routeRepository.findByCode("RT-BALTAL").orElseThrow();
        Checkpoint baltalCp = checkpointRepository.findByCode("CP-01").orElseThrow();

        // 1. Create pilgrim
        CreatePilgrimRequest pilgrimReq = CreatePilgrimRequest.builder()
                .name("Vikram Malhotra")
                .age(38)
                .gender("MALE")
                .routeId(baltal.getId())
                .build();

        MvcResult regResult = mockMvc.perform(post("/api/pilgrims")
                        .header("Authorization", "Bearer " + adminToken)
                        .contentType(MediaType.APPLICATION_JSON)
                        .content(objectMapper.writeValueAsString(pilgrimReq)))
                .andExpect(status().isCreated())
                .andReturn();

        String qrId = objectMapper.readTree(regResult.getResponse().getContentAsString())
                .path("data").path("qrCode").path("qrId").asText();
        long pilgrimId = objectMapper.readTree(regResult.getResponse().getContentAsString())
                .path("data").path("id").asLong();

        // 2. Checkpoint Operator records scan
        CreateScanRequest scanReq = CreateScanRequest.builder()
                .qrId(qrId)
                .checkpointId(baltalCp.getId())
                .build();

        mockMvc.perform(post("/api/scans")
                        .header("Authorization", "Bearer " + checkpointOpToken)
                        .contentType(MediaType.APPLICATION_JSON)
                        .content(objectMapper.writeValueAsString(scanReq)))
                .andExpect(status().isCreated())
                .andExpect(jsonPath("$.success", is(true)))
                .andExpect(jsonPath("$.data.validationStatus", is("VALID")))
                .andExpect(jsonPath("$.data.checkpointCode", is("CP-01")))
                .andExpect(jsonPath("$.data.operatorEmail", is("checkpoint@yatraflow.gov.in")));

        // 3. Movement history is retrievable
        mockMvc.perform(get("/api/scans/" + pilgrimId)
                        .header("Authorization", "Bearer " + checkpointOpToken))
                .andExpect(status().isOk())
                .andExpect(jsonPath("$.data", hasSize(greaterThanOrEqualTo(1))))
                .andExpect(jsonPath("$.data[0].checkpointCode", is("CP-01")));
    }

    @Test
    @DisplayName("Should reject scan when checkpoint belongs to a different route (WRONG_ROUTE)")
    void testWrongRouteScanRejection() throws Exception {
        String adminToken = getAuthToken("admin@yatraflow.gov.in", "Admin@12345");
        String checkpointOpToken = getAuthToken("checkpoint@yatraflow.gov.in", "Checkpoint@12345");
        
        // Pilgrim is on Baltal route
        Route baltal = routeRepository.findByCode("RT-BALTAL").orElseThrow();
        // Checkpoint CP-03 Sheshnag is on Pahalgam route
        Checkpoint sheshnagPahalgamCp = checkpointRepository.findByCode("CP-03").orElseThrow();

        CreatePilgrimRequest pilgrimReq = CreatePilgrimRequest.builder()
                .name("Sunil Kumar")
                .age(50)
                .gender("MALE")
                .routeId(baltal.getId())
                .build();

        MvcResult regResult = mockMvc.perform(post("/api/pilgrims")
                        .header("Authorization", "Bearer " + adminToken)
                        .contentType(MediaType.APPLICATION_JSON)
                        .content(objectMapper.writeValueAsString(pilgrimReq)))
                .andExpect(status().isCreated())
                .andReturn();

        String qrId = objectMapper.readTree(regResult.getResponse().getContentAsString())
                .path("data").path("qrCode").path("qrId").asText();

        CreateScanRequest scanReq = CreateScanRequest.builder()
                .qrId(qrId)
                .checkpointId(sheshnagPahalgamCp.getId())
                .build();

        mockMvc.perform(post("/api/scans")
                        .header("Authorization", "Bearer " + checkpointOpToken)
                        .contentType(MediaType.APPLICATION_JSON)
                        .content(objectMapper.writeValueAsString(scanReq)))
                .andExpect(status().isBadRequest())
                .andExpect(jsonPath("$.status", is(400)))
                .andExpect(jsonPath("$.message", containsString("Route mismatch")));
    }

    @Test
    @DisplayName("Should reject duplicate rapid scan at the same checkpoint (DUPLICATE_SCAN)")
    void testDuplicateScanRejection() throws Exception {
        String adminToken = getAuthToken("admin@yatraflow.gov.in", "Admin@12345");
        String checkpointOpToken = getAuthToken("checkpoint@yatraflow.gov.in", "Checkpoint@12345");
        Route baltal = routeRepository.findByCode("RT-BALTAL").orElseThrow();
        Checkpoint domelCp = checkpointRepository.findByCode("CP-02").orElseThrow();

        CreatePilgrimRequest pilgrimReq = CreatePilgrimRequest.builder()
                .name("Ananya Roy")
                .age(31)
                .gender("FEMALE")
                .routeId(baltal.getId())
                .build();

        MvcResult regResult = mockMvc.perform(post("/api/pilgrims")
                        .header("Authorization", "Bearer " + adminToken)
                        .contentType(MediaType.APPLICATION_JSON)
                        .content(objectMapper.writeValueAsString(pilgrimReq)))
                .andExpect(status().isCreated())
                .andReturn();

        String qrId = objectMapper.readTree(regResult.getResponse().getContentAsString())
                .path("data").path("qrCode").path("qrId").asText();

        CreateScanRequest scanReq = CreateScanRequest.builder()
                .qrId(qrId)
                .checkpointId(domelCp.getId())
                .build();

        // 1st scan -> SUCCESS
        mockMvc.perform(post("/api/scans")
                        .header("Authorization", "Bearer " + checkpointOpToken)
                        .contentType(MediaType.APPLICATION_JSON)
                        .content(objectMapper.writeValueAsString(scanReq)))
                .andExpect(status().isCreated());

        // 2nd scan immediately at same checkpoint -> REJECTED (Duplicate)
        mockMvc.perform(post("/api/scans")
                        .header("Authorization", "Bearer " + checkpointOpToken)
                        .contentType(MediaType.APPLICATION_JSON)
                        .content(objectMapper.writeValueAsString(scanReq)))
                .andExpect(status().isBadRequest())
                .andExpect(jsonPath("$.status", is(400)))
                .andExpect(jsonPath("$.message", containsString("Duplicate scan detected")));
    }
}
