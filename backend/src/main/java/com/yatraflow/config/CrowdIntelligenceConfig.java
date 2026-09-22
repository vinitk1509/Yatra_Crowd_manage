package com.yatraflow.config;

import lombok.Getter;
import lombok.Setter;
import org.springframework.boot.context.properties.ConfigurationProperties;
import org.springframework.context.annotation.Configuration;

@Configuration
@ConfigurationProperties(prefix = "app.crowd")
@Getter
@Setter
public class CrowdIntelligenceConfig {

    private Thresholds thresholds = new Thresholds();
    private Flow flow = new Flow();
    private Speed speed = new Speed();
    private Bottleneck bottleneck = new Bottleneck();

    @Getter
    @Setter
    public static class Thresholds {
        private double watchOccupancyPercent = 70.0;
        private double highOccupancyPercent = 85.0;
        private double criticalOccupancyPercent = 92.0;
    }

    @Getter
    @Setter
    public static class Flow {
        private int windowMinutes = 60;
    }

    @Getter
    @Setter
    public static class Speed {
        private double minReasonableKmh = 0.2;
        private double maxReasonableKmh = 12.0;
        private double normalSpeedKmh = 2.5;
    }

    @Getter
    @Setter
    public static class Bottleneck {
        private double minAccumulationRate = 5.0;
        private double speedDropThresholdKmh = 1.8;
    }
}
