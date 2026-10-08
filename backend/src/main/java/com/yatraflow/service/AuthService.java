package com.yatraflow.service;

import com.yatraflow.dto.auth.AuthResponse;
import com.yatraflow.dto.auth.LoginRequest;
import com.yatraflow.dto.auth.RegisterRequest;
import com.yatraflow.dto.user.UserDto;
import com.yatraflow.entity.Role;
import com.yatraflow.entity.User;
import com.yatraflow.exception.ResourceNotFoundException;
import com.yatraflow.exception.UserAlreadyExistsException;
import com.yatraflow.repository.UserRepository;
import com.yatraflow.security.JwtService;
import lombok.RequiredArgsConstructor;
import org.springframework.security.authentication.AuthenticationManager;
import org.springframework.security.authentication.UsernamePasswordAuthenticationToken;
import org.springframework.security.core.Authentication;
import org.springframework.security.crypto.password.PasswordEncoder;
import org.springframework.stereotype.Service;
import org.springframework.transaction.annotation.Transactional;

@Service
@RequiredArgsConstructor
public class AuthService {

    private final UserRepository userRepository;
    private final PasswordEncoder passwordEncoder;
    private final JwtService jwtService;
    private final AuthenticationManager authenticationManager;
    private final PilgrimService pilgrimService;

    @Transactional
    public AuthResponse register(RegisterRequest request) {
        if (userRepository.existsByEmail(request.getEmail())) {
            throw new UserAlreadyExistsException("User already exists with email: " + request.getEmail());
        }

        Role role = request.getRole() != null ? request.getRole() : Role.PILGRIM;

        User user = User.builder()
                .name(request.getName().trim())
                .email(request.getEmail().toLowerCase().trim())
                .password(passwordEncoder.encode(request.getPassword()))
                .role(role)
                .active(true)
                .build();

        User savedUser = userRepository.save(user);

        // If registered as a Pilgrim, auto-generate official Pilgrim registry entry and unique QR Pass
        if (role == Role.PILGRIM) {
            com.yatraflow.dto.pilgrim.CreatePilgrimRequest pilgrimReq = com.yatraflow.dto.pilgrim.CreatePilgrimRequest.builder()
                    .name(request.getName().trim())
                    .age(request.getAge() != null ? request.getAge() : 30)
                    .gender(request.getGender() != null ? request.getGender().trim().toUpperCase() : "MALE")
                    .phoneNumber(request.getPhoneNumber() != null ? request.getPhoneNumber().trim() : request.getEmail().trim())
                    .emergencyContact(request.getEmergencyContact() != null ? request.getEmergencyContact().trim() : "+91 9876543210")
                    .routeId(request.getRouteId() != null ? request.getRouteId() : 1L)
                    .build();
            pilgrimService.registerPilgrim(pilgrimReq);
        }

        String token = jwtService.generateToken(savedUser);

        return AuthResponse.builder()
                .token(token)
                .tokenType("Bearer")
                .expiresIn(jwtService.getExpirationMs() / 1000)
                .user(UserDto.fromEntity(savedUser))
                .build();
    }

    public AuthResponse login(LoginRequest request) {
        Authentication authentication = authenticationManager.authenticate(
                new UsernamePasswordAuthenticationToken(
                        request.getEmail().toLowerCase().trim(),
                        request.getPassword()
                )
        );

        User user = (User) authentication.getPrincipal();
        String token = jwtService.generateToken(user);

        return AuthResponse.builder()
                .token(token)
                .tokenType("Bearer")
                .expiresIn(jwtService.getExpirationMs() / 1000)
                .user(UserDto.fromEntity(user))
                .build();
    }

    @Transactional(readOnly = true)
    public UserDto getCurrentUser(String email) {
        User user = userRepository.findByEmail(email)
                .orElseThrow(() -> new ResourceNotFoundException("User not found with email: " + email));
        return UserDto.fromEntity(user);
    }
}
