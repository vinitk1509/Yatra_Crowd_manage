"""
Proximal Policy Optimization (PPO) Continuous Flow Agent.
Optimizes continuous checkpoint release rates using Actor-Critic architecture.
"""

import os
from typing import List, Tuple, Dict, Optional
import numpy as np
import torch
import torch.nn as nn
import torch.optim as optim
from torch.distributions import Normal

class ActorCritic(nn.Module):
    def __init__(self, state_dim: int, action_dim: int):
        super(ActorCritic, self).__init__()
        
        # Shared feature representation
        self.backbone = nn.Sequential(
            nn.Linear(state_dim, 128),
            nn.LayerNorm(128),
            nn.Tanh(),
            nn.Linear(128, 128),
            nn.Tanh()
        )
        
        # Actor Head (Continuous action means)
        self.actor_mean = nn.Sequential(
            nn.Linear(128, 64),
            nn.Tanh(),
            nn.Linear(64, action_dim),
            nn.Tanh() # Bounds mean between [-1.0, 1.0]
        )
        self.actor_log_std = nn.Parameter(torch.zeros(1, action_dim) - 0.5)
        
        # Critic Head (State value V(s))
        self.critic = nn.Sequential(
            nn.Linear(128, 64),
            nn.Tanh(),
            nn.Linear(64, 1)
        )

    def forward(self, state: torch.Tensor):
        features = self.backbone(state)
        mean = self.actor_mean(features)
        std = torch.exp(self.actor_log_std.expand_as(mean))
        value = self.critic(features)
        return mean, std, value

    def get_action(self, state: torch.Tensor, deterministic: bool = False):
        mean, std, value = self.forward(state)
        dist = Normal(mean, std)
        if deterministic:
            action = mean
        else:
            action = dist.sample()
        action_clipped = torch.clamp(action, -1.0, 1.0)
        log_prob = dist.log_prob(action_clipped).sum(axis=-1)
        return action_clipped, log_prob, value

    def evaluate_actions(self, state: torch.Tensor, action: torch.Tensor):
        mean, std, value = self.forward(state)
        dist = Normal(mean, std)
        log_prob = dist.log_prob(action).sum(axis=-1)
        entropy = dist.entropy().sum(axis=-1)
        return log_prob, value.squeeze(-1), entropy

class PPOAgent:
    def __init__(
        self,
        state_dim: int,
        action_dim: int,
        lr: float = 3e-4,
        gamma: float = 0.99,
        gae_lambda: float = 0.95,
        clip_eps: float = 0.2,
        value_coef: float = 0.5,
        entropy_coef: float = 0.01,
        ppo_epochs: int = 10,
        mini_batch_size: int = 64
    ):
        self.state_dim = state_dim
        self.action_dim = action_dim
        self.gamma = gamma
        self.gae_lambda = gae_lambda
        self.clip_eps = clip_eps
        self.value_coef = value_coef
        self.entropy_coef = entropy_coef
        self.ppo_epochs = ppo_epochs
        self.mini_batch_size = mini_batch_size
        
        self.ac_net = ActorCritic(state_dim, action_dim)
        self.optimizer = optim.Adam(self.ac_net.parameters(), lr=lr)

    def select_action(self, state: np.ndarray, evaluate: bool = False) -> Tuple[np.ndarray, float, float]:
        state_t = torch.tensor(state, dtype=torch.float32).unsqueeze(0)
        with torch.no_grad():
            action, log_prob, value = self.ac_net.get_action(state_t, deterministic=evaluate)
        return action[0].cpu().numpy(), float(log_prob.item()), float(value.item())

    def update(
        self,
        states: np.ndarray,
        actions: np.ndarray,
        old_log_probs: np.ndarray,
        rewards: np.ndarray,
        dones: np.ndarray,
        values: np.ndarray
    ) -> Dict[str, float]:
        # Compute Generalized Advantage Estimation (GAE)
        advantages = np.zeros_like(rewards, dtype=np.float32)
        returns = np.zeros_like(rewards, dtype=np.float32)
        gae = 0.0
        
        for t in reversed(range(len(rewards))):
            if t == len(rewards) - 1:
                next_val = 0.0
            else:
                next_val = values[t + 1]
            delta = rewards[t] + self.gamma * next_val * (1.0 - dones[t]) - values[t]
            gae = delta + self.gamma * self.gae_lambda * (1.0 - dones[t]) * gae
            advantages[t] = gae
            returns[t] = advantages[t] + values[t]

        # Normalize advantages
        advantages = (advantages - np.mean(advantages)) / (np.std(advantages) + 1e-8)

        states_t = torch.tensor(states, dtype=torch.float32)
        actions_t = torch.tensor(actions, dtype=torch.float32)
        old_log_probs_t = torch.tensor(old_log_probs, dtype=torch.float32)
        returns_t = torch.tensor(returns, dtype=torch.float32)
        advantages_t = torch.tensor(advantages, dtype=torch.float32)

        dataset_size = len(states)
        policy_losses, value_losses = [], []

        for _ in range(self.ppo_epochs):
            indices = np.random.permutation(dataset_size)
            for start in range(0, dataset_size, self.mini_batch_size):
                end = start + self.mini_batch_size
                mb_idx = indices[start:end]

                mb_states = states_t[mb_idx]
                mb_actions = actions_t[mb_idx]
                mb_old_log_probs = old_log_probs_t[mb_idx]
                mb_returns = returns_t[mb_idx]
                mb_advantages = advantages_t[mb_idx]

                new_log_probs, new_values, entropy = self.ac_net.evaluate_actions(mb_states, mb_actions)

                # Ratio: r_t(theta) = exp(log_pi_theta - log_pi_old)
                ratios = torch.exp(new_log_probs - mb_old_log_probs)

                # Clipped surrogate objective
                surr1 = ratios * mb_advantages
                surr2 = torch.clamp(ratios, 1.0 - self.clip_eps, 1.0 + self.clip_eps) * mb_advantages
                policy_loss = -torch.min(surr1, surr2).mean()

                # Value loss (MSE)
                value_loss = nn.functional.mse_loss(new_values, mb_returns)

                # Total loss
                total_loss = policy_loss + self.value_coef * value_loss - self.entropy_coef * entropy.mean()

                self.optimizer.zero_grad()
                total_loss.backward()
                nn.utils.clip_grad_norm_(self.ac_net.parameters(), 0.5)
                self.optimizer.step()

                policy_losses.append(policy_loss.item())
                value_losses.append(value_loss.item())

        return {
            "policy_loss": float(np.mean(policy_losses)),
            "value_loss": float(np.mean(value_losses))
        }

    def save(self, filepath: str):
        os.makedirs(os.path.dirname(filepath), exist_ok=True)
        torch.save({
            "ac_net": self.ac_net.state_dict(),
            "state_dim": self.state_dim,
            "action_dim": self.action_dim
        }, filepath)

    def load(self, filepath: str):
        checkpoint = torch.load(filepath, map_location=torch.device('cpu'), weights_only=False)
        self.ac_net.load_state_dict(checkpoint["ac_net"])
