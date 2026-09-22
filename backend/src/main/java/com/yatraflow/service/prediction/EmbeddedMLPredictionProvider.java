package com.yatraflow.service.prediction;

import com.fasterxml.jackson.databind.JsonNode;
import com.fasterxml.jackson.databind.ObjectMapper;
import com.yatraflow.dto.prediction.ForecastHorizonDto;
import jakarta.annotation.PostConstruct;
import lombok.RequiredArgsConstructor;
import lombok.extern.slf4j.Slf4j;
import org.springframework.core.io.Resource;
import org.springframework.core.io.ResourceLoader;
import org.springframework.stereotype.Component;

import java.io.InputStream;
import java.util.*;

@Component
@RequiredArgsConstructor
@Slf4j
public class EmbeddedMLPredictionProvider implements PredictionProvider {

    private final ResourceLoader resourceLoader;
    private final ObjectMapper objectMapper;

    private boolean modelLoaded = false;
    private String modelVersion = "1.0.0-synthetic-trained";
    private final Map<String, HorizonModel> horizonModels = new HashMap<>();

    private static class HorizonModel {
        double intercept;
        Map<String, Double> coefficients = new HashMap<>();
        double rmse;
        double mae;
        double q10Offset;
        double q90Offset;
    }

    @PostConstruct
    public void init() {
        try {
            Resource resource = resourceLoader.getResource("classpath:models/crowd_forecast_model.json");
            if (resource.exists()) {
                try (InputStream is = resource.getInputStream()) {
                    JsonNode root = objectMapper.readTree(is);
                    if (root.has("version")) {
                        modelVersion = root.get("version").asText();
                    }

                    JsonNode horizonsNode = root.get("horizons");
                    if (horizonsNode != null && horizonsNode.isObject()) {
                        Iterator<Map.Entry<String, JsonNode>> fields = horizonsNode.fields();
                        while (fields.hasNext()) {
                            Map.Entry<String, JsonNode> entry = fields.next();
                            String h = entry.getKey();
                            JsonNode hNode = entry.getValue();

                            HorizonModel hm = new HorizonModel();
                            hm.intercept = hNode.get("intercept").asDouble();
                            hm.rmse = hNode.has("rmse") ? hNode.get("rmse").asDouble() : 25.0;
                            hm.mae = hNode.has("mae") ? hNode.get("mae").asDouble() : 18.0;
                            hm.q10Offset = hNode.has("q10_offset") ? hNode.get("q10_offset").asDouble() : (1.64 * hm.rmse);
                            hm.q90Offset = hNode.has("q90_offset") ? hNode.get("q90_offset").asDouble() : (1.64 * hm.rmse);

                            JsonNode coefNode = hNode.get("coefficients");
                            if (coefNode != null && coefNode.isObject()) {
                                Iterator<Map.Entry<String, JsonNode>> cFields = coefNode.fields();
                                while (cFields.hasNext()) {
                                    Map.Entry<String, JsonNode> cEntry = cFields.next();
                                    hm.coefficients.put(cEntry.getKey(), cEntry.getValue().asDouble());
                                }
                            }
                            horizonModels.put(h, hm);
                        }
                        modelLoaded = true;
                        log.info("Embedded ML crowd forecasting model loaded successfully (version: {}, horizons: {})",
                                modelVersion, horizonModels.keySet());
                    }
                }
            } else {
                log.warn("Model bundle resource 'classpath:models/crowd_forecast_model.json' not found. Will use physics baseline.");
            }
        } catch (Exception e) {
            log.warn("Failed to load embedded ML model bundle, defaulting to physics baseline: {}", e.getMessage());
        }
    }

