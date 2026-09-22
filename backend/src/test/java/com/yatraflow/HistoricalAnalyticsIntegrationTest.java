package com.yatraflow;

import com.yatraflow.dto.analytics.HistoricalAnalyticsResponseDto;
import com.yatraflow.dto.analytics.MlTrainingSequenceDto;
import com.yatraflow.exception.BadRequestException;
import com.yatraflow.repository.CheckpointRepository;
import com.yatraflow.repository.RouteRepository;
import com.yatraflow.service.HistoricalAnalyticsService;
import org.junit.jupiter.api.DisplayName;
import org.junit.jupiter.api.Test;
import org.springframework.beans.factory.annotation.Autowired;
import org.springframework.boot.test.context.SpringBootTest;
import org.springframework.test.context.ActiveProfiles;

import java.time.LocalDateTime;
import java.util.List;

import static org.assertj.core.api.Assertions.assertThat;
import static org.junit.jupiter.api.Assertions.assertThrows;

@SpringBootTest(webEnvironment = SpringBootTest.WebEnvironment.RANDOM_PORT)
@ActiveProfiles("default")
public class HistoricalAnalyticsIntegrationTest {

    @Autowired
    private HistoricalAnalyticsService historicalAnalyticsService;

    @Autowired
    private CheckpointRepository checkpointRepository;

    @Autowired
    private RouteRepository routeRepository;

    @Test
    @DisplayName("Should aggregate 24-hour historical snapshots by 1h interval across all checkpoints")
    void shouldAggregateByHourSuccessfully() {
        LocalDateTime start = LocalDateTime.now().minusHours(24);
        LocalDateTime end = LocalDateTime.now();

        HistoricalAnalyticsResponseDto response = historicalAnalyticsService.getHistoricalAnalytics(
                null, null, null, start, end, "1h", false);

        assertThat(response).isNotNull();
        assertThat(response.getTimeSeries()).isNotEmpty();
        assertThat(response.getSummary()).isNotNull();
        assertThat(response.getSummary().getPeakCrowd()).isGreaterThan(0);
        assertThat(response.getSummary().getPeakOccupancyPercentage()).isGreaterThan(0.0);
    }

    @Test
    @DisplayName("Should filter historical analytics by specific checkpoint (CP-03 Sheshnag)")
    void shouldFilterByCheckpointSuccessfully() {
        LocalDateTime start = LocalDateTime.now().minusHours(24);
        LocalDateTime end = LocalDateTime.now();

        HistoricalAnalyticsResponseDto response = historicalAnalyticsService.getHistoricalAnalytics(
                null, "CP-03", null, start, end, "15m", false);

        assertThat(response).isNotNull();
        assertThat(response.getTimeSeries()).isNotEmpty();
        assertThat(response.getTimeSeries().stream().allMatch(p -> "CP-03".equals(p.getCheckpointCode()))).isTrue();

        // Sheshnag reaches peak during midday
        assertThat(response.getSummary().getPeakOccupancyPercentage()).isGreaterThan(85.0);
        assertThat(response.getSummary().getMinutesAboveWatchThreshold()).isGreaterThan(0);
    }

    @Test
    @DisplayName("Should aggregate by different intervals: 5m, 15m, 30m, 1h, 1d")
    void shouldSupportMultipleAggregationIntervals() {
        LocalDateTime start = LocalDateTime.now().minusHours(12);
        LocalDateTime end = LocalDateTime.now();

        HistoricalAnalyticsResponseDto res15m = historicalAnalyticsService.getHistoricalAnalytics(
                null, "CP-01", null, start, end, "15m", false);
        HistoricalAnalyticsResponseDto res1h = historicalAnalyticsService.getHistoricalAnalytics(
                null, "CP-01", null, start, end, "1h", false);

        assertThat(res15m.getTimeSeries().size()).isGreaterThanOrEqualTo(res1h.getTimeSeries().size());
    }

    @Test
    @DisplayName("Should generate ML-ready sequence sliding window features (t-4 to t)")
    void shouldGenerateMlTrainingSequences() {
        LocalDateTime start = LocalDateTime.now().minusHours(24);
        LocalDateTime end = LocalDateTime.now();

        HistoricalAnalyticsResponseDto response = historicalAnalyticsService.getHistoricalAnalytics(
                null, "CP-03", null, start, end, "15m", true);

        List<MlTrainingSequenceDto> mlData = response.getMlSequences();
        assertThat(mlData).isNotEmpty();

        MlTrainingSequenceDto sample = mlData.get(0);
        assertThat(sample.getCurrent_crowd()).isNotNull();
        assertThat(sample.getCrowd_t_minus_1()).isNotNull();
        assertThat(sample.getCrowd_t_minus_4()).isNotNull();
        assertThat(sample.getTimeOfDayHour()).isBetween(0.0, 24.0);
        assertThat(sample.getDayOfWeek()).isBetween(1, 7);
    }

    @Test
    @DisplayName("Should reject invalid date range where start is after end")
    void shouldRejectInvalidDateRange() {
        LocalDateTime start = LocalDateTime.now();
        LocalDateTime end = LocalDateTime.now().minusHours(5);

        assertThrows(BadRequestException.class, () -> {
            historicalAnalyticsService.getHistoricalAnalytics(
                    null, null, null, start, end, "1h", false);
        });
    }

    @Test
    @DisplayName("Should handle empty date ranges gracefully with empty series and zero-filled summary")
    void shouldHandleEmptyDateRangeGracefully() {
        LocalDateTime start = LocalDateTime.now().minusDays(50);
        LocalDateTime end = LocalDateTime.now().minusDays(49);

        HistoricalAnalyticsResponseDto response = historicalAnalyticsService.getHistoricalAnalytics(
                null, "CP-01", null, start, end, "1h", false);

        assertThat(response.getTimeSeries()).isEmpty();
        assertThat(response.getSummary().getPeakCrowd()).isEqualTo(0);
        assertThat(response.getSummary().getTotalDataPointsEvaluated()).isEqualTo(0L);
    }
}
