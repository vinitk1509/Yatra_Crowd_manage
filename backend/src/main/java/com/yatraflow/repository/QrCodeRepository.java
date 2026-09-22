package com.yatraflow.repository;

import com.yatraflow.entity.QrCode;
import org.springframework.data.jpa.repository.JpaRepository;
import org.springframework.stereotype.Repository;

import java.util.Optional;

@Repository
public interface QrCodeRepository extends JpaRepository<QrCode, Long> {
    Optional<QrCode> findByQrId(String qrId);
    Optional<QrCode> findByPilgrimId(Long pilgrimId);
    boolean existsByQrId(String qrId);
}
