"""
Federated Learning Server - Flower-based (CayGiaPha_NhanThuc)

Breakthrough: multiple schools train a shared waste classifier
WITHOUT sharing raw images. Only model weights are exchanged.

Run:
    pip install flwr torch torchvision
    python fl-server/server.py --rounds 50 --min-clients 2
"""

import argparse
import json
import os
from collections import OrderedDict
from typing import List, Tuple

import flwr as fl
import numpy as np
import torch
import torch.nn as nn
from torch.utils.data import DataLoader, TensorDataset

# Lightweight model: MobileNetV3-Small (compatible with edge ONNX)
def build_model(num_classes: int = 6) -> nn.Module:
    from torchvision.models import mobilenet_v3_small, MobileNet_V3_Small_Weights
    model = mobilenet_v3_small(weights=None)
    model.classifier[3] = nn.Linear(model.classifier[3].in_features, num_classes)
    return model

def get_weights(model: nn.Module) -> List[np.ndarray]:
    return [v.detach().cpu().numpy() for _, v in model.state_dict().items()]

def set_weights(model: nn.Module, weights: List[np.ndarray]):
    params = list(model.state_dict().keys())
    state_dict = OrderedDict()
    for k, w in zip(params, weights):
        state_dict[k] = torch.tensor(w)
    model.load_state_dict(state_dict, strict=True)


class BMOStrategy(fl.server.strategy.FedAvg):
    """FedAvg with differential privacy noise injection at aggregation."""
    def __init__(self, dp_epsilon: float = 1.0, dp_delta: float = 1e-5, **kwargs):
        super().__init__(**kwargs)
        self.dp_epsilon = dp_epsilon
        self.dp_delta = dp_delta
        self.round_history = []

    def aggregate_fit(self, server_round, results, failures):
        if not results: return None, {}
        aggregated = super().aggregate_fit(server_round, results, failures)
        if aggregated[0] is None: return aggregated

        # Differential Privacy: add Gaussian noise to aggregated weights
        weights = aggregated[0]
        # Sensitivity = L2 norm * 2 / num_clients (simplified)
        sensitivity = 0.01
        sigma = (sensitivity * np.sqrt(2 * np.log(1.25 / self.dp_delta))) / self.dp_epsilon

        noisy_weights = fl.common.ndarrays_to_parameters([
            w + np.random.normal(0, sigma, w.shape).astype(w.dtype) for w in weights
        ])

        # Log round metrics
        self.round_history.append({
            "round": server_round,
            "clients": len(results),
            "failures": len(failures),
            "dp_epsilon": self.dp_epsilon,
            "dp_sigma": float(sigma),
        })
        print(f"[FL Round {server_round}] {len(results)} clients, σ={sigma:.4f}, ε={self.dp_epsilon}")

        return noisy_weights, aggregated[1]


def evaluate(server_round, parameters, config):
    """Centralized evaluation on synthetic held-out set."""
    model = build_model()
    device = torch.device("cuda" if torch.cuda.is_available() else "cpu")
    set_weights(model, parameters)
    model.to(device).eval()

    # Synthetic eval set (replace with real validation in production)
    X = torch.randn(64, 3, 224, 224)
    y = torch.randint(0, 6, (64,))
    loader = DataLoader(TensorDataset(X, y), batch_size=16)

    correct = 0; total = 0
    with torch.no_grad():
        for x, t in loader:
            x, t = x.to(device), t.to(device)
            out = model(x)
            correct += (out.argmax(1) == t).sum().item()
            total += t.size(0)

    accuracy = correct / max(total, 1)
    loss = 1.0 - accuracy
    print(f"[FL Round {server_round}] central eval: acc={accuracy:.4f}, loss={loss:.4f}")
    return loss, {"accuracy": accuracy, "round": server_round}


def fit_config(server_round: int):
    return {
        "round": server_round,
        "epochs": 1,
        "lr": 0.001 * (0.95 ** server_round),
    }


def main():
    parser = argparse.ArgumentParser()
    parser.add_argument("--rounds", type=int, default=20)
    parser.add_argument("--min-clients", type=int, default=2)
    parser.add_argument("--address", type=str, default="0.0.0.0:8080")
    parser.add_argument("--dp-epsilon", type=float, default=1.0,
                        help="Lower = more private, less accurate")
    parser.add_argument("--dp-delta", type=float, default=1e-5)
    args = parser.parse_args()

    strategy = BMOStrategy(
        dp_epsilon=args.dp_epsilon,
        dp_delta=args.dp_delta,
        fraction_fit=1.0,
        fraction_evaluate=0.5,
        min_fit_clients=args.min_clients,
        min_evaluate_clients=max(1, args.min_clients - 1),
        min_available_clients=args.min_clients,
        on_fit_config_fn=fit_config,
        evaluate_fn=evaluate,
    )

    print(f"Starting Flower server on {args.address}")
    print(f"  Min clients: {args.min_clients}")
    print(f"  DP: ε={args.dp_epsilon}, δ={args.dp_delta}")
    print(f"  Rounds: {args.rounds}")

    fl.server.start_server(
        server_address=args.address,
        strategy=strategy,
        config=fl.server.ServerConfig(num_rounds=args.rounds),
    )

    # Save round history
    with open("fl-server/round_history.json", "w") as f:
        json.dump(strategy.round_history, f, indent=2)

    print("FL training complete. Saved to fl-server/round_history.json")

if __name__ == "__main__":
    main()