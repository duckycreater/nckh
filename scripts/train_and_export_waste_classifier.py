#!/usr/bin/env python3
"""
scripts/train_and_export_waste_classifier.py
===========================================

Train a tiny waste-classification neural net on synthetic Vietnamese-waste
feature vectors and export it to ONNX for the on-device PWA inference
runtime.

This script intentionally avoids any large pretrained backbone
(MobileNetV3 / EfficientNet) so it runs in seconds on any laptop CPU
without GPU and ships a model < 100 KB. The architecture is a small
MLP chosen so that the export path is fully reproducible from scratch
(no external weight download required).

Pipeline
--------
1. Generate a synthetic 6-class dataset that imitates the colour +
   shape + texture histogram signature of Vietnamese household waste
   (organic, plastic, paper, glass, metal, hazard). The dataset is
   seeded so re-runs produce bit-identical ONNX weights, which is
   essential for the SHA256 pinned in
   `server/services/modelRegistry.ts`.
2. Train a 2-layer MLP (input 16 → hidden 32 → output 6) for 50
   epochs with Adam + cross-entropy.
3. Export to ONNX (opset 17) with explicit input/output names so the
   onnxruntime-web runtime can address them.
4. Emit `waste_classifier_v1_meta.json` (class labels, validation
   accuracy, sha256, license, training-config) and a Markdown report
   to `reports/benchmark_actual.md` summarising the run.

Usage
-----
    python scripts/train_and_export_waste_classifier.py
    python scripts/train_and_export_waste_classifier.py --epochs 80
"""
from __future__ import annotations

import argparse
import hashlib
import json
import os
import random
import sys
import time
from pathlib import Path

import numpy as np

# `onnx` ships with the basic builder API; no extra deps.
import onnx
from onnx import TensorProto, helper, numpy_helper

# ─── Determinism ──────────────────────────────────────────────────────────────
SEED = 42
random.seed(SEED)
np.random.seed(SEED)

# ─── Paths ───────────────────────────────────────────────────────────────────
ROOT = Path(__file__).resolve().parent.parent
PUBLIC_MODELS = ROOT / "public" / "models"
REPORTS = ROOT / "reports"
PUBLIC_MODELS.mkdir(parents=True, exist_ok=True)
REPORTS.mkdir(parents=True, exist_ok=True)

CLASS_NAMES_VI = {
    "organic": "Hữu cơ",
    "plastic": "Nhựa",
    "paper": "Giấy",
    "glass": "Thủy tinh",
    "metal": "Kim loại",
    "hazard": "Nguy hại",
}
CLASS_ORDER = ["organic", "plastic", "paper", "glass", "metal", "hazard"]
NUM_CLASSES = len(CLASS_ORDER)
FEATURE_DIM = 16

# Per-class centroid of a 16-D feature vector representing
# mean colour+texture+shape signature of that waste category.
CENTROIDS = np.array(
    [
        [0.35, 0.55, 0.30, 0.40, 0.65, 0.80, 0.20, 0.30, 0.45, 0.50, 0.60, 0.25, 0.55, 0.70, 0.40, 0.35],  # organic
        [0.20, 0.25, 0.30, 0.15, 0.40, 0.25, 0.75, 0.85, 0.10, 0.20, 0.30, 0.80, 0.20, 0.15, 0.25, 0.30],  # plastic
        [0.85, 0.80, 0.75, 0.90, 0.30, 0.20, 0.40, 0.50, 0.65, 0.55, 0.35, 0.45, 0.85, 0.90, 0.70, 0.80],  # paper
        [0.30, 0.65, 0.70, 0.20, 0.85, 0.30, 0.55, 0.40, 0.95, 0.90, 0.50, 0.30, 0.20, 0.35, 0.85, 0.65],  # glass
        [0.40, 0.45, 0.55, 0.30, 0.90, 0.25, 0.85, 0.70, 0.80, 0.85, 0.55, 0.65, 0.30, 0.40, 0.90, 0.55],  # metal
        [0.55, 0.20, 0.10, 0.60, 0.25, 0.45, 0.20, 0.10, 0.30, 0.25, 0.20, 0.15, 0.45, 0.30, 0.35, 0.20],  # hazard
    ],
    dtype=np.float32,
)


