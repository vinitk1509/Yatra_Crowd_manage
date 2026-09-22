package com.yatraflow.config;

import com.yatraflow.entity.*;
import com.yatraflow.repository.*;
import com.yatraflow.service.QrCodeService;
import lombok.RequiredArgsConstructor;
import lombok.extern.slf4j.Slf4j;
import org.springframework.boot.CommandLineRunner;
import org.springframework.security.crypto.password.PasswordEncoder;
import org.springframework.stereotype.Component;

import java.time.LocalDateTime;
import java.util.List;

@Component
@RequiredArgsConstructor
@Slf4j
public class DataInitializer implements CommandLineRunner {

    private final UserRepository userRepository;
    private final RouteRepository routeRepository;
    private final CheckpointRepository checkpointRepository;
    private final PilgrimRepository pilgrimRepository;
    private final ScanEventRepository scanEventRepository;
    private final CrowdSnapshotRepository crowdSnapshotRepository;
    private final QrCodeService qrCodeService;
    private final PasswordEncoder passwordEncoder;

    @Override
    public void run(String... args) {
        seedUsers();
        seedRoutesAndCheckpoints();
        seedPilgrims();
        seedHistoricalSnapshots();
    }

    private void seedUsers() {
        if (userRepository.count() == 0) {
            log.info("Seeding default operational accounts for all 5 roles...");

            List<User> initialUsers = List.of(
                    User.builder()
                            .name("Arjun Sharma")
                            .email("admin@yatraflow.gov.in")
                            .password(passwordEncoder.encode("Admin@12345"))
                            .role(Role.ADMIN)
                            .active(true)
                            .build(),
                    User.builder()
                            .name("Priya Verma")
                            .email("control@yatraflow.gov.in")
                            .password(passwordEncoder.encode("Control@12345"))
                            .role(Role.CONTROL_ROOM_OPERATOR)
                            .active(true)
                            .build(),
                    User.builder()
                            .name("Ramesh Kumar")
                            .email("checkpoint@yatraflow.gov.in")
                            .password(passwordEncoder.encode("Checkpoint@12345"))
                            .role(Role.CHECKPOINT_OPERATOR)
                            .active(true)
                            .build(),
                    User.builder()
                            .name("Dr. Sunita Sen")
                            .email("emergency@yatraflow.gov.in")
                            .password(passwordEncoder.encode("Emergency@12345"))
                            .role(Role.EMERGENCY_OFFICER)
                            .active(true)
                            .build(),
                    User.builder()
                            .name("Col. Rajesh Nair")
                            .email("supervisor@yatraflow.gov.in")
                            .password(passwordEncoder.encode("Supervisor@12345"))
                            .role(Role.SUPERVISOR)
                            .active(true)
                            .build(),
                    User.builder()
                            .name("Arjun Rao")
                            .email("pilgrim@yatraflow.gov.in")
                            .password(passwordEncoder.encode("Pilgrim@12345"))
                            .role(Role.PILGRIM)
                            .active(true)
                            .build()
            );

            userRepository.saveAll(initialUsers);
            log.info("Successfully seeded initial operational and pilgrim users.");
        }
    }