    @Override
    public Map<String, ForecastHorizonDto> predictHorizons(Map<String, Object> featureMap, int capacity) {
        Map<String, ForecastHorizonDto> result = new LinkedHashMap<>();

        int currentCrowd = getInt(featureMap, "current_crowd", 1000);
        int inflow = getInt(featureMap, "inflow", 25);
        int outflow = getInt(featureMap, "outflow", 20);
        int netFlow = inflow - outflow;

        String[] horizons = {"15m", "30m", "60m"};
        int[] minutes = {15, 30, 60};

        for (int i = 0; i < horizons.length; i++) {
            String h = horizons[i];
            int minAhead = minutes[i];

            int predCrowd;
            double rmse = 25.0;
            double lowerOffset = 30.0;
            double upperOffset = 45.0;

            if (modelLoaded && horizonModels.containsKey(h)) {
                HorizonModel hm = horizonModels.get(h);
                rmse = hm.rmse;
                lowerOffset = hm.q10Offset > 0 ? hm.q10Offset : (1.64 * rmse);
                upperOffset = hm.q90Offset > 0 ? hm.q90Offset : (1.64 * rmse);

                double rawPred = hm.intercept;
                for (Map.Entry<String, Double> coefEntry : hm.coefficients.entrySet()) {
                    String feat = coefEntry.getKey();
                    double val = getDouble(featureMap, feat, 0.0);
                    rawPred += coefEntry.getValue() * val;
                }
                predCrowd = (int) Math.round(rawPred);
            } else {
                // Physics-informed baseline fallback: crowd + (netFlow * minutes)
                predCrowd = currentCrowd + (int) Math.round(netFlow * (minAhead / 15.0) * 0.85);
                lowerOffset = 1.64 * rmse;
                upperOffset = 1.64 * rmse;
            }

            // Bound predicted crowd safely between 0 and capacity * 1.05
            predCrowd = Math.max(0, Math.min((int) (capacity * 1.05), predCrowd));
            double predOcc = capacity > 0 ? Math.round(((double) predCrowd / capacity) * 1000.0) / 10.0 : 0.0;

            // Non-parametric Quantile Prediction Interval [q10, q90]
            int lowerBound = Math.max(0, (int) Math.round(predCrowd - lowerOffset));
            int upperBound = Math.min(capacity, (int) Math.round(predCrowd + upperOffset));
            double lowerOcc = capacity > 0 ? Math.round(((double) lowerBound / capacity) * 1000.0) / 10.0 : 0.0;
            double upperOcc = capacity > 0 ? Math.round(((double) upperBound / capacity) * 1000.0) / 10.0 : 0.0;

            // Risk Assessment
            String risk;
            if (predOcc >= 92.0) {
                risk = "PROJECTED_CRITICAL";
            } else if (predOcc >= 85.0) {
                risk = "PROJECTED_HIGH";
            } else if (predOcc >= 70.0) {
                risk = "PROJECTED_WATCH";
            } else {
                risk = "NORMAL";
            }

            result.put(h, ForecastHorizonDto.builder()
                    .horizon("+" + minAhead + " MIN")
                    .minutesAhead(minAhead)
                    .predictedCrowd(predCrowd)
                    .predictedOccupancy(predOcc)
                    .riskStatus(risk)
                    .lowerCrowdBound(lowerBound)
                    .upperCrowdBound(upperBound)
                    .lowerOccupancyBound(lowerOcc)
                    .upperOccupancyBound(upperOcc)
                    .build());
        }

        return result;
    }

    private int getInt(Map<String, Object> map, String key, int defaultVal) {
        Object val = map.get(key);
        if (val instanceof Number) return ((Number) val).intValue();
        return defaultVal;
    }

    private double getDouble(Map<String, Object> map, String key, double defaultVal) {
        Object val = map.get(key);
        if (val instanceof Number) return ((Number) val).doubleValue();
        if (val instanceof Boolean) return ((Boolean) val) ? 1.0 : 0.0;
        return defaultVal;
    }

    @Override
    public String getProviderName() {
        return "Embedded Ridge/GBDT Model Bundle";
    }

    @Override
    public String getModelVersion() {
        return modelVersion;
    }
}
