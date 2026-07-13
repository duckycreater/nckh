# Actual benchmark — BMO waste classifier ONNX

_Generated: 2026-07-07 09:07:23 — script `scripts/train_and_export_waste_classifier.py` (seed=42)._

| Metric | Value |
|---|---|
| Architecture | 2-layer MLP (16 → 32 → 6) |
| Training samples | 1920 |
| Validation samples | 480 |
| Epochs | 50 |
| Training accuracy | **0.9974** |
| Validation accuracy | **0.9979** |
| Final train loss | 0.0897 |
| Wall-clock (CPU) | 0.1s |
| ONNX opset | 17 |
| Model size | 3308 bytes |
| SHA-256 | `83eca56f84c9e51b92473ab170b0b0ecf39f76f2611a1bdca17ca435a33a5261` |
| License | Apache-2.0 |
| Path | `public/models/waste_classifier_v1.onnx` |

## Per-class validation accuracy

| Class (VI) | Class (EN) | Precision | Recall |
|---|---|---|---|
| Hữu cơ | organic | 1.000 | 1.000 |
| Nhựa | plastic | 1.000 | 1.000 |
| Giấy | paper | 1.000 | 1.000 |
| Thủy tinh | glass | 1.000 | 0.986 |
| Kim loại | metal | 0.987 | 1.000 |
| Nguy hại | hazard | 1.000 | 1.000 |

## How to reproduce

```bash
python scripts/train_and_export_waste_classifier.py --epochs 50
```

The seeded RNG guarantees the SHA-256 above is stable across machines.
If you change the seed or training config, also update
`server/services/modelRegistry.ts` and re-run `scripts/smoke.sh`.
