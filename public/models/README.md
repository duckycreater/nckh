# Public ML model artifacts

This directory hosts the ONNX/TF.js/TFLite weights used for **on-device**
inference in the BMO Robot PWA. The browser fetches them via Workbox's
`bmo-static-models` cache bucket (`vite.config.ts`) and verifies the
SHA-256 pinned in [`server/services/modelRegistry.ts`](../server/services/modelRegistry.ts)
before loading.

## Available models

| Model                       | File                                          | Size  | SHA-256 (first 16 hex) | License     | Validation accuracy | Source |
| --------------------------- | --------------------------------------------- | ----- | ---------------------- | ----------- | ------------------- | ------ |
| `waste-classifier@v1`       | [`waste_classifier_v1.onnx`](waste_classifier_v1.onnx)       | 3.3 KB | `83eca56f84c9e51b` … | Apache-2.0  | **99.79 %**         | synthetic Vietnamese-waste centroids |
| `waste-classifier@v1` (meta)| [`waste_classifier_v1_meta.json`](waste_classifier_v1_meta.json) | 1.4 KB | — | Apache-2.0  | — | accompanying class labels + provenance |
| runtime manifest            | [`manifest.json`](manifest.json)              | 0.7 KB | — | Apache-2.0  | — | consumed by `src/services/localModelRunner.ts` |

Full SHA-256 of the canonical ONNX artifact:

```
83eca56f84c9e51b92473ab170b0b0ecf39f76f2611a1bdca17ca435a33a5261
```

(Reproduce with `python scripts/train_and_export_waste_classifier.py --epochs 50`.)

## Provenance & licence

The `waste-classifier@v1` artifact was produced from scratch by
[`scripts/train_and_export_waste_classifier.py`](../../scripts/train_and_export_waste_classifier.py)
using a seeded RNG (`seed = 42`) on synthetic 16-D feature vectors
that approximate the colour, shape and texture signature of six
common Vietnamese household-waste categories: `organic`, `plastic`,
`paper`, `glass`, `metal`, `hazard`.

* **Model weights license:** [Apache-2.0](https://www.apache.org/licenses/LICENSE-2.0)
  — free to use, modify and redistribute as long as copyright + license
  are preserved.
* **Training data license:** [CC-BY-4.0](https://creativecommons.org/licenses/by/4.0/)
  — synthetic centroids authored for this project; attribution
  requested when reused.
* **Citation:** see root [`README.md`](../../README.md#citing-this-project-isef-paper)
  for the BibTeX entry.

## How the client verifies the model

1. The PWA fetches `GET /api/models/waste-classifier` (see
   [`server/routes/models.ts`](../routes/models.ts)).
2. The response is a signed manifest:
   `{ manifest: {...}, signature: <hmac-sha256-hex> }`.
3. The client verifies the HMAC against `BMO_MODEL_HMAC_SECRET` and
   checks the manifest's `sha256` against the downloaded bytes
   (see [`src/services/modelRegistry.ts`](../../src/services/modelRegistry.ts)).
4. If either check fails, the model is **not** loaded; the client
   falls back to cloud Gemini vision or to a heuristic classifier.

## How to add or update a model

1. Train / convert the new model (see the script header).
2. Drop the `.onnx` file in this directory.
3. Run `sha256sum public/models/<file>.onnx` and update both
   `server/services/modelRegistry.ts` *and* `public/models/waste_classifier_v1_meta.json`.
4. Update the table above (size, accuracy, provenance, license).
5. Re-run `bash scripts/smoke.sh` end-to-end to confirm the new
   artifact loads in the running server.

## DOIs (when published)

When a tagged release goes public (e.g. `v1.0.0`), Zenodo mints a
permanent DOI for the entire repository. The badge will be added here
and in the root README.

<!-- TODO: insert Zenodo DOI badge once v1.0.0 is tagged. -->

## Scripts

* `scripts/train_and_export_waste_classifier.py` — produce a fresh
  ONNX artifact + meta JSON + benchmark report.
* `scripts/download-models.js` — pulls legacy MobileNetV2 / YOLOv8n
  placeholders for fallback detection.