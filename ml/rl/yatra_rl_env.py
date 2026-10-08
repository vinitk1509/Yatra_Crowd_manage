"""
YatraCorridorEnv: Markov Decision Process (MDP) Simulation Environment
for Amarnath Yatra Crowd Management (Baltal and Pahalgam corridors).

Observation Space:
- Segment densities (normalized 0.0 - 1.0)
- Checkpoint queue lengths (normalized to capacity)
- Checkpoint release ratios (0.0 - 2.0)
- Weather severity factor (0.0 = clear, 1.0 = storm)
- Active trail disruption / closure mask

Action Space:
- Continuous (PPO): release rate multiplier for each checkpoint in [-1.0, 1.0] -> maps to [0.2x, 1.8x]
- Discrete (DQN): per-checkpoint action in {0: HOLD (0.1x), 1: THROTTLE (0.6x), 2: NOMINAL (1.0x), 3: EXPEDITE (1.4x)}

Reward Function:
  R = + w1 * (Throughput) - w2 * (Avg Queue Length) - w3 * (Overcapacity Penalties) - w4 * (Action Churn)
"""

import numpy as np
from typing import Dict, List, Tuple, Any, Optional

CORRIDORS = {
    "BALTAL": {
        "checkpoints": ["CP-01 (Baltal Base)", "CP-02 (Domel)", "CP-03 (Barari Marg)", "CP-04 (Sangam)", "CP-05 (Holy Cave)"],
        "capacities": [4050, 4580, 5080, 4280, 4780],
        "distances_km": [2.8, 4.5, 3.8, 3.2],
        "slopes": [0.06, 0.14, 0.12, 0.09], # Elevation steepness
        "base_free_speeds": [3.2, 2.8, 2.2, 2.6, 2.1]
    },
    "PAHALGAM": {
        "checkpoints": ["PA-01 (Chandanwari)", "PA-02 (Pissu Top)", "PA-03 (Sheshnag)", "PA-04 (Mahagunas Pass)", "PA-05 (Panchtarni)", "PA-06 (Holy Cave)"],
        "capacities": [5500, 4200, 4800, 3600, 5200, 4780],
        "distances_km": [3.5, 9.0, 4.5, 6.0, 6.0],
        "slopes": [0.18, 0.08, 0.22, 0.07, 0.08],
        "base_free_speeds": [2.9, 2.4, 1.8, 2.6, 2.2, 2.0]
    }
}

WEATHER_SPEED_FACTORS = {
    "CLEAR": 1.0,
    "RAIN": 0.75,
    "FOG": 0.65,
    "SNOW": 0.50,
    "STORM": 0.40
}

