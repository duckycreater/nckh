# Theory of Change — BMO Robot

## Purpose

This document translates the **COM-B model** of behaviour (Michie, van Stralen & West, 2011) into a **Theory of Change** (ToC) that connects every BMO Robot design choice to a measurable target. It is the analytic scaffold for the RCT pre-registration (see [PRE_REGISTRATION.md](PRE_REGISTRATION.md)) and for `src/services/theoryOfChange.ts`.

---

## 1. From PROBLEM to IMPACT (top of the ToC)

| Level | Statement | Indicator |
|---|---|---|
| **Impact (ultimate)** | Vietnamese secondary-school students consistently sort waste correctly at source, contributing to UN SDG 12.5 (waste reduction) and 13.3 (climate education). | kg CO₂e avoided per capita per year (EPA WARM v15 + IPCC AR6) |
| **Outcome** | 30-day post-intervention, treatment-cohort students sort ≥ 80% of items into the correct 6 categories and sustain ≥ 0.4 SD shift on a validated environmental-identity scale. | Sort accuracy; D30 retention; EID-4 identity |
| **Output** | BMO Robot is delivered to ≥ 5 schools, ≥ 600 students, ≥ 1 smart-bin digital twin per school. | Logs in `dashboard_events` |

---

## 2. The COM-B Framework

**Behaviour = Capability × Opportunity × Motivation**

For each BMO subsystem we identify the **COM component** it targets, the **intervention function** (Michie taxonomy), the **policy lever**, and a **measurable proxy**.

### 2.1 CAPABILITY (physical & psychological)

| Sub-component | BMO subsystem | Intervention function | Proxy measure |
|---|---|---|---|
| Physical capability — student can identify recyclables in 6 categories. | `AIScanner.tsx` + `wasteClassifier.ts` (ONNX MobileNetV3-Small) | Enablement / Training | Sort accuracy on a held-out 500-image Vietnamese test set |
| Psychological capability — working knowledge of "why sorting matters". | `Chatbot.tsx` (Gemini 2.5 Flash + Groq llama-3.3-70B) | Education | Quiz score in `ai_scan_metrics.quiz_correct` |
| Psychological capability — memory of prior actions. | Dashboard streaks (`useLevel.ts`) | Training | Streak length; DAU/WAU ratio |

### 2.2 OPPORTUNITY (physical & social)

| Sub-component | BMO subsystem | Intervention function | Proxy measure |
|---|---|---|---|
| Physical opportunity — sorting feasible at point of disposal. | Smart-bin digital twin (`smartBinEmulator.ts`) + `collectionOptimizer.ts` | Environmental restructuring | # bins within 30 m; collection-route latency |
| Social opportunity — peer group reinforces sorting. | `socialDiffusion.ts` + World Map | Modelling | # friends sorting same category same week |
| Physical opportunity — accessibility for low-vision / motor-impaired students. | `VoiceInterface.tsx` (TTS + STT) | Enablement | Voice-task completion rate |

### 2.3 MOTIVATION (reflective & automatic)

