package com.yatraflow.controller;

import com.yatraflow.dto.prediction.CheckpointPredictionDto;
import com.yatraflow.dto.prediction.LivePredictionsResponseDto;
import com.yatraflow.service.prediction.PredictionService;
import lombok.RequiredArgsConstructor;
import lombok.extern.slf4j.Slf4j;
import org.springframework.http.ResponseEntity;
import org.springframework.web.bind.annotation.*;

import java.util.List;

@RestController
@RequestMapping("/api/predictions")
@RequiredArgsConstructor
@Slf4j
public class PredictionController {

    private final PredictionService predictionService;

    @GetMapping("/live")
    public ResponseEntity<LivePredictionsResponseDto> getLivePredictions() {
        return ResponseEntity.ok(predictionService.getLivePredictions());
    }

    @GetMapping("/checkpoints/{checkpointId}")
    public ResponseEntity<CheckpointPredictionDto> getCheckpointPrediction(@PathVariable("checkpointId") Long checkpointId) {
        return ResponseEntity.ok(predictionService.getPredictionForCheckpoint(checkpointId));
    }

    @GetMapping("/route/{routeId}")
    public ResponseEntity<List<CheckpointPredictionDto>> getRoutePredictions(@PathVariable("routeId") Long routeId) {
        return ResponseEntity.ok(predictionService.getPredictionsForRoute(routeId));
    }

    @PostMapping("/checkpoints/{checkpointId}")
    public ResponseEntity<CheckpointPredictionDto> triggerCheckpointPrediction(@PathVariable("checkpointId") Long checkpointId) {
        return ResponseEntity.ok(predictionService.getPredictionForCheckpoint(checkpointId));
    }
}