class YatraCorridorEnv:
    def __init__(
        self,
        corridor: str = "BALTAL",
        max_steps: int = 48, # 48 steps * 15 min = 12 hours
        arrival_rate_per_step: int = 350,
        weather: str = "CLEAR",
        seed: Optional[int] = 42
    ):
        self.corridor_name = corridor.upper() if corridor.upper() in CORRIDORS else "BALTAL"
        self.config = CORRIDORS[self.corridor_name]
        self.num_checkpoints = len(self.config["checkpoints"])
        self.num_segments = self.num_checkpoints - 1
        
        self.max_steps = max_steps
        self.base_arrival_rate = arrival_rate_per_step
        self.weather = weather
        self.weather_factor = WEATHER_SPEED_FACTORS.get(weather.upper(), 1.0)
        
        self.rng = np.random.RandomState(seed)
        
        # State dimensions:
        # segment_densities (num_segments) + queue_ratios (num_checkpoints) + weather (1) + disruptions (num_segments)
        self.obs_dim = self.num_segments + self.num_checkpoints + 1 + self.num_segments
        self.discrete_action_dim = 4 ** self.num_checkpoints # or per-checkpoint 4
        self.action_dim = self.num_checkpoints
        
        # Interventions
        self.trail_closures: Dict[int, int] = {} # segment_idx -> steps_remaining
        self.gate_throttles: Dict[int, float] = {} # cp_idx -> factor
        
        self.reset(seed)

    def reset(self, seed: Optional[int] = None) -> np.ndarray:
        if seed is not None:
            self.rng = np.random.RandomState(seed)
            
        self.current_step = 0
        self.segment_crowds = np.zeros(self.num_segments, dtype=np.float32)
        # Seed initial distributed crowd
        for i in range(self.num_segments):
            self.segment_crowds[i] = self.rng.uniform(100, 400)
            
        self.checkpoint_queues = np.zeros(self.num_checkpoints, dtype=np.float32)
        self.checkpoint_queues[0] = self.rng.uniform(150, 300)
        
        self.cumulative_throughput = 0
        self.safety_violations = 0
        self.total_wait_minutes = 0.0
        
        return self._get_obs()

    def set_intervention(self, trail_closure_segment: Optional[int] = None, closure_steps: int = 12,
                         throttled_checkpoint: Optional[int] = None, throttle_ratio: float = 0.5):
        if trail_closure_segment is not None and 0 <= trail_closure_segment < self.num_segments:
            self.trail_closures[trail_closure_segment] = closure_steps
        if throttled_checkpoint is not None and 0 <= throttled_checkpoint < self.num_checkpoints:
            self.gate_throttles[throttled_checkpoint] = throttle_ratio

    def _get_obs(self) -> np.ndarray:
        capacities = np.array(self.config["capacities"], dtype=np.float32)
        segment_capacities = (capacities[:-1] + capacities[1:]) / 2.0
        
        norm_segment_densities = np.clip(self.segment_crowds / segment_capacities, 0.0, 2.0)
        norm_queues = np.clip(self.checkpoint_queues / capacities, 0.0, 2.0)
        weather_feat = np.array([1.0 - self.weather_factor], dtype=np.float32)
        
        disruption_feat = np.zeros(self.num_segments, dtype=np.float32)
        for seg_idx, remaining in self.trail_closures.items():
            if remaining > 0:
                disruption_feat[seg_idx] = 1.0
                
        obs = np.concatenate([norm_segment_densities, norm_queues, weather_feat, disruption_feat]).astype(np.float32)
        return obs

    def step_continuous(self, action: np.ndarray) -> Tuple[np.ndarray, float, bool, Dict[str, Any]]:
        """Action is array of shape (num_checkpoints,) with values in [-1.0, 1.0]"""
        # Map [-1.0, 1.0] -> release multiplier [0.2, 1.8]
        release_multipliers = 1.0 + 0.8 * np.clip(action, -1.0, 1.0)
        return self._execute_step(release_multipliers)

    def step_discrete(self, action_indices: List[int]) -> Tuple[np.ndarray, float, bool, Dict[str, Any]]:
        """Action indices per checkpoint: 0: 0.1x, 1: 0.6x, 2: 1.0x, 3: 1.4x"""
        ACTION_MAP = [0.1, 0.6, 1.0, 1.4]
        multipliers = np.array([ACTION_MAP[min(max(a, 0), 3)] for a in action_indices], dtype=np.float32)
        return self._execute_step(multipliers)

    def _execute_step(self, release_multipliers: np.ndarray) -> Tuple[np.ndarray, float, bool, Dict[str, Any]]:
        self.current_step += 1
        capacities = np.array(self.config["capacities"], dtype=np.float32)
        
        # Inflow to Base Camp (CheckPoint 0)
        surge_factor = 1.0 + 0.4 * np.sin(self.current_step * np.pi / 12) # Daily diurnal surge
        inflow = int(self.base_arrival_rate * surge_factor * self.rng.uniform(0.85, 1.15))
        self.checkpoint_queues[0] += inflow
        
        step_throughput = 0
        step_violations = 0
        
        # Apply external throttle interventions
        for cp_idx, throttle in self.gate_throttles.items():
            release_multipliers[cp_idx] *= throttle
            
        # Process each checkpoint release and segment flow
        for i in range(self.num_checkpoints):
            nominal_turnstile_rate = capacities[i] * 0.25 # Max 15m turnstile throughput
            actual_release_cap = nominal_turnstile_rate * release_multipliers[i]
            
            # Don't release if next segment is closed or severely jammed
            if i < self.num_segments:
                if self.trail_closures.get(i, 0) > 0:
                    actual_release_cap = 0.0 # Complete closure
                else:
                    downstream_density = self.segment_crowds[i] / ((capacities[i] + capacities[i+1]) / 2.0)
                    if downstream_density > 1.2:
                        actual_release_cap *= 0.3 # Downstream backpressure
                        
            released = min(self.checkpoint_queues[i], actual_release_cap)
            self.checkpoint_queues[i] -= released
            
            if i < self.num_segments:
                self.segment_crowds[i] += released
            else:
                # Reached Holy Cave (Final Destination)
                step_throughput += released
                self.cumulative_throughput += released

        # Segment movement dynamics (Greenshields speed-density relationship)
        for s in range(self.num_segments):
            seg_cap = (capacities[s] + capacities[s+1]) / 2.0
            density = self.segment_crowds[s] / seg_cap
            
            if density >= 0.90:
                step_violations += 1
                self.safety_violations += 1
                
            # Physics: speed = base_speed * (1 - density^1.4) * weather * slope_drag
            base_v = self.config["base_free_speeds"][s]
            slope_drag = 1.0 - 1.2 * self.config["slopes"][s]
            effective_v = base_v * max(0.1, (1.0 - (density ** 1.4))) * self.weather_factor * max(0.4, slope_drag)
            
            dist = self.config["distances_km"][s]
            traversal_fraction = min(0.95, (effective_v * 0.25) / dist) # 15 min = 0.25h
            
            if self.trail_closures.get(s, 0) > 0:
                traversal_fraction = 0.0 # Blocked
                
            transferred = self.segment_crowds[s] * traversal_fraction
            self.segment_crowds[s] -= transferred
            self.checkpoint_queues[s+1] += transferred

        # Decrement closure timers
        for s in list(self.trail_closures.keys()):
            if self.trail_closures[s] > 0:
                self.trail_closures[s] -= 1

        total_queue = np.sum(self.checkpoint_queues)
        self.total_wait_minutes += (total_queue / max(1, step_throughput + 50)) * 15.0
        
        # Reward calculation:
        # +1.0 per 100 pilgrims delivered to holy cave
        # -0.05 per 100 queue buildup
        # -2.5 per threshold violation
        reward = (step_throughput / 100.0) - (total_queue / 500.0) - (step_violations * 2.5)
        
        done = self.current_step >= self.max_steps
        obs = self._get_obs()
        
        info = {
            "step": self.current_step,
            "step_throughput": step_throughput,
            "cumulative_throughput": self.cumulative_throughput,
            "total_queue": float(total_queue),
            "safety_violations": self.safety_violations,
            "avg_wait_minutes": float(self.total_wait_minutes / max(1, self.current_step)),
            "segment_crowds": self.segment_crowds.tolist(),
            "checkpoint_queues": self.checkpoint_queues.tolist()
        }
        
        return obs, float(reward), done, info
