# Poster Design — BMO Robot ISEF 2027

ISEF board dimensions: **48 inches × 48 inches (≈ 122 cm × 122 cm)**. Standard layout: **landscape**, three-column, large title at top. We use the ISEF-provided Tufte-style template and a 1.5 inch margin on each side.

---

## Layout (12 zones)

```
┌────────────────────────────────────────────────────────────────────────────┐
│                          TITLE STRIP  (12" tall)                          │
│  Privacy-Preserving Federated AI for Sustainable                          │
│  Waste Sorting: A Multi-School RCT Toward SDG 12.5 & 13.3                │
│  [Authors + Logos]                                                         │
├────────────────────────────────────────────────────────────────────────────┤
│ ZONE 1         │ ZONE 2             │ ZONE 3                              │
│ PROBLEM        │ APPROACH           │ SYSTEM ARCHITECTURE                 │
│ (3 col)        │ (3 col)            │ (3 col)                              │
├────────────────┼────────────────────┼────────────────────────────────────┤
│ ZONE 4         │ ZONE 5             │ ZONE 6                              │
│ THEORY OF      │ FL + DP RESULTS    │ SMART-BIN TWIN                      │
│ CHANGE         │ (3 col)            │ (3 col)                              │
├────────────────┼────────────────────┼────────────────────────────────────┤
│ ZONE 7         │ ZONE 8             │ ZONE 9                              │
│ SYNTH RCT      │ BENCHMARK          │ LIVE: NEXT STEPS                    │
│ RESULTS        │ (3 col)            │ (3 col)                              │
├────────────────┼────────────────────┼────────────────────────────────────┤
│ ZONE 10        │ ZONE 11            │ ZONE 12                             │
│ DATA & ETHICS  │ IMPACT             │ FOOTER (QR + Zenodo)                │
└────────────────────────────────────────────────────────────────────────────┘
```

Each zone is roughly 12" × 12" (compact, scannable from 1 m away). Title strip is 12" tall + bold sans-serif (Inter / Geist) at 80–100 pt body, 130 pt for the main title.

---

## Zone-by-zone content

### Title strip

**Main title** (Roboto 100 pt, bold, dark on white):
> "Privacy-Preserving Federated AI for Sustainable Waste Sorting"

**Subtitle** (Roboto 36 pt):
> "A Multi-School Randomized Controlled Trial Toward SDG 12.5 & 13.3"

Affiliation block: 24 pt, includes school logo + Zenodo DOI QR code.

### Zone 1 — Problem

- One big number: **"3.88 billion tons/year"** (World Bank 2050 projection).
- Three bullets (≤ 20 words each):
  1. Vietnam recovers < 30% of plastic, paper, metal.
  2. Source contamination = #1 reason recovery fails.
  3. Children cannot legally upload scan images.

### Zone 2 — Approach

Three pillars labelled **Privacy**, **Theory**, **AI**:

- **Privacy:** "On-device ONNX + Rényi DP at ε=1.0" (icon: shield).
- **Theory:** "COM-B (Michie 2011) + Whitmarsh-O'Neill identity scale" (icon: brain).
- **AI:** "Self-supervised SimCLR pretraining; on-device inference" (icon: microchip).

### Zone 3 — System architecture

A flowchart at 80% scale:

```
[Camera] → [On-device ONNX MobileNetV3] → [EWC personalise] → [DP noise]
                                                                  ↓
[FL Server: Flower + Rényi DP] ←─────── [Secure Aggregation]
                                                                  ↓
[Global model] → [Smart-bin twin emulator] → [VRP optimiser]
                                       → [Live dashboard: SmartBinTwin.tsx]
```

### Zone 4 — Theory of Change

The 5-row causal diagram (impact → outcomes → mechanisms → inputs) from `THEORY_OF_CHANGE.md`, drawn with icons:

- Row 0: leaf icon (impact)
- Row 1: target icon + heart icon (outcomes)
- Row 2: gears (mechanisms)
- Row 3: AI / twin / identity / network icons (inputs)

