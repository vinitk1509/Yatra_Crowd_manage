"""
Reinforcement Learning Training Pipeline for YatraFlow Digital Twin.
Trains PPO and DQN models on Baltal & Pahalgam simulation corridors.
"""

import os
import sys
import time
import numpy as np

# Add project root and current dir to path
PROJECT_ROOT = os.path.dirname(os.path.dirname(os.path.dirname(os.path.abspath(__file__))))
if PROJECT_ROOT not in sys.path:
    sys.path.insert(0, PROJECT_ROOT)

from ml.rl.yatra_rl_env import YatraCorridorEnv
from ml.rl.dqn_agent import DQNAgent
from ml.rl.ppo_agent import PPOAgent

MODEL_DIR = os.path.join(os.path.dirname(os.path.dirname(os.path.abspath(__file__))), "models")

def train_dqn(corridor="BALTAL", num_episodes=150):
    print(f"\n=======================================================")
    print(f" [TRAINING] DQN (Deep Q-Network) on {corridor} Corridor")
    print(f"=======================================================")
    
    env = YatraCorridorEnv(corridor=corridor, max_steps=48, arrival_rate_per_step=350, seed=42)
    agent = DQNAgent(state_dim=env.obs_dim, num_checkpoints=env.num_checkpoints, lr=7e-4)
    
    rewards_history = []
    
    start_t = time.time()
    for ep in range(1, num_episodes + 1):
        state = env.reset(seed=42 + ep)
        ep_reward = 0.0
        
        while True:
            actions = agent.select_action(state, evaluate=False)
            next_state, reward, done, info = env.step_discrete(actions)
            agent.replay_buffer.push(state, actions, reward, next_state, done)
            agent.update()
            
            state = next_state
            ep_reward += reward
            if done:
                break
                
        rewards_history.append(ep_reward)
        if ep % 25 == 0 or ep == num_episodes:
            avg_rew = np.mean(rewards_history[-25:])
            print(f" Episode {ep:3d}/{num_episodes} | Avg Reward (Last 25): {avg_rew:+7.2f} | Epsilon: {agent.epsilon:.3f} | Throughput: {info['cumulative_throughput']} | Violations: {info['safety_violations']}")

    elapsed = time.time() - start_t
    save_path = os.path.join(MODEL_DIR, f"dqn_{corridor.lower()}_policy.pt")
    agent.save(save_path)
    print(f" -> DQN Model trained in {elapsed:.1f}s. Saved to: {save_path}")
    return agent

def train_ppo(corridor="BALTAL", num_episodes=150):
    print(f"\n=======================================================")
    print(f" [TRAINING] PPO (Proximal Policy Optimization) on {corridor}")
    print(f"=======================================================")
    
    env = YatraCorridorEnv(corridor=corridor, max_steps=48, arrival_rate_per_step=350, seed=42)
    agent = PPOAgent(state_dim=env.obs_dim, action_dim=env.action_dim, lr=4e-4)
    
    rewards_history = []
    
    start_t = time.time()
    for ep in range(1, num_episodes + 1):
        state = env.reset(seed=100 + ep)
        
        states, actions, log_probs, rewards, dones, values = [], [], [], [], [], []
        ep_reward = 0.0
        
        while True:
            action, log_prob, value = agent.select_action(state, evaluate=False)
            next_state, reward, done, info = env.step_continuous(action)
            
            states.append(state)
            actions.append(action)
            log_probs.append(log_prob)
            rewards.append(reward)
            dones.append(done)
            values.append(value)
            
            state = next_state
            ep_reward += reward
            if done:
                break
                
        # Perform PPO policy and value network update
        agent.update(
            np.array(states, dtype=np.float32),
            np.array(actions, dtype=np.float32),
            np.array(log_probs, dtype=np.float32),
            np.array(rewards, dtype=np.float32),
            np.array(dones, dtype=np.float32),
            np.array(values, dtype=np.float32)
        )
        
        rewards_history.append(ep_reward)
        if ep % 25 == 0 or ep == num_episodes:
            avg_rew = np.mean(rewards_history[-25:])
            print(f" Episode {ep:3d}/{num_episodes} | Avg Reward (Last 25): {avg_rew:+7.2f} | Throughput: {info['cumulative_throughput']} | Violations: {info['safety_violations']}")

    elapsed = time.time() - start_t
    save_path = os.path.join(MODEL_DIR, f"ppo_{corridor.lower()}_policy.pt")
    agent.save(save_path)
    print(f" -> PPO Model trained in {elapsed:.1f}s. Saved to: {save_path}")
    return agent

if __name__ == "__main__":
    os.makedirs(MODEL_DIR, exist_ok=True)
    print("=== STARTING YATRAFLOW REINFORCEMENT LEARNING TRAINING ===")
    
    # Train DQN and PPO on Baltal corridor
    train_dqn("BALTAL", num_episodes=100)
    train_ppo("BALTAL", num_episodes=100)

    # Train DQN and PPO on Pahalgam corridor
    train_dqn("PAHALGAM", num_episodes=100)
    train_ppo("PAHALGAM", num_episodes=100)
    
    print("\n[SUCCESS] Reinforcement Learning Training Pipeline Completed Successfully!")
