package com.yatraflow.repository;

import com.yatraflow.entity.Checkpoint;
import org.springframework.data.jpa.repository.JpaRepository;
import org.springframework.stereotype.Repository;

import java.util.List;
import java.util.Optional;

@Repository
public interface CheckpointRepository extends JpaRepository<Checkpoint, Long> {
    Optional<Checkpoint> findByCode(String code);
    boolean existsByCode(String code);
    List<Checkpoint> findByRouteId(Long routeId);
    List<Checkpoint> findByRouteIdOrderBySequenceOrderAsc(Long routeId);
    List<Checkpoint> findByActive(boolean active);
}
