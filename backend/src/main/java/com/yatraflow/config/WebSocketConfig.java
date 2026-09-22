package com.yatraflow.config;

import org.springframework.context.annotation.Configuration;
import org.springframework.messaging.simp.config.MessageBrokerRegistry;
import org.springframework.web.socket.config.annotation.EnableWebSocketMessageBroker;
import org.springframework.web.socket.config.annotation.StompEndpointRegistry;
import org.springframework.web.socket.config.annotation.WebSocketMessageBrokerConfigurer;

@Configuration
@EnableWebSocketMessageBroker
public class WebSocketConfig implements WebSocketMessageBrokerConfigurer {

    @Override
    public void configureMessageBroker(MessageBrokerRegistry config) {
        // Enable a simple in-memory message broker for subscription destinations
        config.enableSimpleBroker("/topic", "/queue");
        // Prefix for messages originating from clients bound for @MessageMapping methods
        config.setApplicationDestinationPrefixes("/app");
    }

    @Override
    public void registerStompEndpoints(StompEndpointRegistry registry) {
        // Direct native WebSocket endpoint
        registry.addEndpoint("/ws-yatra")
                .setAllowedOriginPatterns("*");

        // SockJS fallback endpoint for browsers/proxies lacking direct WS support
        registry.addEndpoint("/ws-yatra")
                .setAllowedOriginPatterns("*")
                .withSockJS();
    }
}