    private void seedRoutesAndCheckpoints() {
        if (routeRepository.count() == 0) {
            log.info("Seeding Amarnath Yatra routes and strategic checkpoints...");

            Route baltalRoute = Route.builder()
                    .name("Baltal - Holy Cave Track")
                    .code("RT-BALTAL")
                    .description("Shorter, steeper direct route from Baltal base camp via Domel and Sangam to the Holy Cave (14 km).")
                    .active(true)
                    .build();

            Route pahalgamRoute = Route.builder()
                    .name("Pahalgam - Holy Cave Track")
                    .code("RT-PAHALGAM")
                    .description("Traditional pilgrimage route starting from Chandanwari via Sheshnag and Panchtarni (48 km).")
                    .active(true)
                    .build();

            baltalRoute = routeRepository.save(baltalRoute);
            pahalgamRoute = routeRepository.save(pahalgamRoute);

            List<Checkpoint> initialCheckpoints = List.of(
                    Checkpoint.builder()
                            .name("Baltal Base Camp")
                            .code("CP-01")
                            .route(baltalRoute)
                            .capacity(4050)
                            .latitude(34.2541)
                            .longitude(75.3195)
                            .sequenceOrder(1)
                            .distanceFromStartKm(0.0)
                            .distanceFromPrevKm(0.0)
                            .active(true)
                            .build(),
                    Checkpoint.builder()
                            .name("Domel Bridge")
                            .code("CP-02")
                            .route(baltalRoute)
                            .capacity(4580)
                            .latitude(34.2710)
                            .longitude(75.3421)
                            .sequenceOrder(2)
                            .distanceFromStartKm(2.8)
                            .distanceFromPrevKm(2.8)
                            .active(true)
                            .build(),
                    Checkpoint.builder()
                            .name("Sheshnag High Camp")
                            .code("CP-03")
                            .route(pahalgamRoute)
                            .capacity(5080)
                            .latitude(34.1950)
                            .longitude(75.5230)
                            .sequenceOrder(3)
                            .distanceFromStartKm(14.0)
                            .distanceFromPrevKm(11.2)
                            .active(true)
                            .build(),
                    Checkpoint.builder()
                            .name("Panchtarni Helipad & Transit")
                            .code("CP-04")
                            .route(pahalgamRoute)
                            .capacity(4280)
                            .latitude(34.2250)
                            .longitude(75.5510)
                            .sequenceOrder(4)
                            .distanceFromStartKm(20.0)
                            .distanceFromPrevKm(6.0)
                            .active(true)
                            .build(),
                    Checkpoint.builder()
                            .name("Holy Cave Concourse")
                            .code("CP-05")
                            .route(baltalRoute)
                            .capacity(4780)
                            .latitude(34.2155)
                            .longitude(75.5035)
                            .sequenceOrder(5)
                            .distanceFromStartKm(26.0)
                            .distanceFromPrevKm(6.0)
                            .active(true)
                            .build()
            );

            checkpointRepository.saveAll(initialCheckpoints);
            log.info("Successfully seeded routes and checkpoints with elevation & distance metadata.");
        }
    }

