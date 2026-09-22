package com.yatraflow.entity;

import jakarta.persistence.*;
import lombok.*;
import org.hibernate.annotations.CreationTimestamp;

import java.time.LocalDateTime;

@Entity
@Table(name = "scan_events")
@Getter
@Setter
@NoArgsConstructor
@AllArgsConstructor
@Builder
public class ScanEvent {

    @Id
    @GeneratedValue(strategy = GenerationType.IDENTITY)
    private Long id;

    @Column(name = "qr_id", nullable = false, length = 80)
    private String qrId;

    @ManyToOne(fetch = FetchType.EAGER)
    @JoinColumn(name = "pilgrim_id", nullable = false)
    private Pilgrim pilgrim;

    @ManyToOne(fetch = FetchType.EAGER)
    @JoinColumn(name = "checkpoint_id", nullable = false)
    private Checkpoint checkpoint;

    @ManyToOne(fetch = FetchType.EAGER)
    @JoinColumn(name = "route_id", nullable = false)
    private Route route;

    @Column(name = "scan_timestamp", nullable = false)
    private LocalDateTime scanTimestamp;

    @Enumerated(EnumType.STRING)
    @Column(name = "scan_type", nullable = false, length = 30)
    private ScanType scanType;

    @Column(name = "operator_email", nullable = false, length = 120)
    private String operatorEmail;

    @Enumerated(EnumType.STRING)
    @Column(name = "validation_status", nullable = false, length = 40)
    private ScanValidationStatus validationStatus;

    @Column(name = "failure_reason", length = 255)
    private String failureReason;

    @CreationTimestamp
    @Column(name = "created_at", nullable = false, updatable = false)
    private LocalDateTime createdAt;
}
