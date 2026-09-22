package com.yatraflow.service.prediction;

import com.yatraflow.dto.prediction.ForecastHorizonDto;

import java.util.Map;

public interface PredictionProvider {

    /**
     * Computes multi-horizon crowd forecast for a specific checkpoint state.
     *
     * @param featureMap input state features (current crowd, lags, flow, speed, time)
     * @param capacity   checkpoint max capacity
     * @return Map of horizon string ("15m", "30m", "60m") to ForecastHorizonDto
     */
    Map<String, ForecastHorizonDto> predictHorizons(Map<String, Object> featureMap, int capacity);

    String getProviderName();

    String getModelVersion();
}
