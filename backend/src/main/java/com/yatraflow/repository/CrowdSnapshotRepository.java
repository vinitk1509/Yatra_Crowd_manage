package com.yatraflow.repository;

import com.yatraflow.entity.CrowdSnapshot;
import org.springframework.data.jpa.repository.JpaRepository;
import org.springframework.data.jpa.repository.Query;
import org.springframework.data.repository.query.Param;
import org.springframework.stereotype.Repository;

import java.time.LocalDateTime;
import java.util.List;
import java.util.Optional;

@Repository
public interface CrowdSnapshotRepository extends JpaRepository<CrowdSnapshot, Long> {

    List<CrowdSnapshot> findByCheckpointIdOrderByTimestampDesc(Long checkpointId);

    @Query("SELECT cs FROM CrowdSnapshot cs WHERE cs.checkpoint.id = :checkpointId ORDER BY cs.timestamp DESC LIMIT 1")
    Optional<CrowdSnapshot> findLatestByCheckpointId(@Param("checkpointId") Long checkpointId);

    List<CrowdSnapshot> findByCheckpointIdAndTimestampAfterOrderByTimestampAsc(Long checkpointId, LocalDateTime afterTime);

    List<CrowdSnapshot> findByTimestampBetweenOrderByTimestampAsc(LocalDateTime start, LocalDateTime end);

    List<CrowdSnapshot> findByCheckpointIdAndTimestampBetweenOrderByTimestampAsc(Long checkpointId, LocalDateTime start, LocalDateTime end);

    @Query("SELECT cs FROM CrowdSnapshot cs WHERE cs.checkpoint.code = :checkpointCode AND cs.timestamp BETWEEN :start AND :end ORDER BY cs.timestamp ASC")
    List<CrowdSnapshot> findByCheckpointCodeAndTimestampBetweenOrderByTimestampAsc(
            @Param("checkpointCode") String checkpointCode,
            @Param("start") LocalDateTime start,
            @Param("end") LocalDateTime end);

    @Query("SELECT cs FROM CrowdSnapshot cs WHERE (cs.route.id = :routeId OR cs.checkpoint.route.id = :routeId) AND cs.timestamp BETWEEN :start AND :end ORDER BY cs.timestamp ASC")
    List<CrowdSnapshot> findByRouteIdAndTimestampBetweenOrderByTimestampAsc(
            @Param("routeId") Long routeId,
            @Param("start") LocalDateTime start,
            @Param("end") LocalDateTime end);
}