def synth_dataset(n_per_class: int = 400) -> tuple[np.ndarray, np.ndarray]:
    """Generate Gaussian-cluttered samples around each centroid."""
    xs, ys = [], []
    for label in range(NUM_CLASSES):
        noise = np.random.normal(0.0, 0.12, size=(n_per_class, FEATURE_DIM))
        x = np.clip(CENTROIDS[label] + noise, 0.0, 1.0)
        xs.append(x)
        ys.append(np.full(n_per_class, label, dtype=np.int64))
    x = np.concatenate(xs, axis=0).astype(np.float32)
    y = np.concatenate(ys, axis=0)
    idx = np.random.permutation(len(x))
    return x[idx], y[idx]


def softmax(z: np.ndarray) -> np.ndarray:
    z = z - z.max(axis=-1, keepdims=True)
    e = np.exp(z)
    return e / e.sum(axis=-1, keepdims=True)


def train_mlp(
    x_train: np.ndarray,
    y_train: np.ndarray,
    x_val: np.ndarray,
    y_val: np.ndarray,
    epochs: int,
    hidden: int = 32,
    lr: float = 0.02,
) -> tuple[np.ndarray, np.ndarray, np.ndarray, np.ndarray, list[float]]:
    """Pure-NumPy 2-layer MLP with ReLU + softmax cross-entropy."""
    rng = np.random.default_rng(SEED)
    w1 = rng.normal(0, np.sqrt(2.0 / FEATURE_DIM), size=(FEATURE_DIM, hidden)).astype(np.float32)
    b1 = np.zeros(hidden, dtype=np.float32)
    w2 = rng.normal(0, np.sqrt(2.0 / hidden), size=(hidden, NUM_CLASSES)).astype(np.float32)
    b2 = np.zeros(NUM_CLASSES, dtype=np.float32)

    losses: list[float] = []
    best_val = 0.0
    best = (w1.copy(), b1.copy(), w2.copy(), b2.copy())
    n = x_train.shape[0]

    for epoch in range(epochs):
        # Mini-batch SGD
        perm = rng.permutation(n)
        bs = 64
        for start in range(0, n, bs):
            idx = perm[start : start + bs]
            xb, yb = x_train[idx], y_train[idx]

            # forward
            h_pre = xb @ w1 + b1
            h = np.maximum(h_pre, 0)
            logits = h @ w2 + b2
            probs = softmax(logits)
            # cross-entropy
            log_p = -np.log(np.clip(probs[np.arange(len(yb)), yb], 1e-9, 1.0))
            loss = log_p.mean()
            # backward
            dlogits = probs.copy()
            dlogits[np.arange(len(yb)), yb] -= 1
            dlogits /= len(yb)
            dh = dlogits @ w2.T
            dh_pre = dh * (h_pre > 0)
            dw2 = h.T @ dlogits
            db2 = dlogits.sum(0)
            dw1 = xb.T @ dh_pre
            db1 = dh_pre.sum(0)
            # update
            w2 -= lr * dw2
            b2 -= lr * db2
            w1 -= lr * dw1
            b1 -= lr * db1

        # full train + val eval
        h_pre = x_train @ w1 + b1
        h = np.maximum(h_pre, 0)
        train_logits = h @ w2 + b2
        train_probs = softmax(train_logits)
        train_loss = -np.log(
            np.clip(train_probs[np.arange(n), y_train], 1e-9, 1.0)
        ).mean()
        losses.append(float(train_loss))

        h_pre_v = x_val @ w1 + b1
        h_v = np.maximum(h_pre_v, 0)
        val_logits = h_v @ w2 + b2
        val_pred = val_logits.argmax(1)
        val_acc = float((val_pred == y_val).mean())
        if val_acc > best_val:
            best_val = val_acc
            best = (w1.copy(), b1.copy(), w2.copy(), b2.copy())

    return (*best, losses)


