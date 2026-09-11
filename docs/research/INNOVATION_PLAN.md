# BMO Robot: Research-Grade Innovation Plan

This document defines the technical contributions that can be evaluated without
inflating the current demo metrics. It is a plan for a real study, not evidence
that the study has already been completed.

## Central contribution

The recommended primary contribution is an **uncertainty-aware, privacy-
preserving, cross-school waste classifier**. The classifier keeps the existing
scanner, gamification, smart-bin, federated-learning, voice, family and
research-dashboard features, but adds a safety decision layer:

1. A calibrated probability model produces a prediction set using split
   conformal calibration on a locked, labelled hold-out set.
2. A lightweight feature-shift screen detects inputs outside the calibration
   domain (new school, camera, lighting or object composition).
3. The app abstains and requests a human confirmation when the set is ambiguous
   or the domain-shift score is too high.
4. Corrections are collected as labelled feedback; they never silently become
   training labels or research outcomes.

The implementation lives in `src/services/conformalAbstention.ts`. It is only a
research result after its coverage, abstention rate, error rate and subgroup
performance are measured on an independent external-site test set.

The browser now verifies the ONNX SHA-256 pinned by the server manifest before
loading it, and will auto-load an optional fitted profile from
`public/models/waste_classifier_v1_conformal_profile.json`. This keeps the
runtime path ready for the external calibration artifact without presenting the
synthetic model score as calibrated evidence.

## Experimental questions

- Does conformal abstention reduce harmful misclassification at a fixed
  coverage level compared with top-1 confidence thresholds?
- Does federated calibration preserve coverage across schools with different
  phones, lighting and waste composition?
- What is the accuracy, latency, energy and privacy trade-off of local-only,
  federated, and cloud-assisted modes?

## Required evaluation

Report per-class precision/recall/F1, macro-F1, coverage, selective risk,
abstention rate, expected calibration error, Brier score, confusion matrices,
95% confidence intervals and results by school/device/lighting condition.
Use a frozen subject/site/device-disjoint test set and publish the exact
calibration profile, seed, manifest and raw prediction table.

## Non-negotiable provenance rules

- Synthetic outputs are labelled `SYNTHETIC` and cannot be shown as live study
  results.
- A failed research API must show an unavailable state, never generated p-values
  or fabricated audit roots.
- Every released model records its input schema, class order, training data
  version, calibration data version, hash and reviewer approval.
- Environmental values are reported as modelled potential impact until mass,
  contamination and disposal fate are measured.

## Longer-term extensions

After the core experiment is validated, the same architecture can support
federated conformal calibration, robust aggregation against poisoned updates,
and a sensor-grounded carbon ledger with uncertainty propagation. These are
separate hypotheses and must not be presented as completed contributions before
their ablation and external validation are available.
