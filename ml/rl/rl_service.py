"""
YatraFlow Python RL Microservice.
Provides real-time neural network inference endpoints for PPO and DQN crowd control policies.
Port: 5002
"""

import os
import sys
import json
from http.server import HTTPServer, BaseHTTPRequestHandler
import numpy as np
import torch

PROJECT_ROOT = os.path.dirname(os.path.dirname(os.path.dirname(os.path.abspath(__file__))))
if PROJECT_ROOT not in sys.path:
    sys.path.insert(0, PROJECT_ROOT)

from ml.rl.yatra_rl_env import YatraCorridorEnv
from ml.rl.dqn_agent import DQNAgent
from ml.rl.ppo_agent import PPOAgent

MODEL_DIR = os.path.join(os.path.dirname(os.path.dirname(os.path.abspath(__file__))), "models")

# Global loaded models cache
MODELS = {}

def get_or_load_models(corridor="BALTAL"):
    key = corridor.upper()
    if key in MODELS:
        return MODELS[key]
        
    env = YatraCorridorEnv(corridor=key)
    dqn = DQNAgent(state_dim=env.obs_dim, num_checkpoints=env.num_checkpoints)
    dqn_path = os.path.join(MODEL_DIR, f"dqn_{key.lower()}_policy.pt")
    if os.path.exists(dqn_path):
        dqn.load(dqn_path)
        
    ppo = PPOAgent(state_dim=env.obs_dim, action_dim=env.action_dim)
    ppo_path = os.path.join(MODEL_DIR, f"ppo_{key.lower()}_policy.pt")
    if os.path.exists(ppo_path):
        ppo.load(ppo_path)
        
    MODELS[key] = {"env": env, "dqn": dqn, "ppo": ppo}
    return MODELS[key]

class RLRequestHandler(BaseHTTPRequestHandler):
    def _send_cors_headers(self):
        self.send_header("Access-Control-Allow-Origin", "*")
        self.send_header("Access-Control-Allow-Methods", "GET, POST, OPTIONS")
        self.send_header("Access-Control-Allow-Headers", "Content-Type")

    def do_OPTIONS(self):
        self.send_response(200)
        self._send_cors_headers()
        self.end_headers()

    def do_GET(self):
        if self.path == "/health" or self.path == "/api/rl/health":
            self.send_response(200)
            self.send_header("Content-Type", "application/json")
            self._send_cors_headers()
            self.end_headers()
            models_loaded = list(MODELS.keys())
            response = {
                "status": "UP",
                "service": "YatraFlow Python RL Engine",
                "version": "1.0.0-torch",
                "corridors_available": ["BALTAL", "PAHALGAM"],
                "models_cached": models_loaded
            }
            self.wfile.write(json.dumps(response).encode("utf-8"))
        else:
            self.send_response(404)
            self.end_headers()

    def do_POST(self):
        content_len = int(self.headers.get("Content-Length", 0))
        body = self.rfile.read(content_len).decode("utf-8")
        try:
            req_data = json.loads(body) if body else {}
        except Exception:
            req_data = {}

        if self.path == "/api/rl/predict" or self.path == "/predict":
            corridor = req_data.get("corridor", "BALTAL")
            policy_type = req_data.get("policy", "PPO").upper()
            state_vec = req_data.get("state", None)

            models = get_or_load_models(corridor)
            if state_vec is None:
                state_vec = models["env"].reset().tolist()

            state_arr = np.array(state_vec, dtype=np.float32)

            if "PPO" in policy_type:
                action, log_prob, value = models["ppo"].select_action(state_arr, evaluate=True)
                # Map [-1.0, 1.0] to release factor
                multipliers = (1.0 + 0.8 * action).tolist()
                response = {
                    "policy": "PPO_ACTOR_CRITIC",
                    "action_type": "continuous_release_multiplier",
                    "release_multipliers": multipliers,
                    "estimated_state_value": value,
                    "raw_action_vector": action.tolist()
                }
            elif "DQN" in policy_type:
                actions = models["dqn"].select_action(state_arr, evaluate=True)
                ACTION_MAP = [0.1, 0.6, 1.0, 1.4]
                multipliers = [ACTION_MAP[a] for a in actions]
                response = {
                    "policy": "DQN_DISCRETE_GATE",
                    "action_type": "discrete_gate_strategy",
                    "discrete_actions": actions,
                    "release_multipliers": multipliers,
                    "epsilon": models["dqn"].epsilon
                }
            else:
                response = {"error": f"Unknown policy '{policy_type}'"}

            self.send_response(200)
            self.send_header("Content-Type", "application/json")
            self._send_cors_headers()
            self.end_headers()
            self.wfile.write(json.dumps(response).encode("utf-8"))
        else:
            self.send_response(404)
            self.end_headers()

def run_server(port=5002):
    print(f"[RL SERVICE] Initializing PyTorch models on port {port}...")
    get_or_load_models("BALTAL")
    server = HTTPServer(("0.0.0.0", port), RLRequestHandler)
    print(f"[RL SERVICE] Server listening at http://127.0.0.1:{port}")
    server.serve_forever()

if __name__ == "__main__":
    run_server(5002)
