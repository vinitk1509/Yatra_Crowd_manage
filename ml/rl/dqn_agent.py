"""
Deep Q-Network (DQN) Agent for Checkpoint Gate Control.
Optimizes discrete gating strategies across mountain checkpoints.
"""

import os
import random
from collections import deque
from typing import List, Tuple, Optional
import numpy as np
import torch
import torch.nn as nn
import torch.optim as optim

class QNetwork(nn.Module):
    def __init__(self, state_dim: int, num_checkpoints: int, num_actions_per_cp: int = 4):
        super(QNetwork, self).__init__()
        self.num_checkpoints = num_checkpoints
        self.num_actions_per_cp = num_actions_per_cp
        
        self.feature_net = nn.Sequential(
            nn.Linear(state_dim, 128),
            nn.LayerNorm(128),
            nn.ReLU(),
            nn.Linear(128, 128),
            nn.ReLU()
        )
        
        # Per-checkpoint Q-heads (Multi-branch discrete action output)
        self.q_heads = nn.ModuleList([
            nn.Sequential(
                nn.Linear(128, 64),
                nn.ReLU(),
                nn.Linear(64, num_actions_per_cp)
            )
            for _ in range(num_checkpoints)
        ])

    def forward(self, state: torch.Tensor) -> List[torch.Tensor]:
        features = self.feature_net(state)
        # Returns list of shape [batch, num_actions_per_cp] for each checkpoint
        return [head(features) for head in self.q_heads]

class ReplayBuffer:
    def __init__(self, capacity: int = 20000):
        self.buffer = deque(maxlen=capacity)

    def push(self, state: np.ndarray, action: List[int], reward: float, next_state: np.ndarray, done: bool):
        self.buffer.append((state, action, reward, next_state, done))

    def sample(self, batch_size: int):
        states, actions, rewards, next_states, dones = zip(*random.sample(self.buffer, batch_size))
        return (
            torch.tensor(np.array(states), dtype=torch.float32),
            torch.tensor(np.array(actions), dtype=torch.int64),
            torch.tensor(np.array(rewards), dtype=torch.float32).unsqueeze(1),
            torch.tensor(np.array(next_states), dtype=torch.float32),
            torch.tensor(np.array(dones), dtype=torch.float32).unsqueeze(1)
        )

    def __len__(self):
        return len(self.buffer)

class DQNAgent:
    def __init__(
        self,
        state_dim: int,
        num_checkpoints: int,
        lr: float = 5e-4,
        gamma: float = 0.98,
        epsilon_start: float = 1.0,
        epsilon_end: float = 0.05,
        epsilon_decay: float = 0.995,
        buffer_size: int = 20000,
        batch_size: int = 64,
        target_update_freq: int = 10
    ):
        self.state_dim = state_dim
        self.num_checkpoints = num_checkpoints
        self.gamma = gamma
        self.epsilon = epsilon_start
        self.epsilon_end = epsilon_end
        self.epsilon_decay = epsilon_decay
        self.batch_size = batch_size
        self.target_update_freq = target_update_freq
        
        self.q_net = QNetwork(state_dim, num_checkpoints)
        self.target_net = QNetwork(state_dim, num_checkpoints)
        self.target_net.load_state_dict(self.q_net.state_dict())
        self.target_net.eval()
        
        self.optimizer = optim.Adam(self.q_net.parameters(), lr=lr)
        self.loss_fn = nn.SmoothL1Loss() # Huber loss
        self.replay_buffer = ReplayBuffer(buffer_size)
        self.step_count = 0

    def select_action(self, state: np.ndarray, evaluate: bool = False) -> List[int]:
        if not evaluate and random.random() < self.epsilon:
            # Exploration: choose random action per checkpoint (0..3)
            return [random.randint(0, 3) for _ in range(self.num_checkpoints)]
        
        state_t = torch.tensor(state, dtype=torch.float32).unsqueeze(0)
        with torch.no_grad():
            q_values_list = self.q_net(state_t)
            # Greedily pick argmax for each checkpoint
            actions = [int(torch.argmax(q[0]).item()) for q in q_values_list]
        return actions

    def update(self) -> Optional[float]:
        if len(self.replay_buffer) < self.batch_size:
            return None
            
        states, actions, rewards, next_states, dones = self.replay_buffer.sample(self.batch_size)
        
        current_q_list = self.q_net(states)
        with torch.no_grad():
            target_q_list = self.target_net(next_states)
            
        total_loss = torch.tensor(0.0)
        for i in range(self.num_checkpoints):
            cp_actions = actions[:, i].unsqueeze(1)
            curr_q = current_q_list[i].gather(1, cp_actions)
            max_next_q = target_q_list[i].max(1)[0].unsqueeze(1)
            expected_q = rewards + (1.0 - dones) * self.gamma * max_next_q
            total_loss = total_loss + self.loss_fn(curr_q, expected_q)

        self.optimizer.zero_grad()
        total_loss.backward()
        nn.utils.clip_grad_norm_(self.q_net.parameters(), 1.0)
        self.optimizer.step()
        
        self.step_count += 1
        if self.step_count % self.target_update_freq == 0:
            self.target_net.load_state_dict(self.q_net.state_dict())
            
        self.epsilon = max(self.epsilon_end, self.epsilon * self.epsilon_decay)
        return float(total_loss.item())

    def save(self, filepath: str):
        os.makedirs(os.path.dirname(filepath), exist_ok=True)
        torch.save({
            "q_net": self.q_net.state_dict(),
            "epsilon": self.epsilon,
            "state_dim": self.state_dim,
            "num_checkpoints": self.num_checkpoints
        }, filepath)

    def load(self, filepath: str):
        checkpoint = torch.load(filepath, map_location=torch.device('cpu'), weights_only=False)
        self.q_net.load_state_dict(checkpoint["q_net"])
        self.target_net.load_state_dict(checkpoint["q_net"])
        self.epsilon = checkpoint.get("epsilon", self.epsilon_end)
