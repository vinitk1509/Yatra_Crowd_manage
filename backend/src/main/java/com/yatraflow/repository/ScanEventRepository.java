package com.yatraflow.repository;

import com.yatraflow.entity.ScanEvent;
import com.yatraflow.entity.ScanValidationStatus;
import org.springframework.data.jpa.repository.JpaRepository;
import org.springframework.stereotype.Repository;

import java.time.LocalDateTime;
import java.util.List;
import java.util.Optional;

@Repository
public interface ScanEventRepository extends JpaRepository<ScanEvent, Long> {
    List<ScanEvent> findByPilgrimIdOrderByScanTimestampDesc(Long pilgrimId);
    List<ScanEvent> findByCheckpointIdOrderByScanTimestampDesc(Long checkpointId);
    Optional<ScanEvent> findTopByPilgrimIdAndValidationStatusOrderByScanTimestampDesc(Long pilgrimId, ScanValidationStatus validationStatus);
    Optional<ScanEvent> findTopByPilgrimIdOrderByScanTimestampDesc(Long pilgrimId);
    List<ScanEvent> findByCheckpointIdAndScanTimestampAfter(Long checkpointId, LocalDateTime after);
}
