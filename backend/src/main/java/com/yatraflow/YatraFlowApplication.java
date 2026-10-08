package com.yatraflow;

import org.springframework.boot.SpringApplication;
import org.springframework.boot.autoconfigure.SpringBootApplication;
import org.springframework.scheduling.annotation.EnableScheduling;

@SpringBootApplication
@EnableScheduling
public class YatraFlowApplication {

    public static void main(String[] args) {
        SpringApplication.run(YatraFlowApplication.class, args);
    }
}

