package com.yatraflow.entity;

import jakarta.persistence.*;
import lombok.*;
import org.hibernate.annotations.CreationTimestamp;
import org.hibernate.annotations.UpdateTimestamp;

import java.time.LocalDateTime;

@Entity
@Table(name = "emergency_incidents")
@Getter
@Setter
@NoArgsConstructor
@AllArgsConstructor
@Builder
public class EmergencyIncident {

    @Id
    @GeneratedValue(strategy = GenerationType.IDENTITY)
    private Long id;

    @Column(name = "incident_code", nullable = false, unique = true, length = 60)
    private String incidentCode;

    @Enumerated(EnumType.STRING)
    @Column(name = "incident_type", nullable = false, length = 40)
    private IncidentType incidentType;

    @Enumerated(EnumType.STRING)
    @Column(name = "scope", nullable = false, length = 30)
    private EmergencyScope scope;

    @Enumerated(EnumType.STRING)
    @Column(name = "severity", nullable = false, length = 30)
    private EmergencySeverity severity;

    @Enumerated(EnumType.STRING)
    @Column(name = "status", nullable = false, length = 40)
    private EmergencyStatus status;

    @ManyToOne(fetch = FetchType.EAGER)
    @JoinColumn(name = "pilgrim_id")
    private Pilgrim pilgrim;

    @ManyToOne(fetch = FetchType.EAGER)
    @JoinColumn(name = "route_id")
    private Route route;

    @ManyToOne(fetch = FetchType.EAGER)
    @JoinColumn(name = "checkpoint_id")
    private Checkpoint checkpoint;

    @Column(name = "latitude")
    private Double latitude;

    @Column(name = "longitude")
    private Double longitude;

    @Column(name = "location_accuracy")
    private Double locationAccuracy;

    @Enumerated(EnumType.STRING)
    @Column(name = "location_source", nullable = false, length = 30)
    private LocationSource locationSource;

    @Column(name = "title", nullable = false, length = 200)
    private String title;

    @Column(name = "description", length = 1000)
    private String description;

    @Column(name = "safety_instruction", length = 1000)
    private String safetyInstruction;

    @Column(name = "is_verified", nullable = false)
    private boolean verified;

    @Column(name = "reported_at", nullable = false)
    private LocalDateTime reportedAt;

    @Column(name = "acknowledged_at")
    private LocalDateTime acknowledgedAt;

    @Column(name = "dispatched_at")
    private LocalDateTime dispatchedAt;

    @Column(name = "resolved_at")
    private LocalDateTime resolvedAt;

    @ManyToOne(fetch = FetchType.LAZY)
    @JoinColumn(name = "reported_by_user_id")
    private User reportedByUser;

    @ManyToOne(fetch = FetchType.LAZY)
    @JoinColumn(name = "assigned_responder_id")
    private User assignedResponder;

    @Column(name = "responder_notes", length = 1000)
    private String responderNotes;

    @CreationTimestamp
    @Column(name = "created_at", nullable = false, updatable = false)
    private LocalDateTime createdAt;

    @UpdateTimestamp
    @Column(name = "updated_at")
    private LocalDateTime updatedAt;
}
