package com.yatraflow.controller;

import com.yatraflow.dto.common.ApiResponse;
import com.yatraflow.dto.user.UserDto;
import com.yatraflow.entity.Role;
import com.yatraflow.service.UserService;
import lombok.RequiredArgsConstructor;
import org.springframework.http.ResponseEntity;
import org.springframework.security.access.prepost.PreAuthorize;
import org.springframework.web.bind.annotation.*;

import java.util.List;

@RestController
@RequestMapping("/api/admin/users")
@RequiredArgsConstructor
@PreAuthorize("hasRole('ADMIN')")
public class UserController {

    private final UserService userService;

    @GetMapping
    public ResponseEntity<ApiResponse<List<UserDto>>> getAllUsers(
            @RequestParam(required = false) Role role
    ) {
        List<UserDto> users = (role != null) 
                ? userService.getUsersByRole(role) 
                : userService.getAllUsers();
        return ResponseEntity.ok(ApiResponse.success("Users retrieved successfully", users));
    }

    @GetMapping("/{id}")
    public ResponseEntity<ApiResponse<UserDto>> getUserById(@PathVariable Long id) {
        UserDto user = userService.getUserById(id);
        return ResponseEntity.ok(ApiResponse.success("User retrieved successfully", user));
    }

    @PatchMapping("/{id}/status")
    public ResponseEntity<ApiResponse<UserDto>> updateUserStatus(
            @PathVariable Long id,
            @RequestParam boolean active
    ) {
        UserDto user = userService.updateUserStatus(id, active);
        return ResponseEntity.ok(ApiResponse.success("User status updated successfully", user));
    }
}
