# Research Proposal — BMO Robot

**Title:** A Privacy-Preserving Federated AI Platform for Sustainable Waste Sorting: A Multi-School Randomized Controlled Trial Toward UN Sustainable Development Goals 12.5 and 13.3

**Primary Category:** Robotics & Intelligent Machines (ROBO)
**Secondary Categories:** Environmental Engineering (ENEV), Systems Software (SOFT), Behavioural & Social Sciences (BEHA)

**Student Investigators:** [TBD]
**Affiliation:** [TBD], Vietnam
**Target Fair:** ISEF 2027 (pre-registration live on the Open Science Framework; see [PRE_REGISTRATION.md](PRE_REGISTRATION.md))
**IRB Status:** Pending — see [IRB_ETHICS.md](IRB_ETHICS.md)

---

## 1. Background and Rationale

### 1.1 The waste-sorting problem

The World Bank projects global municipal solid waste (MSW) to grow from **2.1 to 3.88 billion tons/year by 2050**; low- and middle-income countries absorb the steepest growth with the weakest recovery infrastructure [1]. Vietnam (this study's setting) recovers < 30% of plastic, paper, and metal [2]. Contamination of source-separated streams is the dominant reason local recovery operators reject household waste [3]. This contamination problem is fundamentally behavioural: when humans mis-sort at the source, downstream sorting — by manual labour or robotics — becomes uneconomical.

### 1.2 What existing solutions miss

Computer-vision-enabled sorting has surged (DWaste YOLOv8 quantised for edge [4]; ISFE 2024 ROBO053 $273 robot arm [5]; the MDPI 2025 review enumerates 47 systems [6]). These systems push algorithmic accuracy but treat waste sorting as an isolated image-classification problem and ignore three interlocking challenges that determine real-world impact with adolescents:

| Missing dimension | Why it matters | Where literature is thin |
|---|---|---|
| **Privacy-preserving multi-school training** | Children (<13) cannot legally contribute raw images under COPPA / GDPR-Kids. Centralised upload = non-compliant. | Almost no waste-sorting paper has an on-device FL + DP pipeline; FedAvg + Gaussian DP is generic but gives loose (ε, δ) bounds. |
| **Theory-driven behaviour change** | Pure gamification creates novelty effects that decay by week 3 (West & Michie 2020). Sustained behaviour requires COM-B / identity shifts. | Gamification dominates; theory-grounded waste systems are rare. |
| **Measurable SDG impact with RCT** | UN SDG 12.5/13.3 reporting is currently extrapolation from scan counts. Nobody in this space has run an RCT with rigorous statistics. | Existing systems stop at descriptive statistics; EPA WARM v15 protocol gives the CO₂e conversion but no causal design. |

### 1.3 The BMO Robot platform — what already exists

BMO Robot is a multi-tenant React/Express/TensorFlow platform already deployed for Vietnamese high schools. It ships with: (a) an on-device 6-class ONNX classifier (MobileNetV3-Small, ~5 MB) running in the browser via WebGPU / WASM-SIMD; (b) a federated learning server (`fl-server/server.py`, Flower) with DP-Gaussian FedAvg at ε = 1.0; (c) a carbon ledger that converts scan counts → kg waste sorted → kg CO₂e avoided via EPA WARM v15 + IPCC AR6; (d) a Gamified campaign engine (world map, family mode, voice accessibility); (e) a smart-bin vendor API contract (`hardware/SMART_BIN_API.md`) with HTTP polling, MQTT push, and CSV batching.

What BMO **does not yet have** — and what this proposal adds — is:

1. **RCT-engineered** evidence that any of this moves adolescent waste-sorting behaviour.
2. Tighter DP composition via **Rényi DP** (30–50% more budget under the same ε, δ [7]).
3. **Theory of Change** that maps mechanical gamification onto measurable psychological constructs.
4. **Smart-bin digital twin** so we can test interventions against 100 emulated bins before deploying real hardware in low-resource schools.

### 1.4 Research questions

- **RQ1 — AI/ROBO:** Does self-supervised SimCLR pretraining of the on-device Vietnamese-waste classifier (15K unlabeled images) reduce the labelling burden for new schools by ≥ 50% while maintaining ≥ 92% top-1 accuracy (vs. DWaste's 80% mAP)?
- **RQ2 — FL/Privacy:** Does Rényi-DP composition (vs. advanced composition [7]) enable ≥ 50 federated training rounds at ε ≤ 1.0, δ = 1e-5 across ≥ 5 schools without measurable accuracy loss?
- **RQ3 — Behavioural:** Does BMO (vs. passive education control) increase (a) sort accuracy, (b) D30 retention, (c) environmental identity (EID-4, Whitmarsh & O'Neill 2010) by d ≥ 0.40?
- **RQ4 — SDG Impact:** Does BMO + smart-bin digital-twin collection optimisation reduce missed-collection CO₂e by ≥ 20% vs. fixed-route baseline?

---

## 2. Hypothesis (Pre-Registered)

> **H₁:** A 10-week deployment of BMO Robot — combining (a) on-device self-supervised waste classifier, (b) federated multi-school training with Rényi-DP composition, (c) a COM-B-grounded gamification layer targeting self-concept and identity, and (d) a smart-bin digital twin — produces statistically significant gains in sort accuracy (Δ ≥ +12 pp), D30 retention (Δ ≥ +15 pp), and SDG-attributable CO₂e avoided (Δ ≥ +0.3 kg/user/week) versus a passive-education control in a 5-cohort cluster-randomised RCT with N ≥ 600 students across ≥ 5 Vietnamese secondary schools, with primary analyses pre-registered on OSF and corrected for multiple comparisons (Holm–Bonferroni).

**H₀:** No significant differences across cohorts at α = 0.05 with statistical power ≥ 0.80.

---

## 3. Methods

### 3.1 Design overview

**5-arm cluster-randomised controlled trial**, school-level randomisation (avoids within-school contamination):

| Arm | Description |
|---|---|
| **C** — Control | Standard Vietnamese civic-education curriculum only |
| **E1** — BMO gamification only | BMO app, no FL personalization, no smart-bin twin |
| **E2** — BMO + FL + DP | Full BMO, FL rounds disabled for E1; personalised ONNX trained locally |
| **E3** — BMO + FL + DP + smart-bin twin | Full BMO + collection-route optimization shown live to students |
| **E4** — BMO + identity-prime messaging | E3 + COM-B-grounded messaging ("You are a sorter") and peer-network nudges |

Replicated across ≥ 5 school blocks (≥ 600 students total, ≥ 120 per school).

### 3.2 Participants

- **Recruitment:** Vietnamese secondary schools (THPT) in HCMC, Hanoi, Da Nang via Ministry-of-Education partner network.
- **Eligibility:** Students 12–17 years old; parent/guardian informed consent (COPPA < 13 compliance) + student assent.
- **Exclusion:** Smartphone-unreachable students; language barriers; sibling clusters to avoid contamination.

### 3.3 Intervention components

**(a) On-device AI.** ONNX MobileNetV3-Small + WebGPU/WASM-SIMD runtime. Continually personalised via on-device EWC. The classifier contributes weight-deltas only, never images. Self-supervised pretrained on 15K unlabeled Vietnamese waste images.

**(b) Federated Learning.** Flower server runs FedAvg every 6 h. Client-side: L2 clip to 1.0, Gaussian noise σ such that **cumulative Rényi-DP across 50 rounds ≤ ε = 1.0, δ = 1e-5**. PrivacyByDesign rationale: see [THEORY_OF_CHANGE.md](THEORY_OF_CHANGE.md) §2.3.

**(c) Smart-bin digital twin.** `server/services/smartBinEmulator.ts` simulates 100 bins across 5 schools with realistic patterns (lunchtime spike 11–13h, weekend decay, industrial continuous). `collectionOptimizer.ts` solves a VRP via greedy + OR-Tools. Students see the live optimization map.

**(d) Behaviour change layer.** `src/services/identityEngine.ts` — self-concept priming (Whitmarsh & O'Neill 2010). `lossAversionEngine.ts` — regret prompts on streak break. `socialDiffusion.ts` — peer-graph centrality + clan challenges.

### 3.4 Outcome measures (pre-registered)

| Domain | Measure | Instrument |
|---|---|---|
| Primary | Sort accuracy rate | % of scans with correct category (held-out 500-image Vietnamese test set) |
| Primary | D30 retention | % of students with ≥ 1 session in days 21–30 |
| Primary | Environmental identity | Whitmarsh & O'Neill EID-4 Likert 1–7, baseline → week 10 |
| Secondary | kg CO₂e avoided / user / week | `server/services/impactCalculator.ts` + EPA WARM v15 |
| Secondary | Federated rounds @ ε ≤ 1.0 | Count from `dpAccountant.ts` |
| Secondary | Privacy audit completeness | % of weight updates with Merkle proof (`auditTrail.ts`) |

### 3.5 Statistical analysis

- **Primary tests:** Hierarchical mixed-effects logistic regression (student nested in school) with cohort fixed effects and school random intercepts. Holm–Bonferroni correction across 3 primary outcomes.
- **Power:** N = 600, ICC = 0.10, α = 0.05/3 = 0.017 → power ≥ 0.82 (Monte-Carlo via `simr` R package).

### 3.6 Compliance and ethics

COPPA + GDPR-K compliant (no images uploaded; only weight deltas + DP noise). IRB pending. Data sovereignty: schools opt out at any time; raw data never leaves the district boundary unless aggregated via `secureAggregation.ts`.

---

## 4. Innovation and Significance

Four novel contributions, each filling a gap in the ISFE/ISEF literature:

1. **First federated-waste-sorting RCT in the pre-college setting.** No ISFE/ISEF paper to our knowledge has combined FL + DP + RCT for adolescent environmental behaviour. The closest (ISEF 2024 ROBO053) had no privacy layer and no behavioural outcome measure.

2. **First application of Rényi DP composition to weight-clip + Gaussian on-device federated training.** Rényi DP gives ~30% tighter privacy-budget accounting than advanced composition [7], enabling more rounds under ε ≤ 1.0.

3. **Theory-driven gamification mapped to COM-B.** Most gamification (Recycle Coach, Litterati) stops at extrinsic points. BMO targets **identity** (Whitmarsh & O'Neill 2010 — strongest long-run predictor of pro-environmental behaviour). The interdisciplinary posture (AI + behavioural science) mirrors ISEF 2024 BEHA061 *GaitNet* (1st Award, $5,000) — applied to waste-sorting.

4. **Smart-bin digital twin with VRP optimisation.** No open-source educational tool shows students their collective impact on a live optimisation problem. This satisfies the ISEF 2026 "systems-level thinking, scalability, and relevance" criterion [9].

---

## 5. Timeline (12 months)

| Month | Milestone |
|---|---|
| 1 | OSF pre-registration; ethics IRB submission; pilot smart-bin emulator validated |
| 2 | Finalise Theory of Change; 4 intervention arms in code with > 80% test coverage |
| 3 | Synthetic RCT (1,000 simulated students, 12 weeks); pre-registration locked |
| 4 | Onboard 5 schools + obtain informed consent |
| 5–10 | Real RCT (10 weeks active + 2 weeks follow-up); running FL; collecting audit log |
| 11 | Analyse primary/secondary outcomes; write 12-page ISEF paper |
| 12 | Submit to ISEF affiliate fair (deadline typically Feb–Mar) |

---

## 6. References

1. World Bank. *What a Waste 2.0: A Global Snapshot of Solid Waste Management to 2050*. 2018.
2. Vietnam Ministry of Natural Resources and Environment. *National State of Environment Report*. 2022.
3. OECD. *Plastic Waste Management in Vietnam*. 2021.
4. Kunwar, S. *DWaste: Greener AI for Waste Sorting using Mobile and Edge Devices*. arXiv:2510.18513. 2025.
5. Sidhu, P. *Revolutionizing Waste Management: A Machine Learning and Computer Vision-Enabled Robot Arm for Efficient Garbage Recycling*. ISEF 2024 ROBO053 (4th Award).
6. MDPI Sensors. *A Systematic Review of AI-Based Techniques for Automated Waste Classification*. 25(10):3181. 2025.
7. Mironov, I. *Rényi Differential Privacy*. IEEE CSF 2017.
8. ISFE 2024 BEHA061 *GaitNet* (1st Award, $5,000).
9. Embark. *ISEF 2026 Award-Winning Projects — Part I*. 2026.

---

## 7. Appendices (separate files in `docs/`)

- [THEORY_OF_CHANGE.md](THEORY_OF_CHANGE.md) — COM-B + logic model
- [PRE_REGISTRATION.md](PRE_REGISTRATION.md) — OSF pre-registration plan
- [LITERATURE_REVIEW.md](LITERATURE_REVIEW.md) — annotated bibliography
- [IRB_ETHICS.md](IRB_ETHICS.md) — ethics submission draft
- [../isef/PAPER_DRAFT.md](../isef/PAPER_DRAFT.md) — 8–12 page paper outline
- [../isef/POSTER_DESIGN.md](../isef/POSTER_DESIGN.md) — poster template
- [../isef/DEMO_VIDEO_SCRIPT.md](../isef/DEMO_VIDEO_SCRIPT.md) — 5-minute demo script
