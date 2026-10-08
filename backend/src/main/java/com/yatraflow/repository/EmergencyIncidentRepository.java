package com.yatraflow.repository;

import com.yatraflow.entity.EmergencyIncident;
import com.yatraflow.entity.EmergencyScope;
import com.yatraflow.entity.EmergencyStatus;
import org.springframework.data.jpa.repository.JpaRepository;
import org.springframework.data.jpa.repository.Query;
import org.springframework.data.repository.query.Param;
import org.springframework.stereotype.Repository;

import java.util.List;
import java.util.Optional;

@Repository
public interface EmergencyIncidentRepository extends JpaRepository<EmergencyIncident, Long> {

    Optional<EmergencyIncident> findByIncidentCode(String incidentCode);

    List<EmergencyIncident> findByPilgrimIdOrderByReportedAtDesc(Long pilgrimId);

    List<EmergencyIncident> findAllByOrderByReportedAtDesc();

    List<EmergencyIncident> findByStatusNotOrderByReportedAtDesc(EmergencyStatus status);

    List<EmergencyIncident> findByScopeAndStatusNotOrderByReportedAtDesc(EmergencyScope scope, EmergencyStatus status);

    @Query("SELECT e FROM EmergencyIncident e WHERE e.verified = true AND e.status NOT IN ('RESOLVED', 'FALSE_ALARM') AND e.scope IN ('GLOBAL', 'ROUTE', 'CHECKPOINT') ORDER BY e.reportedAt DESC")
    List<EmergencyIncident> findActivePublicAlerts();

    @Query("SELECT e FROM EmergencyIncident e WHERE e.verified = true AND e.status NOT IN ('RESOLVED', 'FALSE_ALARM') AND (e.scope = 'GLOBAL' OR (e.route.id = :routeId) OR (e.checkpoint.id = :checkpointId)) ORDER BY e.reportedAt DESC")
    List<EmergencyIncident> findActivePublicAlertsForRouteOrCheckpoint(@Param("routeId") Long routeId, @Param("checkpointId") Long checkpointId);

    @Query("SELECT e FROM EmergencyIncident e WHERE e.pilgrim.id = :pilgrimId AND e.status NOT IN ('RESOLVED', 'FALSE_ALARM') ORDER BY e.reportedAt DESC")
    List<EmergencyIncident> findActiveByPilgrimId(@Param("pilgrimId") Long pilgrimId);
}