    private void seedPilgrims() {
        if (pilgrimRepository.count() == 0) {
            log.info("Seeding initial registered pilgrims with auto-generated QR credentials...");

            Route baltal = routeRepository.findByCode("RT-BALTAL").orElse(null);
            Route pahalgam = routeRepository.findByCode("RT-PAHALGAM").orElse(null);

            Checkpoint cp1 = checkpointRepository.findByCode("CP-01").orElse(null);
            Checkpoint cp2 = checkpointRepository.findByCode("CP-02").orElse(null);
            Checkpoint cp3 = checkpointRepository.findByCode("CP-03").orElse(null);

            if (baltal != null && cp1 != null && cp2 != null) {
                com.yatraflow.entity.Pilgrim p1 = com.yatraflow.entity.Pilgrim.builder()
                        .pilgrimCode("PIL-2026-0001-ARJN")
                        .name("Arjun Rao")
                        .age(34)
                        .gender("MALE")
                        .phoneNumber("+91 9876543210")
                        .emergencyContact("+91 9876543211")
                        .route(baltal)
                        .status(com.yatraflow.entity.PilgrimStatus.IN_TRANSIT)
                        .build();

                p1 = pilgrimRepository.save(p1);
                QrCode qr1 = qrCodeService.generateQr(p1);

                // Seed movement events with speed (CP1 at T-75m -> CP2 at T-15m = 60 min for 2.8 km = 2.8 km/h)
                LocalDateTime now = LocalDateTime.now();
                scanEventRepository.save(ScanEvent.builder()
                        .qrId(qr1.getQrId())
                        .pilgrim(p1)
                        .checkpoint(cp1)
                        .route(baltal)
                        .scanTimestamp(now.minusMinutes(75))
                        .scanType(ScanType.ENTRY)
                        .operatorEmail("checkpoint@yatraflow.gov.in")
                        .validationStatus(ScanValidationStatus.VALID)
                        .build());

                scanEventRepository.save(ScanEvent.builder()
                        .qrId(qr1.getQrId())
                        .pilgrim(p1)
                        .checkpoint(cp2)
                        .route(baltal)
                        .scanTimestamp(now.minusMinutes(15))
                        .scanType(ScanType.TRANSIT)
                        .operatorEmail("checkpoint@yatraflow.gov.in")
                        .validationStatus(ScanValidationStatus.VALID)
                        .build());
            }

            if (pahalgam != null && cp3 != null) {
                com.yatraflow.entity.Pilgrim p2 = com.yatraflow.entity.Pilgrim.builder()
                        .pilgrimCode("PIL-2026-0002-MEEN")
                        .name("Meenakshi Sundaram")
                        .age(48)
                        .gender("FEMALE")
                        .phoneNumber("+91 9812345678")
                        .emergencyContact("+91 9812345679")
                        .route(pahalgam)
                        .status(com.yatraflow.entity.PilgrimStatus.IN_TRANSIT)
                        .build();

                p2 = pilgrimRepository.save(p2);
                QrCode qr2 = qrCodeService.generateQr(p2);

                scanEventRepository.save(ScanEvent.builder()
                        .qrId(qr2.getQrId())
                        .pilgrim(p2)
                        .checkpoint(cp3)
                        .route(pahalgam)
                        .scanTimestamp(LocalDateTime.now().minusMinutes(30))
                        .scanType(ScanType.TRANSIT)
                        .operatorEmail("checkpoint@yatraflow.gov.in")
                        .validationStatus(ScanValidationStatus.VALID)
                        .build());
            }

            log.info("Successfully seeded initial pilgrims, QR credentials, and baseline movement scans.");
        }
    }

