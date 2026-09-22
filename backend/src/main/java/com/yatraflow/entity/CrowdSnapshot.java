package com.yatraflow.entity;

import jakarta.persistence.*;
import lombok.*;
import org.hibernate.annotations.CreationTimestamp;

import java.time.LocalDateTime;

@Entity
@Table(
    name = "crowd_snapshots",
    indexes = {
        @Index(name = "idx_snapshot_cp_time", columnList = "checkpoint_id, snapshot_timestamp"),
        @Index(name = "idx_snapshot_time", columnList = "snapshot_timestamp")
    }
)
@Getter
@Setter
@NoArgsConstructor
@AllArgsConstructor
@Builder
public class CrowdSnapshot {

    @Id
    @GeneratedValue(strategy = GenerationType.IDENTITY)
    private Long id;

    @ManyToOne(fetch = FetchType.EAGER)
    @JoinColumn(name = "checkpoint_id", nullable = false)
    private Checkpoint checkpoint;

    @ManyToOne(fetch = FetchType.EAGER)
    @JoinColumn(name = "route_id", nullable = true)
    private Route route;

    @Column(name = "snapshot_timestamp", nullable = false)
    private LocalDateTime timestamp;

    @Column(name = "crowd_count", nullable = false)
    private Integer crowdCount;

    @Column(nullable = false)
    private Integer capacity;

    @Column(name = "occupancy_percentage", nullable = false)
    private Double occupancyPercentage;

    @Column(nullable = false)
    private Integer inflow;

    @Column(nullable = false)
    private Integer outflow;

    @Column(name = "net_flow", nullable = false)
    private Integer netFlow;

    @Column(name = "average_speed_kmh")
    private Double averageSpeed;

    @Column(name = "average_transit_time_minutes")
    private Double averageTransitTime;

    @Column(name = "in_transit_count", nullable = false)
    private Integer inTransitCount;

    @Enumerated(EnumType.STRING)
    @Column(nullable = false, length = 30)
    private OperationalStatus status;

    @Enumerated(EnumType.STRING)
    @Column(name = "data_status", nullable = false, length = 30)
    private DataFreshnessStatus dataStatus;

    @CreationTimestamp
    @Column(name = "created_at", nullable = false, updatable = false)
    private LocalDateTime createdAt;
}
