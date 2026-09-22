"""
Configuration for Phase 6 Synthetic Crowd Data Generation & ML Pipeline.
"""

from dataclasses import dataclass
from typing import List, Dict

RANDOM_SEED = 42

# Checkpoint Corridor Topology
CHECKPOINTS = [
    {
        "id": 1,
        "code": "CP-01",
        "name": "Baltal Base Camp",
        "capacity": 4050,
        "distanceFromPrevKm": 0.0,
        "sequence": 1,
        "base_free_speed": 3.2,
    },
    {
        "id": 2,
        "code": "CP-02",
        "name": "Domel Bridge",
        "capacity": 4580,
        "distanceFromPrevKm": 2.8,
        "sequence": 2,
        "base_free_speed": 2.8,
    },
    {
        "id": 3,
        "code": "CP-03",
        "name": "Sheshnag Camp",
        "capacity": 5080,
        "distanceFromPrevKm": 4.5,
        "sequence": 3,
        "base_free_speed": 2.2,  # Steep mountain ascent
    },
    {
        "id": 4,
        "code": "CP-04",
        "name": "Panchtarni Camp",
        "capacity": 4280,
        "distanceFromPrevKm": 3.8,
        "sequence": 4,
        "base_free_speed": 2.6,
    },
    {
        "id": 5,
        "code": "CP-05",
        "name": "Holy Cave Sanctum",
        "capacity": 4780,
        "distanceFromPrevKm": 3.2,
        "sequence": 5,
        "base_free_speed": 2.1,
    }
]

# Supported Operational Scenarios
SCENARIOS = [
    "NORMAL_DAY",
    "MORNING_SURGE",
    "EVENING_SURGE",
    "CROWD_BUILDUP",
    "BOTTLENECK",
    "SLOW_MOVEMENT",
    "WEATHER_SLOWDOWN",
    "RECOVERY",
    "SUDDEN_INFLOW",
    "CHECKPOINT_RESTRICTION"
]

INTERVAL_MINUTES = 15
TOTAL_DAYS = 30  # Generates 30 days of 15m resolution data (2,880 time steps x 5 CPs = 14,400 data points)

# Physical Limits
MIN_SPEED_KMH = 0.2
MAX_SPEED_KMH = 12.0
NORMAL_SPEED_KMH = 2.5
