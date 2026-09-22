package com.yatraflow;

import com.yatraflow.dto.prediction.CheckpointPredictionDto;
import com.yatraflow.dto.prediction.ForecastHorizonDto;
import com.yatraflow.dto.prediction.LivePredictionsResponseDto;
import com.yatraflow.entity.Checkpoint;
import com.yatraflow.exception.ResourceNotFoundException;
import com.yatraflow.repository.CheckpointRepository;
import com.yatraflow.service.prediction.PredictionService;
import org.junit.jupiter.api.BeforeEach;
import org.junit.jupiter.api.DisplayName;
import org.junit.jupiter.api.Test;
import org.springframework.beans.factory.annotation.Autowired;
import org.springframework.boot.test.context.SpringBootTest;
import org.springframework.test.context.ActiveProfiles;

import static org.assertj.core.api.Assertions.assertThat;
import static org.junit.jupiter.api.Assertions.assertThrows;

@SpringBootTest(webEnvironment = SpringBootTest.WebEnvironment.RANDOM_PORT)
@ActiveProfiles("default")
public class SyntheticDataAndPredictionIntegrationTest {

    @Autowired
    private PredictionService predictionService;

    @Autowired
    private CheckpointRepository checkpointRepository;

    private Checkpoint cpBaltal;
    private Checkpoint cpSheshnag;

    @BeforeEach
    void setUp() {
        cpBaltal = checkpointRepository.findByCode("CP-01").orElseThrow();
        cpSheshnag = checkpointRepository.findByCode("CP-03").orElseThrow();
    }

    @Test
    @DisplayName("Should generate live predictions across all checkpoints with +15m, +30m, +60m horizons")
    void shouldGenerateLivePredictionsSuccessfully() {
        LivePredictionsResponseDto response = predictionService.getLivePredictions();

        assertThat(response).isNotNull();
        assertThat(response.getCheckpointPredictions()).isNotEmpty();
        assertThat(response.getModelVersion()).isNotNull();
        assertThat(response.getTotalActivePilgrims()).isGreaterThanOrEqualTo(0);
        assertThat(response.getTotalPredictedCrowd30m()).isGreaterThanOrEqualTo(0);
    }

    @Test
    @DisplayName("Should predict multi-horizon crowd and occupancy with uncertainty bounds for CP-03 Sheshnag")
    void shouldPredictForSpecificCheckpoint() {
        CheckpointPredictionDto pred = predictionService.getPredictionForCheckpoint(cpSheshnag.getId());

        assertThat(pred).isNotNull();
        assertThat(pred.getCheckpointCode()).isEqualTo("CP-03");
        assertThat(pred.getCurrentCrowd()).isGreaterThanOrEqualTo(0);

        // +15m Horizon
        ForecastHorizonDto f15 = pred.getForecast15m();
        assertThat(f15).isNotNull();
        assertThat(f15.getPredictedCrowd()).isGreaterThanOrEqualTo(0);
        assertThat(f15.getLowerCrowdBound()).isLessThanOrEqualTo(f15.getPredictedCrowd());
        assertThat(f15.getUpperCrowdBound()).isGreaterThanOrEqualTo(f15.getPredictedCrowd());

        // +30m Horizon
        ForecastHorizonDto f30 = pred.getForecast30m();
        assertThat(f30).isNotNull();
        assertThat(f30.getPredictedCrowd()).isGreaterThanOrEqualTo(0);
        assertThat(f30.getRiskStatus()).isIn("NORMAL", "PROJECTED_WATCH", "PROJECTED_HIGH", "PROJECTED_CRITICAL");

        // +60m Horizon
        ForecastHorizonDto f60 = pred.getForecast60m();
        assertThat(f60).isNotNull();
        assertThat(f60.getPredictedCrowd()).isGreaterThanOrEqualTo(0);
    }

    @Test
    @DisplayName("Should extract explainable signals (momentum, inflow pressure, velocity)")
    void shouldExtractExplainableSignals() {
        CheckpointPredictionDto pred = predictionService.getPredictionForCheckpoint(cpBaltal.getId());

        assertThat(pred.getSignals()).isNotEmpty();
        assertThat(pred.getSignals().stream().anyMatch(s -> s.getSignalName().contains("Occupancy"))).isTrue();
        assertThat(pred.getSignals().stream().anyMatch(s -> s.getSignalName().contains("Inflow"))).isTrue();
        assertThat(pred.getSignals().stream().anyMatch(s -> s.getSignalName().contains("Velocity"))).isTrue();
    }

    @Test
    @DisplayName("Should throw ResourceNotFoundException for invalid checkpoint ID")
    void shouldThrowForInvalidCheckpoint() {
        assertThrows(ResourceNotFoundException.class, () -> {
            predictionService.getPredictionForCheckpoint(99999L);
        });
    }
}