| Sub-component | BMO subsystem | Intervention function | Proxy measure |
|---|---|---|---|
| Reflective motivation — student *believes* sorting is part of who they are. | `identityEngine.ts` + `TheoryOfChangeViz.tsx` | Persuasion / Identity priming | Environmental Identity Scale (Whitmarsh & O'Neill 2010) |
| Reflective motivation — weighs consequences of inaction. | `lossAversionEngine.ts` (regret prompts on streak break) | Incentivisation | Regret-report open rate |
| Automatic motivation — sorting feels rewarding in the moment. | Gamification (cards, badges, levels) | Incentivisation | # badges earned per week |
| Reflective motivation — privacy confidence enables the behaviour to remain. | `privacyEngine.ts` + `PrivacyDashboard.tsx` (Rényi DP budget tracker) | Enablement | Privacy-budget trust score; opt-out rate |

---

## 3. Causal Pathways (Diagram)

```
                                        ┌────────────────────────────────────┐
                                        │  IMPACT:  SDG 12.5 / 13.3          │
                                        │   (↑ kg CO₂e avoided / capita)     │
                                        └──────────────▲─────────────────────┘
                                                       │
                          ┌────────────────────────────┴──────────────────────────────┐
                          │                                                            │
                          │                                                            │
            ┌─────────────┴────────────┐                                  ┌────────────┴─────────────┐
            │  OUTCOME 1: sort accuracy │                                  │  OUTCOME 2: identity shift │
            │   (≥ 80% top-1 correct)   │                                  │   (≥ 0.4 SD on EID-4)      │
            └────────────▲─────────────┘                                  └────────────▲───────────────┘
                         │                                                           │
        ┌────────────────┴─────────────────────┐             ┌───────────────────────┴─────────────────┐
        │  Mechanism A: skill acquisition        │             │  Mechanism B: identity self-concept      │
        │  (CAPABILITY × OPPORTUNITY)            │             │  (MOTIVATION, reflective)                │
        │  via AI scanner + twin                 │             │  via identityEngine + weekly reflection │
        └─────▲───────────────────────▲─────────┘             └────────▲───────────────────▲───────────┘
              │                       │                                │                   │
   ┌──────────┴─────────┐   ┌──────────┴──────────┐         ┌──────────┴────────┐  ┌──────┴──────────┐
   │  INPUT: scan +     │   │  INPUT: smart-bin   │         │  INPUT: identity  │  │  INPUT: peer     │
   │  on-device AI      │   │  emulation & route  │         │  priming copy     │  │  network graph   │
   │  (a1)              │   │  optimization (a2)  │         │  (b1)             │  │  (b2)            │
   └────────────────────┘   └─────────────────────┘         └───────────────────┘  └──────────────────┘

   Activities (a1) — MobileNetV3-Small ONNX classifier, WASM-SIMD/WebGPU runtime.
   Activities (a2) — Smart-bin emulator (agent-based simulation, server-side Python service).
   Activities (b1) — Identity-engine prompts in chat + post-scan reflection.
   Activities (b2) — Social-diffusion leaderboard and clan challenges.
```

---

## 4. Assumptions (testable)

| Assumption | How we test | What we change if violated |
|---|---|---|
| Vietnamese students will use a smartphone app in a classroom context | Baseline survey + usage telemetry (correlate grade level with DAU) | Provide paper-only onboarding |
| Self-concept priming persists ≥ 4 weeks | EID-4 at baseline, week 4, week 8 | Shorten the priming interval |
| On-device inference works on $150 phones | Falls back to WASM if WebGPU unavailable; logged in `model_runtime` | Server-side inference for low-tier devices |
| Rényi-DP composition budget holds ε ≤ 1.0 for ≥ 50 rounds | `dpAccountant.ts` logs `cumulative_epsilon` per round | Stop FL and switch to per-school local-only mode |
| Peer-network diffusion persists across classes (not just within class) | Social graph centrality metrics | Add cross-class weekly challenges |
| Privacy budget trust score predicts retention | Mediation analysis (week 4 mid-survey) | Surface budget tracker earlier in UX |

---

## 5. Boundary Critique

- **Who is included?** School students with smartphones — excludes home-schooled children and those in remote areas without cellular data. Mitigation: digital-twin data + open dashboard (`GlobalImpactDashboard.tsx`) is publicly accessible without login.
- **What is measured?** Behaviourally observable items via scans + surveys. Internal motivators are inferred from validated scales only — we do not claim to measure the unobservable.
- **What is *not* claimed?** We do not claim BMO reduces *total* waste generation; we claim it improves *separation at source* and *avoids downstream contamination*. This is honest reporting under SDG 12.5.

---

## 6. Implementation Linkage

The COM-B cells in §2 wire 1-to-1 to services in the codebase:

| COM-B cell | Source file | Public API |
|---|---|---|
| Physical capability | `src/services/wasteClassifier.ts` | `WasteClassifier.predict(image)` |
| Psychological capability | `src/components/Chatbot.tsx` | `<Chatbot user />` |
| Streak / memory | `src/lib/useLevel.ts` | `calculateLevel(exp)` |
| Physical opportunity | `server/services/smartBinEmulator.ts` | `getEmulator().summarizeForLastHours(24)` |
| Social opportunity | `src/services/socialDiffusion.ts` | `getPeerInfluencers(userId)` |
| Accessibility | `src/components/VoiceInterface.tsx` | `<VoiceInterface />` |
| Identity motivation | `src/services/identityEngine.ts` | `primeIdentity(userId)` |
| Loss aversion | `src/services/lossAversionEngine.ts` | `computeRegretPrompt(...)` |
| Privacy motivation | `src/services/dpAccountant.ts` + `PrivacyDashboard.tsx` | `getDpAccountant().computeState()` |

Every RCT outcome (RQs in [RESEARCH_PROPOSAL.md](RESEARCH_PROPOSAL.md)) maps to one COM-B cell, so a failure to detect an effect can be diagnosed at the mechanism level rather than the system level.

---

## 7. References

- Michie, S., van Stralen, M.M., & West, R. (2011). *The behaviour change wheel: A new method for characterising and designing behaviour change interventions*. Implementation Science 6:42.
- Whitmarsh, L., & O'Neill, S. (2010). *Green identity, green living? The role of pro-environmental self-identity in determining consistency across diverse pro-environmental behaviours*. J. Environmental Psychology 30(3): 305–314.
- West, R., & Michie, S. (2020). *A brief introduction to the COM-B Model of behaviour*. University College London.
- Mayne, J. (2015). *Useful Theory of Change*. American Journal of Evaluation 36(4).
- Bernstein, J. (2023). *Privacy nutrition labels for kids: A design framework for COPPA-compliance at the UI layer*. CHI '23.
