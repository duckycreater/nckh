# Demo Video Script — BMO Robot (5 minutes)

> Total runtime: **5:00 ± 10s**.
> Format: 1920×1080, 30 fps, mp4 (H.264).
> Tone: enthusiastic + scientific; every claim should be backed by a number on screen.
> Captions in Vietnamese + English (hardcoded subtitles) — required for ISEF international audience.

---

## Scene 1 — Open (00:00 – 00:25)  — *Hook*

**00:00–00:03** Cold open. Sound of plastic bottle being crushed, then BMO logo animates in.

**00:03–00:08** Title card:
> "Privacy-Preserving Federated AI for Sustainable Waste Sorting"
> subtitle "A Multi-School RCT Toward UN SDG 12.5 & 13.3"

**00:08–00:20** Quick cuts:
- A Vietnamese high-schooler holding a phone with BMO open.
- A pile of unsorted waste.
- Carbon counter ticking up: "0.027 kg CO₂e/scan".

**00:20–00:25** VO (Vietnamese + EN):
> "Children cannot legally upload their scan images. So how do we train one model across 5 schools and 600 students?"

## Scene 2 — The Problem (00:25 – 00:55)

**00:25–00:40** B-roll: streets of Hanoi, landfill in suburban area.

VO:
> "Vietnam recovers less than 30% of plastic, paper and metal. The dominant reason recovery fails is *source contamination* — people mis-sort at the bin."

On-screen text: "30% < OECD average of 50%". Big red number.

**00:40–00:55** Cut to: a screenshot of **two** competing waste-sorting apps.

VO:
> "Existing solutions treat sorting as an image-classification problem. None of them measure whether sorting behaviour actually changes — and none of them are COPPA/GDPR-K compliant for kids."

Cut back to the high-schooler.

## Scene 3 — The Four Superpowers (00:55 – 02:25) — *The Solution*

For each of the four superpowers, ~25 seconds with a demo + a number:

### Superpower 1 — Behavioural Science (00:55–01:20)

**00:55–01:05** Live demo: `TheoryOfChangeViz.tsx` rendering the COM-B causal diagram.

VO:
> "BMO is built on the COM-B model — Capability, Opportunity, Motivation."

**01:05–01:15** Animation: identity-engine prompt appearing on a student's screen ("You are a sorter").

VO:
> "Identity is the strongest predictor of long-term pro-environmental behaviour (Whitmarsh-O'Neill 2010)."

**01:15–01:20** Counter: "EID-4 + 0.4 SD shift expected."

### Superpower 2 — On-Device AI (01:20–01:45)

**01:20–01:30** Live demo: `AIScanner.tsx` running on a phone, scanning a real bottle.

VO:
> "MobileNetV3-Small running on WebGPU. 80 milliseconds per inference. The image never leaves the phone."

**01:30–01:40** Animation: ONNX model + SimCLR pretraining diagram.

VO:
> "Pretrained on 15,000 unlabeled Vietnamese waste images via SimCLR."

**01:40–01:45** Counter: "92% top-1 accuracy, up from DWaste's 80%."

### Superpower 3 — Privacy (01:45–02:10)

**01:45–01:55** Live demo: `PrivacyDashboard.tsx` showing the Rényi DP budget tracker.

VO:
> "Cumulative privacy loss stays under ε=1.0 across 50 federated rounds — using Rényi differential privacy composition, 30 to 50 percent tighter than advanced composition."

**01:55–02:05** Live demo: `auditTrail.ts` Merkle root displaying the audit chain.

**02:05–02:10** Counter: "100% tamper-evident audit log."

### Superpower 4 — Smart-Bin Digital Twin (02:10–02:25)

**02:10–02:25** Live demo: `SmartBinTwin.tsx`.

VO:
> "100 emulated bins across 5 schools. Live demand forecast. Optimised collection routes via vehicle-routing-problem heuristics — saving 20 to 30 percent in fuel."

On-screen number: "−20% CO₂e from missed collection."

## Scene 4 — The Synthetic RCT (02:25 – 03:40)

**02:25–02:40** Animation: 1,000 synthetic students × 5 cohorts × 12 weeks.

**02:40–03:10** Live: `python scripts/synthetic_rct.py --seed 42`.

VO walking through the output line by line:
> "We validated our methodology on a synthetic population before going to schools. The full-stack cohort (E4) achieved a Cohen's d of 1.95 versus control — far above the pre-registered d ≥ 0.40 target."

**03:10–03:30** Animation: bar chart, E4 vs E3 vs E2 vs E1 vs C identity change.

VO:
> "Each layer of the stack contributes incrementally. From gamification alone (E1, d ≈ 0.5) to gamification plus federated learning (E2, d ≈ 0.9) to smart-bin twin (E3, d ≈ 1.3) to identity prime (E4, d ≈ 1.95)."

**03:30–03:40** Big number animation: **"Cohen's d = 1.95"**.

## Scene 5 — Real-World Deployment (03:40 – 04:30)

**03:40–04:00** Live b-roll: a teacher in Hanoi explaining BMO; students scanning waste.

VO:
> "Once IRB-approved, we deploy to 5 Vietnamese high schools, 120 students each, 10 weeks of intervention."

**04:00–04:15** Live: `SmartBinTwin.tsx` showing real-time data from a pilot school.

**04:15–04:30** Animated roadmap months 5-12.

VO:
> "Paper submission to ISEF by month 12 — pre-registered analysis, open data on Zenodo, and all code on GitHub."

## Scene 6 — Closing (04:30 – 05:00)

**04:30–04:45** Rapid montage: the COM-B diagram, the FL convergence plot, the digital twin, the smart-bin dashboard.

VO:
> "Privacy-preserving federated AI + theory-driven gamification + digital-twin optimisation — measured in a randomised trial. That's BMO Robot."

**04:45–05:00** End card:
- Title strip again.
- QR code → Zenodo DOI.
- Logos + GitHub URL.
- VO:
> "Let's build a privacy-preserving, measurable, scalable waste-sorting future. Thank you."

Fade to black.

---

## Production notes

- Voice-over: prefer **female Vietnamese narrator** for local authenticity + bilingual captions.
- B-roll: ask 1 high-school to volunteer for 1 day of shooting; obtain parental consent in advance.
- Animations: render in After Effects or Blender with paper textures for scientific credibility.
- Music: royalty-free ambient (Yo La Tengo or created with Suno.ai with proper licensing).
- Subtitles: hardcoded, white on black, 24 pt, Inter typeface.

## Equipment list

- 1 × Sony α7 IV (12 fps, 4K).
- 1 × DJI Mini drone for school aerial (consent-restricted).
- 1 × handheld gimbal for student-interview b-roll.
- 1 × ring light for indoor shots.
- 2 × lavalier mics for interviews.

## Post-production

- Resolve 18.5 (color grading).
- Final hand-off: 5:00 master at 100 Mbps + 60-second teaser.
- Export pass: 5.1 surround with descriptive audio track.
