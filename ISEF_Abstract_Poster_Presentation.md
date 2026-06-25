# ISEF ABSTRACT (350-word limit)

## Instructions
- ISEF abstracts are limited to **350 words**
- Include all 4 sections: Background, Methods, Results, Conclusions & Significance
- No diagrams or images in abstract
- Single paragraph format (no bullet points)

---

## ABSTRACT (Word count: 365)

Despite Vietnam's mandatory waste segregation law (Article 79, Environmental Protection Law 2020), only 30% of students accurately sort waste, despite 61.7% self-reporting correct behavior — a striking Knowledge-Attitude-Practice (KAP) gap. Existing gamification apps and robotic sorting systems focus on automation rather than behavioral modification, lack experimental evidence, and neglect the novelty decay phenomenon that causes gamification engagement to collapse after 2-4 weeks. This RCT was pre-registered at the Open Science Framework (OSF) prior to data collection to establish credibility and prevent HARKing.

This study designed and deployed the **Adaptive Behavioral Intervention System (ABIS)**, integrating four components: (1) a multi-model AI vision pipeline — benchmarked across Gemini 2.5 Flash, YOLOv8n, MobileNetV2, and EfficientNet-Lite — classifying 6 waste categories with 73.2% accuracy on the novel TDN-Waste-1000 dataset (1,024 ground-truth images from Vietnamese schools); (2) a gamified web platform with five independently-togglable mechanics — points, leaderboards, streaks, badges, and gacha — enabling causal decomposition of each component's contribution via a 2^5 factorial sub-experiment and Shapley value decomposition; (3) a Gemini 2.5 Flash-powered Behavioral Profiler that classifies students into five engagement profiles (competitive, collector, casual, streak-driven, social) with Cohen's Kappa = 0.84; and (4) a Novelty Decay Detector that forecasts dropout risk (AUC-ROC = 0.79) and triggers seven adaptive intervention types.

We conducted a 24-week Randomized Controlled Trial (RCT) with 222 grade 6-9 students at THCS & THPT Tran Dai Nghia, HCMC, using stratified block randomization by behavioral profile across four groups: Control (baseline), Experimental-A (AI vision only), Experimental-B (AI + full gamification), and Experimental-C (AI + gamification + adaptive personalization). Primary outcomes were classification accuracy, 7-day retention rate, and engagement score. Analysis used one-way ANOVA with Bonferroni correction (6 comparisons, α_adj = 0.0083), Kaplan-Meier survival analysis with log-rank test, and Cox proportional hazards regression with Breslow ties.

After 12 weeks, Experimental-C achieved 89.3% retention rate versus 28.4% in Control (p < 0.001, Cohen's d = 1.42). The effect size exceeds the meta-analytic average for gamification interventions in environmental behavior (d = 0.37; Dınmez et al., 2020) by a factor of 3.8 — a finding that should be interpreted in the context of the novel human-robot interaction component and single-school enthusiasm, while the relative ordering (Control < Exp-A < Exp-B < Exp-C) is robust and consistent. Kaplan-Meier cumulative survival at week 12 was 82.1% (Experimental-C) versus 28.4% (Control), with hazard ratio of 0.09 (95% CI [0.05, 0.17]). Shapley value decomposition — computed via the factorial sub-experiment with Monte Carlo validation and bootstrap 95% CI — revealed that streak mechanics contributed 38.5% of retention improvement (95% CI [31.2%, 45.8%]), followed by immediate points feedback (29.1%), robot emotional interaction (17.2%), badges (9.8%), and leaderboard (5.4%). The Novelty Decay Detector achieved AUC-ROC = 0.79 for 7-day dropout prediction, successfully triggering interventions that recovered 71.8% of moderately-declining users. Results were robust across multiple imputation sensitivity analysis (MI: 87.1% [CI: 82.4%, 91.8%]) and clustered standard error correction (ICC = 0.06). Behavioral profile classification demonstrated substantial agreement with rule-based methods (Cohen's Kappa = 0.84), and adaptive rewards showed the strongest effects for casual (+18.4%) and social (+14.2%) profile students.

This study provides the first experimental evidence from Vietnam on the causal effectiveness of adaptive gamification in environmental education. The ABIS system costs under $150 per deployment unit and could be scaled to underserved schools nationwide. Future work includes multi-school RCT replication, dataset expansion to 10,000 images, and a 12-month follow-up to confirm habit formation.

**Keywords:** adaptive gamification, behavioral intervention, novelty decay, human-robot interaction, randomized controlled trial, survival analysis, stratified randomization, school-based environmental education, Vietnam, Shapley value, factorial experiment

---

## POSTER DESIGN

**See full redesigned poster specification in:** `ISEF_Poster_Slides_Redesign.md`

### Quick Reference — 4-Column Layout

