"""
Deterministic/Stochastic Physical Crowd Flow Simulator for Amarnath Yatra Corridor.
Generates multi-checkpoint, multi-scenario time-series data obeying physical conservation laws.
"""

import math
import numpy as np
import pandas as pd
from datetime import datetime, timedelta
from typing import List, Dict, Any

from config import (
    RANDOM_SEED,
    CHECKPOINTS,
    SCENARIOS,
    INTERVAL_MINUTES,
    TOTAL_DAYS,
    MIN_SPEED_KMH,
    MAX_SPEED_KMH
)


class SyntheticCrowdDataGenerator:

    def __init__(self, seed: int = RANDOM_SEED):
        self.seed = seed
        self.rng = np.random.RandomState(seed)

    def generate_dataset(self, days: int = TOTAL_DAYS, interval_minutes: int = INTERVAL_MINUTES) -> pd.DataFrame:
        start_time = datetime(2026, 6, 1, 0, 0, 0)
        total_steps_per_day = (24 * 60) // interval_minutes
        total_steps = days * total_steps_per_day

        records: List[Dict[str, Any]] = []

        # Transit queue buffers between checkpoints: buffer[from_cp_idx][to_cp_idx] = list of (arrival_step, count)
        transit_queues: Dict[int, List[Dict[str, Any]]] = {i: [] for i in range(len(CHECKPOINTS))}

        # State tracking per checkpoint
        cp_states = {
            cp["id"]: {
                "crowd": int(cp["capacity"] * self.rng.uniform(0.10, 0.18)),
                "capacity": cp["capacity"],
                "base_speed": cp["base_free_speed"],
                "dist": cp["distanceFromPrevKm"],
                "code": cp["code"],
                "name": cp["name"],
                "id": cp["id"]
            }
            for cp in CHECKPOINTS
        }

        for step in range(total_steps):
            current_time = start_time + timedelta(minutes=step * interval_minutes)
            day_idx = step // total_steps_per_day
            step_in_day = step % total_steps_per_day
            hour_of_day = (step_in_day * interval_minutes) / 60.0
            day_of_week = current_time.isoweekday()

            # Assign a scenario to each day
            scenario = SCENARIOS[day_idx % len(SCENARIOS)]

            # Weather determination
            weather_condition = "CLEAR"
            weather_speed_penalty = 0.0
            if scenario == "WEATHER_SLOWDOWN" or (self.rng.rand() < 0.12):
                weather_condition = "RAIN" if self.rng.rand() < 0.6 else "SLEET"
                weather_speed_penalty = 0.35

            for idx, cp in enumerate(CHECKPOINTS):
                cp_id = cp["id"]
                state = cp_states[cp_id]
                prev_crowd = state["crowd"]
                capacity = state["capacity"]

                # 1. Calculate Base Inflow Rate
                base_inflow = self._calculate_inflow(
                    cp_idx=idx,
                    hour_of_day=hour_of_day,
                    scenario=scenario,
                    transit_queues=transit_queues,
                    current_step=step,
                    capacity=capacity
                )

                # Add controlled stochastic Poisson noise
                inflow = max(0, int(np.round(base_inflow + self.rng.normal(0, max(1.5, base_inflow * 0.08)))))

                # 2. Speed Calculation via Greenshields model with congestion drag
                current_temp_crowd = prev_crowd + inflow
                temp_occupancy = min(100.0, (current_temp_crowd / capacity) * 100.0)

                # Non-linear speed degradation as occupancy approaches and exceeds 70%
                congestion_factor = (temp_occupancy / 100.0) ** 1.6
                speed_drag = (cp["base_free_speed"] * congestion_factor)
                raw_speed = cp["base_free_speed"] - speed_drag - (cp["base_free_speed"] * weather_speed_penalty)
                
                # Scenario adjustments
                if scenario == "SLOW_MOVEMENT" and cp["code"] == "CP-03":
                    raw_speed *= 0.60
                elif scenario == "BOTTLENECK" and cp["code"] == "CP-03" and (10.0 <= hour_of_day <= 15.0):
                    raw_speed *= 0.50

                raw_speed += self.rng.normal(0, 0.08)
                speed = max(MIN_SPEED_KMH, min(MAX_SPEED_KMH, round(raw_speed, 2)))

                # 3. Transit Time (minutes to traverse segment to this checkpoint)
                dist = cp["distanceFromPrevKm"]
                if dist > 0:
                    transit_time = round((dist / speed) * 60.0, 1)
                else:
                    transit_time = 0.0

                # 4. Outflow Calculation
                # Outflow constrained by physical processing capacity and current crowd
                max_release_rate = int(capacity * 0.035)  # Max gate release capacity per interval
                if scenario == "CHECKPOINT_RESTRICTION" and cp["code"] == "CP-02" and (9.0 <= hour_of_day <= 14.0):
                    max_release_rate = int(max_release_rate * 0.40)  # Restricted throughput

                target_outflow = int(current_temp_crowd * 0.040)
                if scenario == "CROWD_BUILDUP" and cp["code"] == "CP-03":
                    target_outflow = int(target_outflow * 0.55)  # Inflow > Outflow

                outflow = max(0, min(current_temp_crowd, min(max_release_rate, target_outflow)))
                outflow = int(np.round(outflow + self.rng.normal(0, max(1.0, outflow * 0.05))))
                outflow = max(0, min(current_temp_crowd, outflow))

                # 5. Conservation of Crowd State
                new_crowd = max(0, prev_crowd + inflow - outflow)
                state["crowd"] = new_crowd

                # 6. Propagate Outflow into Next Checkpoint's Transit Queue
                if idx < len(CHECKPOINTS) - 1:
                    next_cp_dist = CHECKPOINTS[idx + 1]["distanceFromPrevKm"]
                    next_speed = max(0.5, speed)
                    delay_minutes = (next_cp_dist / next_speed) * 60.0
                    delay_steps = max(1, int(round(delay_minutes / interval_minutes)))
                    transit_queues[idx + 1].append({
                        "arrival_step": step + delay_steps,
                        "count": outflow
                    })

                # 7. Occupancy & Net Flow
                occupancy_pct = round(min(100.0, (new_crowd / capacity) * 100.0), 1)
                net_flow = inflow - outflow

                # In-transit count moving towards this checkpoint
                active_in_transit = sum(item["count"] for item in transit_queues[idx] if item["arrival_step"] > step)

                # Operational status
                if occupancy_pct >= 92.0:
                    status = "CRITICAL"
                elif occupancy_pct >= 85.0:
                    status = "HIGH"
                elif occupancy_pct >= 70.0:
                    status = "WATCH"
                else:
                    status = "NORMAL"

                is_bottleneck = (occupancy_pct >= 70.0) and (net_flow > 0) and (speed < 2.0)

                records.append({
                    "timestamp": current_time.isoformat(),
                    "checkpointId": cp["id"],
                    "checkpointCode": cp["code"],
                    "checkpointName": cp["name"],
                    "routeId": 1,
                    "routeCode": "RT-BALTAL" if idx < 3 else "RT-PAHALGAM",
                    "capacity": capacity,
                    "currentCrowd": new_crowd,
                    "inflow": inflow,
                    "outflow": outflow,
                    "netFlow": net_flow,
                    "occupancyPercentage": occupancy_pct,
                    "averageSpeed": speed,
                    "averageTransitTime": transit_time,
                    "inTransitCount": active_in_transit,
                    "weatherCondition": weather_condition,
                    "timeOfDay": round(hour_of_day, 2),
                    "dayOfWeek": day_of_week,
                    "isWeekend": bool(day_of_week >= 6),
                    "scenario": scenario,
                    "isBottleneck": is_bottleneck,
                    "operationalStatus": status,
                    "dataStatus": "SYNTHETIC_DATA"
                })

        df = pd.DataFrame(records)
        return df

    def _calculate_inflow(
        self,
        cp_idx: int,
        hour_of_day: float,
        scenario: str,
        transit_queues: Dict[int, List[Dict[str, Any]]],
        current_step: int,
        capacity: int
    ) -> float:
        # Checkpoint 1 (Ingress Base Camp): Driven by time of day & morning/evening diurnal pattern
        if cp_idx == 0:
            # Diurnal surge curve peaking around 07:00 - 09:00
            diurnal = math.exp(-((hour_of_day - 7.5) ** 2) / 8.0) * 0.70 + math.exp(-((hour_of_day - 16.5) ** 2) / 10.0) * 0.35
            if hour_of_day < 5.0 or hour_of_day > 21.0:
                diurnal *= 0.10

            base = capacity * 0.022 * diurnal

            if scenario == "MORNING_SURGE" and (6.0 <= hour_of_day <= 10.0):
                base *= 1.65
            elif scenario == "EVENING_SURGE" and (15.0 <= hour_of_day <= 19.0):
                base *= 1.50
            elif scenario == "SUDDEN_INFLOW" and (8.0 <= hour_of_day <= 9.0):
                base *= 2.20
            elif scenario == "RECOVERY" and hour_of_day >= 12.0:
                base *= 0.40  # Gating applied

            return max(2.0, base)

        # Downstream Checkpoints (CP-02 to CP-05): Fed primarily by upstream transit queue arrivals
        arriving_pilgrims = 0
        queue = transit_queues[cp_idx]
        remaining_queue = []
        for item in queue:
            if item["arrival_step"] <= current_step:
                arriving_pilgrims += item["count"]
            else:
                remaining_queue.append(item)
        transit_queues[cp_idx] = remaining_queue

        # Plus small local trail ingress / rest camp departures
        local_inflow = capacity * 0.003 * max(0.1, math.sin((hour_of_day / 24.0) * math.pi))
        return arriving_pilgrims + local_inflow


if __name__ == "__main__":
    generator = SyntheticCrowdDataGenerator(seed=42)
    df = generator.generate_dataset(days=30, interval_minutes=15)
    print(f"Generated {len(df)} synthetic rows across {len(CHECKPOINTS)} checkpoints.")
    print(f"Scenarios simulated: {df['scenario'].nunique()} distinct operational scenarios.")
    df.to_csv("ml/synthetic_crowd_data.csv", index=False)
    print("Saved dataset to ml/synthetic_crowd_data.csv with dataStatus = SYNTHETIC_DATA.")
