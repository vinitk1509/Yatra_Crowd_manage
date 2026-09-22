package com.yatraflow.repository;

import com.yatraflow.entity.Route;
import org.springframework.data.jpa.repository.JpaRepository;
import org.springframework.stereotype.Repository;

import java.util.List;
import java.util.Optional;

@Repository
public interface RouteRepository extends JpaRepository<Route, Long> {
    Optional<Route> findByCode(String code);
    boolean existsByCode(String code);
    List<Route> findByActive(boolean active);
}