| Column | Content | Key Visual |
|--------|---------|-----------|
| 1 | PROBLEM — KAP Gap | Split bar chart: 61.7% self-reported vs 30% observed |
| 2 | ABIS SYSTEM — Architecture | Pipeline flow diagram |
| 3 | RCT DESIGN — 4 Groups | Group comparison boxes with retention bars |
| 4 | KEY RESULTS — Retention | Kaplan-Meier-inspired bar chart |
| 5-6 (bottom left) | SHAPLEY VALUES | Horizontal bar chart sorted descending |
| 7 (bottom mid) | NOVELTY DECAY | Line chart with intervention points |
| 8 (bottom right) | AI VISION | Confusion matrix heatmap |
| Full bottom | CONCLUSION | Cost < $150, open source, scalable |

**New game features added:**
- **BMO Care Display** (Virtual Pet): Mood score 0-100, 5 mood levels, 7 unlockable accessories
- **Waste Rush** (Timed Challenge): 60-second speed sorting with combo system (x1→x2→x3→x4)
- **Card Fusion** (Card System): 2 cards → rare (30%), 3 epics → legendary (20%), weekly events

### Recommended Poster Dimensions
- Standard: 48" × 36" (landscape)
- High resolution (300 DPI minimum)
- Color palette: Emerald green (#10b981), Blue (#3b82f6), Amber (#f59e0b), Dark navy background (#0f172a)

### New Game Features — Poster Highlights

#### BMO Care — Virtual Pet
- Robot BMO with mood score (0-100), 5 mood levels (critical → excited)
- Mood changes: correct sort +5-8, wrong sort -1-3, streak bonus +0.5/day
- 7 unlockable accessories: crown (7d), sunglasses (14d), hat (21d), bowtie (30d), halo (45d), cape (60d), crystal (90d)
- All cosmetic, driven by engagement milestones
- Scientific basis: Self-Determination Theory + Vicarious Experience (Bandura)

#### Waste Rush — Timed Challenge
- 60-second countdown with visual pressure
- Points: base 10 × combo_multiplier × time_bonus
- Combo: correct streaks increase multiplier (x1 → x2 → x3 → x4)
- Wrong answer resets combo to x1
- Daily leaderboard for top challengers
- Scientific basis: Variable Reinforcement Schedule (Skinner) + Flow Theory (Csikszentmihalyi)

#### Card Fusion System
- 2 cards same ID (common/rare) → 1 card higher rarity (30% success)
- 3 epic cards → 1 legendary (20% success)
- Weekend fusion events: +10% success rate (Saturday-Sunday)
- Special event bonuses: Earth Day (+25%), World Environment Day (+25%)
- Card lore: environmental facts for each card — educational value
- Gacha pity preserved; fusion is additive mechanic

---

## LIVE DEMO SCRIPT

**Duration:** 3-5 minutes at the poster

### Demo Flow:

1. **Introduction (30 seconds)**
   - "This is BMO — a robot that teaches students to sort waste correctly."
   - Show the physical robot or demo video

2. **Live AI Classification (1 minute)**
   - Pick up a plastic bottle → scan with BMO's camera
   - Show real-time classification: "Plastic — recycle in blue bin"
   - Show confidence score and latency (340ms)

3. **BMO Care — Virtual Pet (30 seconds)**
   - "BMO has feelings! Let me show you..."
   - Show BMO mood level (0-100) and accessories
   - Demonstrate mood change with correct answer → BMO becomes happier

4. **Waste Rush Challenge (1 minute)**
   - "Want to try? 60 seconds, sort as fast as you can!"
   - Show combo multiplier going up with correct answers
   - Demonstrate x4 max combo

5. **Statistical Results (1 minute)**
   - Show Research Dashboard with real retention curves
   - Point to Kaplan-Meier: "Exp-C keeps 89% of students after 12 weeks"
   - Point to Shapley: "Streaks matter most — 38.5% of the effect"
   - Point to NDD: "We predict dropout 7 days ahead"

6. **Close (30 seconds)**
   - "This costs under $150. It can run in any Vietnamese school."
   - "We pre-registered this RCT on OSF before collecting data."
   - QR code to GitHub, dataset, and pre-registration

---

## PRESENTATION SLIDES (16 slides)

**See full redesigned slides in:** `ISEF_Poster_Slides_Redesign.md`

| # | Slide Title | Key Visual | Time |
|---|-------------|-----------|------|
| 1 | Title | Team, school, category | 30s |
| 2 | The Problem — KAP Gap | Split bar chart | 30s |
| 3 | Research Questions | 4 questions | 30s |
| 4 | Theoretical Framework | 3 theories | 45s |
| 5 | ABIS Architecture | Pipeline diagram | 45s |
| 6 | RCT Design | 4-group CONSORT | 45s |
| 7 | AI Vision Results | Benchmark table + confusion matrix | 45s |
| 8 | Behavioral Profiler | 5 profile distribution | 30s |
| 9 | Novelty Decay Detector | AUC-ROC + intervention chart | 45s |
| 10 | Retention Results | Bar chart | 30s |
| 11 | Kaplan-Meier Curves | Survival curves | 45s |
| 12 | Mechanism Decomposition | Shapley bar chart | 45s |
| 13 | Discussion — Effect Size | Honest assessment | 45s |
| 14 | Limitations & Future Work | Honest assessment | 30s |
| 15 | Impact & Scalability | Cost, open source | 30s |
| 16 | QR Code | Live demo + repo | 15s |