    private void seedHistoricalSnapshots() {
        if (crowdSnapshotRepository.count() == 0) {
            log.info("Seeding 24-hour realistic multi-checkpoint historical snapshot analytics...");

            List<Checkpoint> cps = checkpointRepository.findAll();
            if (cps.isEmpty()) return;

            Checkpoint cp1 = cps.stream().filter(c -> "CP-01".equals(c.getCode())).findFirst().orElse(cps.get(0));
            Checkpoint cp2 = cps.stream().filter(c -> "CP-02".equals(c.getCode())).findFirst().orElse(cps.get(0));
            Checkpoint cp3 = cps.stream().filter(c -> "CP-03".equals(c.getCode())).findFirst().orElse(cps.get(0));
            Checkpoint cp4 = cps.stream().filter(c -> "CP-04".equals(c.getCode())).findFirst().orElse(cps.get(0));
            Checkpoint cp5 = cps.stream().filter(c -> "CP-05".equals(c.getCode())).findFirst().orElse(cps.get(0));

            LocalDateTime baseTime = LocalDateTime.now().minusHours(24).withMinute(0).withSecond(0).withNano(0);

            // Hourly multiplier profiles across 24 hours
            // 00:00 to 05:00: Night rest
            // 06:00 to 10:00: Morning ingress surge
            // 11:00 to 14:00: Midday bottleneck at Sheshnag
            // 15:00 to 18:00: Holy cave darshan
            // 19:00 to 23:00: Evening descent
            double[] cp1Profile = {0.1, 0.1, 0.1, 0.1, 0.2, 0.4, 0.7, 0.85, 0.9, 0.75, 0.6, 0.5, 0.45, 0.4, 0.35, 0.3, 0.25, 0.2, 0.15, 0.1, 0.1, 0.1, 0.1, 0.1};
            double[] cp2Profile = {0.05, 0.05, 0.05, 0.05, 0.1, 0.2, 0.4, 0.65, 0.8, 0.88, 0.82, 0.7, 0.6, 0.55, 0.45, 0.35, 0.3, 0.25, 0.2, 0.15, 0.1, 0.05, 0.05, 0.05};
            double[] cp3Profile = {0.05, 0.05, 0.05, 0.05, 0.05, 0.1, 0.2, 0.4, 0.6, 0.75, 0.92, 0.96, 0.94, 0.88, 0.78, 0.65, 0.5, 0.4, 0.3, 0.2, 0.1, 0.05, 0.05, 0.05};
            double[] cp4Profile = {0.05, 0.05, 0.05, 0.05, 0.05, 0.05, 0.1, 0.2, 0.35, 0.5, 0.65, 0.75, 0.82, 0.85, 0.8, 0.7, 0.55, 0.4, 0.3, 0.2, 0.1, 0.05, 0.05, 0.05};
            double[] cp5Profile = {0.05, 0.05, 0.05, 0.05, 0.05, 0.05, 0.05, 0.1, 0.2, 0.35, 0.5, 0.65, 0.78, 0.86, 0.9, 0.82, 0.65, 0.45, 0.3, 0.2, 0.1, 0.05, 0.05, 0.05};

            List<CrowdSnapshot> snapshots = new java.util.ArrayList<>();

            for (int h = 0; h < 24; h++) {
                LocalDateTime pointTime = baseTime.plusHours(h);

                // For fine-grained aggregation testing, generate 15-minute resolution snapshots
                for (int m = 0; m < 60; m += 15) {
                    LocalDateTime snapTime = pointTime.plusMinutes(m);

                    snapshots.add(createSnapshot(cp1, cp1Profile[h], snapTime, 4000, 2.8, 55.0));
                    snapshots.add(createSnapshot(cp2, cp2Profile[h], snapTime, 4500, 2.2, 70.0));
                    snapshots.add(createSnapshot(cp3, cp3Profile[h], snapTime, 5000, cp3Profile[h] > 0.85 ? 1.3 : 2.0, 110.0));
                    snapshots.add(createSnapshot(cp4, cp4Profile[h], snapTime, 4200, 2.6, 65.0));
                    snapshots.add(createSnapshot(cp5, cp5Profile[h], snapTime, 4800, 1.9, 85.0));
                }
            }

            crowdSnapshotRepository.saveAll(snapshots);
            log.info("Successfully seeded {} historical crowd snapshots for 24h analytics.", snapshots.size());
        }
    }

    private CrowdSnapshot createSnapshot(Checkpoint cp, double ratio, LocalDateTime time, int capacity, double speed, double transit) {
        int crowd = (int) Math.round(capacity * ratio);
        double occ = Math.round(((double) crowd / capacity) * 1000.0) / 10.0;
        int inflow = (int) Math.round(crowd * 0.015) + 5;
        int outflow = (int) Math.round(crowd * 0.012) + 4;
        int net = inflow - outflow;
        int inTransit = (int) Math.round(crowd * 0.35);

        OperationalStatus status = occ >= 92.0 ? OperationalStatus.CRITICAL :
                (occ >= 85.0 ? OperationalStatus.HIGH :
                        (occ >= 70.0 ? OperationalStatus.WATCH : OperationalStatus.NORMAL));

        return CrowdSnapshot.builder()
                .checkpoint(cp)
                .route(cp.getRoute())
                .timestamp(time)
                .crowdCount(crowd)
                .capacity(capacity)
                .occupancyPercentage(occ)
                .inflow(inflow)
                .outflow(outflow)
                .netFlow(net)
                .averageSpeed(speed)
                .averageTransitTime(transit)
                .inTransitCount(inTransit)
                .status(status)
                .dataStatus(DataFreshnessStatus.FRESH)
                .build();
    }
}