### Zone 5 — FL + DP results

- Top: small line chart of Rényi-DP ε trajectory (50 rounds fit under budget).
- Bottom: small bar chart comparing BMO ONNX vs DWaste:
  - Accuracy: 92% vs 80%.
  - Latency: 80 ms vs 220 ms.
  - Energy: 0.5 mAh/scan vs 1.2 mAh/scan.

### Zone 6 — Smart-bin twin

Screenshot of `SmartBinTwin.tsx`:

- KPI tiles at top.
- 24h demand-forecast histogram.
- Per-school footprint bars.

### Zone 7 — Synthetic RCT results

Big number chart:

- **E4 effect (Cohen's d) = 1.95** vs control (target d ≥ 0.40).
- **Sort accuracy +0.34** raw increase.
- **D30 retention +42 pp** absolute.
- **CO₂e avoided +0.072 kg/user/week**.

Source line: "Pilot of 1,000 simulated students × 12 weeks."

### Zone 8 — Benchmark

Table comparing BMO Stack vs DWaste:

| Metric | DWaste | BMO | Δ |
|---|---|---|---|
| mAP / top-1 | 80% | **92%** | +15% |
| Median latency (ms) | 220 | **80** | -64% |
| Energy per scan (mAh) | 1.2 | **0.5** | -58% |
| Federated rounds @ ε ≤ 1.0 | 0 | **50+** | new |
| DP guarantee | none | **Rényi** | new |
| Smart-bin route optimisation | none | **OR-Tools** | new |

### Zone 9 — Live: Next steps

- Real-school pilot (5 schools × 120 students, 10 weeks, months 5–10).
- Multilingual expansion (Thai / Bahasa).
- Integration with municipal smart-city projects in Da Nang.

### Zone 10 — Data & ethics

- "**0 raw images uploaded**" (COPPA/GDPR-K compliance).
- Mermaid-style diagram: Student ↔ BMO device ↔ FL Server.
- Open data + open code on GitHub + Zenodo DOI.

### Zone 11 — Impact

Three counters (with unit icons):

- **0.027 kg CO₂e / scan** (EPA WARM v15).
- **142 g plastic / 6 categories**.
- Projected annual impact if scaled: **5.4 t CO₂e / 600 students**.

### Zone 12 — Footer

- QR code → Zenodo DOI release (to be created at T41).
- "Code: github.com/...; Pre-reg: osf.io/...; Contact: pi@example.edu"
- Acknowledgement logos (e.g., school, lab, partners).

---

## Design principles

1. **Scannable from 1 m.** Every zone fits one glance.
2. **Numbers everywhere.** A reader should see at least 5 distinct quantitative claims within 5 seconds.
3. **One story.** The poster answers: "Can a privacy-preserving AI + behaviour-change stack measurably improve waste sorting at scale?"
4. **No decorative stock photos** — use my own generated infographics.
5. **High contrast.** Dark text on white backgrounds. Highlight colour: BMO cyan (#06b6d4).

## Typography

- Title — Inter 96pt.
- Body — Inter 22pt.
- Captions — Inter 16pt.
- Numbers — Inter Bold 60pt (KPI tiles).

## File formats

- **Source:** Figma file (public link, shared with co-authors).
- **Print:** 48" × 48" TIF at 300 dpi (ISEF requirement).
- **Digital:** 2400 × 2400 px PNG for social-media preview.

## Color palette

| Zone | Colour | Use |
|---|---|---|
| Title strip | #06b6d4 (BMO cyan) on white | Brand |
| Problem (Z1) | #dc2626 (red-600) | Urgency |
| Approach (Z2) | #0f766e (teal-700) | Trust |
| Results (Z5,7,8) | #0369a1 (sky-700) | Authority |
| Impact (Z11) | #16a34a (emerald-600) | Hope |
| Next steps (Z9) | #d97706 (amber-600) | Future |
| Footer (Z12) | #4b5563 (gray-600) | Subdued |