def export_onnx(w1: np.ndarray, b1: np.ndarray, w2: np.ndarray, b2: np.ndarray, out_path: Path) -> None:
    """Build a minimal ONNX graph: Gemm(input,W1,B1)->Relu->Gemm(.,W2,B2)->Softmax."""
    inp = helper.make_tensor_value_info("input", TensorProto.FLOAT, [1, FEATURE_DIM])
    out = helper.make_tensor_value_info("logits", TensorProto.FLOAT, [1, NUM_CLASSES])

    init_w1 = numpy_helper.from_array(w1, name="W1")
    init_b1 = numpy_helper.from_array(b1, name="B1")
    init_w2 = numpy_helper.from_array(w2, name="W2")
    init_b2 = numpy_helper.from_array(b2, name="B2")

    gemm1 = helper.make_node("Gemm", ["input", "W1", "B1"], ["hidden_pre"], alpha=1.0, beta=1.0, transB=0)
    relu = helper.make_node("Relu", ["hidden_pre"], ["hidden"])
    gemm2 = helper.make_node("Gemm", ["hidden", "W2", "B2"], ["logits"], alpha=1.0, beta=1.0, transB=0)

    graph = helper.make_graph(
        nodes=[gemm1, relu, gemm2],
        name="waste_classifier",
        inputs=[inp],
        outputs=[out],
        initializer=[init_w1, init_b1, init_w2, init_b2],
    )
    opset = [helper.make_opsetid("", 17)]
    model = helper.make_model(graph, producer_name="bmo-robot", opset_imports=opset)
    model.ir_version = 8
    onnx.checker.check_model(model)
    model_bytes = model.SerializeToString()
    out_path.write_bytes(model_bytes)


def sha256_file(path: Path) -> str:
    h = hashlib.sha256()
    with path.open("rb") as f:
        for chunk in iter(lambda: f.read(65536), b""):
            h.update(chunk)
    return h.hexdigest()


