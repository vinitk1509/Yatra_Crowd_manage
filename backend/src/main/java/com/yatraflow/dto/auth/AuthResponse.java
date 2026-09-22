package com.yatraflow.dto.auth;

import com.yatraflow.dto.user.UserDto;
import lombok.AllArgsConstructor;
import lombok.Builder;
import lombok.Data;
import lombok.NoArgsConstructor;

@Data
@Builder
@NoArgsConstructor
@AllArgsConstructor
public class AuthResponse {
    private String token;
    
    @Builder.Default
    private String tokenType = "Bearer";
    
    private long expiresIn;
    private UserDto user;
}
