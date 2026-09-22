package com.yatraflow.repository;

import com.yatraflow.entity.Pilgrim;
import com.yatraflow.entity.PilgrimStatus;
import org.springframework.data.jpa.repository.JpaRepository;
import org.springframework.stereotype.Repository;

import java.util.List;
import java.util.Optional;

@Repository
public interface PilgrimRepository extends JpaRepository<Pilgrim, Long> {
    Optional<Pilgrim> findByPilgrimCode(String pilgrimCode);
    boolean existsByPilgrimCode(String pilgrimCode);
    List<Pilgrim> findByRouteId(Long routeId);
    List<Pilgrim> findByStatus(PilgrimStatus status);
}
