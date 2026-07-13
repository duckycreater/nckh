# ADR 0001 — On-device-first AI inference

- **Status:** Accepted (2026-01)
- **Deciders:** BMO engineering
- **Context drivers:** privacy of minors (Vietnam GDPR-style consent),
  offline-classroom reliability, low-end devices (school Chromebooks /
  old Android phones)

## Context

We needed to classify waste into six categories (plastic / paper / glass /
metal / organic / hazard) for primary-school users in Vietnam. Network
connectivity at schools is intermittent, and parental consent forbids
sending raw images off-device. We considered three patterns:

1. **Cloud-only:** every scan POSTs the image to Gemini Vision, returns
   the prediction. Easiest to build; fails offline; leaks images.
2. **Client-only:** ship a large model in the PWA bundle, run TFJS /
   ONNX Runtime entirely on the device. No privacy leakage, but the
   initial payload is 6-10 MB and inference takes 800ms-2s on low-end
   devices.
3. **Hybrid:** try local first, fall back to a privacy-preserving cloud
   call when confidence is low.

## Decision

Adopt **option 3 (hybrid)** with the bias toward option 2:

- **Default path:** on-device MobileNetV3-Small fine-tuned for waste
  classification (`/models/waste_classifier_v1.onnx`) runs in a Web
  Worker via ONNX Runtime Web. The image never leaves the device.
- **Fallback:** if local confidence < 0.55, the client MAY upload to
  `/api/scan-garbage` for a Gemini call. **Only** when the user has
  toggled "improve AI" in settings (default off).
- **Privacy switch:** "Local AI only" mode disables the cloud fallback
  entirely and surfaces a confidence-sensitive nudge instead.

The Cloudinary + Supabase dataset capture pipeline is gated behind a
separate consent flag (dataset opt-in) so improving the model does not
leak raw images.

## Consequences

- **Good:** Privacy-preserving by default; works offline on school
  Chromebooks; no monthly API bill for routine scans.
- **Good:** Federated learning (see ADR-0002) lets us improve the local
  model without ever seeing user images.
- **Bad:** First-page-load is slower (6 MB model download + first-run
  warm-up).
- **Bad:** Two models to maintain; harder to reproduce benchmark numbers
  because the on-device path uses different precision than the cloud
  path.
- **Mitigation:** ONNX Runtime's WebGPU + WebGL backends are dynamically
  selected by `src/services/inferenceRouter.ts`; a "lite" 2MB model is
  fetched on 2G connections.

## Alternatives considered

- **TensorFlow.js with a `tfjs-converter` export.** Rejected: bundle
  was 30 % larger and inference was ~50 % slower on the Galaxy A13.
- **Edge inference via Cloudflare Workers AI.** Rejected: would still
  send images off-device and violate the on-device-first principle.