def main(argv: list[str] | None = None) -> int:
    parser = argparse.ArgumentParser(description="Train + export waste classifier ONNX")
    parser.add_argument("--epochs", type=int, default=50)
    parser.add_argument("--n-per-class", type=int, default=400)
    parser.add_argument("--model-name", default="waste_classifier_v1.onnx")
    args = parser.parse_args(argv)

    print(f"[train] generating synthetic dataset (seed={SEED}, n_per_class={args.n_per_class})")
    x, y = synth_dataset(n_per_class=args.n_per_class)
    split = int(0.8 * len(x))
    x_train, x_val = x[:split], x[split:]
    y_train, y_val = y[:split], y[split:]

    print(f"[train] training 2-layer MLP for {args.epochs} epochs ...")
    t0 = time.time()
    w1, b1, w2, b2, losses = train_mlp(x_train, y_train, x_val, y_val, epochs=args.epochs)
    train_secs = time.time() - t0

    # final metrics
    h_pre = x_val @ w1 + b1
    h = np.maximum(h_pre, 0)
    val_logits = h @ w2 + b2
    val_pred = val_logits.argmax(1)
    val_acc = float((val_pred == y_val).mean())

    train_pred = (x_train @ w1 + b1)
    train_pred = np.maximum(train_pred, 0)
    train_pred = train_pred @ w2 + b2
    train_pred = train_pred.argmax(1)
    train_acc = float((train_pred == y_train).mean())

    print(f"[train] done in {train_secs:.1f}s — train_acc={train_acc:.4f} val_acc={val_acc:.4f}")

    onnx_path = PUBLIC_MODELS / args.model_name
    print(f"[export] writing {onnx_path}".encode("utf-8", "replace").decode("ascii", "replace"))
    export_onnx(w1, b1, w2, b2, onnx_path)

    sha = sha256_file(onnx_path)
    print(f"[export] sha256 = {sha}")
    print(f"[export] size    = {onnx_path.stat().st_size} bytes")

    meta = {
        "name": "waste-classifier",
        "version": "v1",
        "framework": "onnx",
        "expectedInputSize": [FEATURE_DIM],
        "inputSchema": "1x16 float32 feature vector (colour, shape, texture)",
        "outputSchema": "1x6 float32 logits (organic, plastic, paper, glass, metal, hazard)",
        "classOrder": CLASS_ORDER,
        "classNamesVi": CLASS_NAMES_VI,
        "url": f"/models/{args.model_name}",
        "sha256": sha,
        "sizeBytes": onnx_path.stat().st_size,
        "license": "Apache-2.0",
        "trainedOnSamples": int(len(x_train)),
        "validationAccuracy": val_acc,
        "trainingAccuracy": train_acc,
        "epochs": args.epochs,
        "hidden": 32,
        "seed": SEED,
        "registeredAt": int(time.time() * 1000),
        "provenance": {
            "script": "scripts/train_and_export_waste_classifier.py",
            "dataset": "synthetic Vietnamese-waste centroids (seeded)",
            "license": "CC-BY-4.0",
        },
    }
    meta_path = PUBLIC_MODELS / "waste_classifier_v1_meta.json"
    meta_path.write_text(json.dumps(meta, indent=2, ensure_ascii=False), encoding="utf-8")
    print(f"[export] wrote meta → {meta_path}")

    # Benchmark report (markdown)
    report_lines = [
        "# Actual benchmark — BMO waste classifier ONNX",
        "",
        f"_Generated: {time.strftime('%Y-%m-%d %H:%M:%S')} — script "
        f"`scripts/train_and_export_waste_classifier.py` (seed={SEED})._",
        "",
        "| Metric | Value |",
        "|---|---|",
        f"| Architecture | 2-layer MLP ({FEATURE_DIM} → 32 → {NUM_CLASSES}) |",
        f"| Training samples | {len(x_train)} |",
        f"| Validation samples | {len(x_val)} |",
        f"| Epochs | {args.epochs} |",
        f"| Training accuracy | **{train_acc:.4f}** |",
        f"| Validation accuracy | **{val_acc:.4f}** |",
        f"| Final train loss | {losses[-1]:.4f} |",
        f"| Wall-clock (CPU) | {train_secs:.1f}s |",
        f"| ONNX opset | 17 |",
        f"| Model size | {onnx_path.stat().st_size} bytes |",
        f"| SHA-256 | `{sha}` |",
        f"| License | Apache-2.0 |",
        f"| Path | `public/models/{args.model_name}` |",
        "",
        "## Per-class validation accuracy",
        "",
        "| Class (VI) | Class (EN) | Precision | Recall |",
        "|---|---|---|---|",
    ]
    for ci, cname in enumerate(CLASS_ORDER):
        tp = int(((val_pred == ci) & (y_val == ci)).sum())
        fp = int(((val_pred == ci) & (y_val != ci)).sum())
        fn = int(((val_pred != ci) & (y_val == ci)).sum())
        prec = tp / max(tp + fp, 1)
        rec = tp / max(tp + fn, 1)
        report_lines.append(
            f"| {CLASS_NAMES_VI[cname]} | {cname} | {prec:.3f} | {rec:.3f} |"
        )

    report_lines += [
        "",
        "## How to reproduce",
        "",
        "```bash",
        "python scripts/train_and_export_waste_classifier.py --epochs 50",
        "```",
        "",
        "The seeded RNG guarantees the SHA-256 above is stable across machines.",
        "If you change the seed or training config, also update",
        "`server/services/modelRegistry.ts` and re-run `scripts/smoke.sh`.",
        "",
    ]
    report_path = REPORTS / "benchmark_actual.md"
    report_path.write_text("\n".join(report_lines), encoding="utf-8")
    print(f"[report] wrote → {report_path}")

    # Final registry-style manifest alongside the model so onnxruntime-web
    # can resolve it via `/models/waste_classifier_v1.onnx` directly.
    onnx_runtime_manifest = {
        "name": "waste-classifier",
        "version": "v1",
        "framework": "onnx",
        "expectedInputSize": [FEATURE_DIM],
        "url": f"/models/{args.model_name}",
        "sha256": sha,
        "license": "Apache-2.0",
        "trainedOnSamples": int(len(x_train)),
        "registeredAt": int(time.time() * 1000),
        "classOrder": CLASS_ORDER,
        "classNamesVi": CLASS_NAMES_VI,
        "inputSchema": "1x16 float32 feature vector (see scripts/train_and_export_waste_classifier.py)",
        "outputSchema": "1x6 float32 logits (organic, plastic, paper, glass, metal, hazard)",
        "runtime": "onnxruntime-web 1.19+",
    }
    (PUBLIC_MODELS / "manifest.json").write_text(
        json.dumps(onnx_runtime_manifest, indent=2, ensure_ascii=False),
        encoding="utf-8",
    )
    print(f"[export] wrote runtime manifest → {PUBLIC_MODELS / 'manifest.json'}")

    return 0


if __name__ == "__main__":
    sys.exit(main())