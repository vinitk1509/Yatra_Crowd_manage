"""
Policy Evaluation & Benchmark Comparison Script.
Runs 50 benchmark episodes comparing:
1. Policy A: Baseline Static Rules
2. Policy B: PPO (Proximal Policy Optimization) Neural Policy
3. Policy C: DQN (Deep Q-Network) Discrete Policy
"""

import os
import sys
import numpy as np

PROJECT_ROOT = os.path.dirname(os.path.dirname(os.path.dirname(os.path.abspath(__file__))))
if PROJECT_ROOT not in sys.path:
    sys.path.insert(0, PROJECT_ROOT)

from ml.rl.yatra_rl_env import YatraCorridorEnv
from ml.rl.dqn_agent import DQNAgent
from ml.rl.ppo_agent import PPOAgent

MODEL_DIR = os.path.join(os.path.dirname(os.path.dirname(os.path.abspath(__file__))), "models")

def run_baseline(env: YatraCorridorEnv):
    """Simple threshold rule baseline: if downstream queue > 75%, throttle gate to 0.4x"""
    obs = env.reset()
    total_reward = 0.0
    while True:
        # Static baseline logic
        actions = []
        for q in env.checkpoint_queues:
            if q > 1200:
                actions.append(0) # HOLD
            elif q > 700:
                actions.append(1) # THROTTLE
            else:
                actions.append(2) # NOMINAL
        next_obs, r, done, info = env.step_discrete(actions)
        total_reward += r
        if done:
            break
    return total_reward, info

def evaluate_all(corridor="BALTAL", num_eval_episodes=30):
    print(f"\n=======================================================")
    print(f" BENCHMARK EVALUATION ({num_eval_episodes} Episodes on {corridor})")
    print(f"=======================================================")

    env = YatraCorridorEnv(corridor=corridor, max_steps=48, arrival_rate_per_step=380, seed=999)
    
    # Load DQN
    dqn = DQNAgent(state_dim=env.obs_dim, num_checkpoints=env.num_checkpoints)
    dqn_path = os.path.join(MODEL_DIR, f"dqn_{corridor.lower()}_policy.pt")
    if os.path.exists(dqn_path):
        dqn.load(dqn_path)
        has_dqn = True
    else:
        has_dqn = False

    # Load PPO
    ppo = PPOAgent(state_dim=env.obs_dim, action_dim=env.action_dim)
    ppo_path = os.path.join(MODEL_DIR, f"ppo_{corridor.lower()}_policy.pt")
    if os.path.exists(ppo_path):
        ppo.load(ppo_path)
        has_ppo = True
    else:
        has_ppo = False

    results = {
        "Baseline": {"rewards": [], "throughputs": [], "violations": [], "wait_times": []},
        "DQN": {"rewards": [], "throughputs": [], "violations": [], "wait_times": []},
        "PPO": {"rewards": [], "throughputs": [], "violations": [], "wait_times": []},
    }

    for ep in range(num_eval_episodes):
        seed = 1000 + ep
        
        # 1. Baseline
        env.reset(seed=seed)
        r_base, info_base = run_baseline(env)
        results["Baseline"]["rewards"].append(r_base)
        results["Baseline"]["throughputs"].append(info_base["cumulative_throughput"])
        results["Baseline"]["violations"].append(info_base["safety_violations"])
        results["Baseline"]["wait_times"].append(info_base["avg_wait_minutes"])

        # 2. DQN
        if has_dqn:
            state = env.reset(seed=seed)
            r_dqn = 0.0
            while True:
                actions = dqn.select_action(state, evaluate=True)
                next_state, r, done, info_dqn = env.step_discrete(actions)
                r_dqn += r
                state = next_state
                if done:
                    break
            results["DQN"]["rewards"].append(r_dqn)
            results["DQN"]["throughputs"].append(info_dqn["cumulative_throughput"])
            results["DQN"]["violations"].append(info_dqn["safety_violations"])
            results["DQN"]["wait_times"].append(info_dqn["avg_wait_minutes"])

        # 3. PPO
        if has_ppo:
            state = env.reset(seed=seed)
            r_ppo = 0.0
            while True:
                action, _, _ = ppo.select_action(state, evaluate=True)
                next_state, r, done, info_ppo = env.step_continuous(action)
                r_ppo += r
                state = next_state
                if done:
                    break
            results["PPO"]["rewards"].append(r_ppo)
            results["PPO"]["throughputs"].append(info_ppo["cumulative_throughput"])
            results["PPO"]["violations"].append(info_ppo["safety_violations"])
            results["PPO"]["wait_times"].append(info_ppo["avg_wait_minutes"])

    print(f"\n{'POLICY':<15} | {'AVG REWARD':<12} | {'THROUGHPUT':<12} | {'VIOLATIONS':<12} | {'AVG WAIT (MIN)':<15}")
    print("-" * 75)
    for pol_name in ["Baseline", "DQN", "PPO"]:
        data = results[pol_name]
        if len(data["rewards"]) > 0:
            print(f"{pol_name:<15} | {np.mean(data['rewards']):+10.2f}   | {int(np.mean(data['throughputs'])):<12d} | {np.mean(data['violations']):<12.1f} | {np.mean(data['wait_times']):<15.1f}")
    print("-" * 75)

if __name__ == "__main__":
    evaluate_all("BALTAL", num_eval_episodes=20)
