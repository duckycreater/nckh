# ISEF Poster & Slides — Complete Redesign

---

## POSTER DESIGN (48" x 36" Landscape)

### Visual Identity

**Color Palette:**
- Primary: `#10b981` (Emerald Green)
- Secondary: `#3b82f6` (Blue)
- Accent: `#f59e0b` (Amber)
- Background: `#0f172a` (Dark Navy)
- Text: `#f8fafc` (White)
- Success: `#22c55e` (Green)

**Font sizes:** Title 36pt, Section headers 24pt, Body 14pt, Captions 10pt

---

### LAYOUT: 4-Column Grid

```
┌──────────────────────────────────────────────────────────────────────────────────────────────┐
│  [THCS & THPT TRAN DAI NGHIA]  [Adaptive Behavioral Intervention in School-Based...]     │
│  [Reg-Env | Environmental Science | 04-Environmental Management]         [QR → Demo]    │
├─────────────────────┬──────────────────────┬──────────────────────┬────────────────────────┤
│                     │                      │                      │                        │
│   PROBLEM           │   ABIS SYSTEM        │   RCT DESIGN         │   KEY RESULTS        │
│   KAP Gap           │   Architecture        │   4 Groups           │   Retention           │
│   (1 col wide)      │   (1 col)           │   (1 col)           │   (1 col)            │
│                     │                      │                      │                        │
├─────────────────────┴──────────────────────┴──────────────────────┴────────────────────────┤
│                                                                                       │
│   MECHANISM DECOMPOSITION (2 cols)  │  NOVELTY DECAY (1 col)  │  AI VISION (1 col)   │
│   Shapley Values                     │  Early Warning           │  Confusion Matrix       │
│                                     │                          │                        │
├─────────────────────────────────────┴──────────────────────────┴────────────────────────┤
│                                                                                       │
│   CONCLUSION & SCALABILITY (Full width)                                              │
│   < $150/deployment | Open Source | Future Work                                       │
└──────────────────────────────────────────────────────────────────────────────────────┘
```

---

### COLUMN 1: PROBLEM — "The KAP Gap"

**Visual: Split bar chart**

```
┌────────────────────────────────────┐
│  THE KAP GAP IN VIETNAMESE SCHOOLS   │
│                                     │
│  WHAT STUDENTS SAY:                 │
│  ████████████████████████████░░░  │
│  61.7% Self-Reported Correct       │
│                                     │
│  WHAT CAMERAS SEE:                  │
│  ███████░░░░░░░░░░░░░░░░░░░░  │
│  30.0% Actually Correct           │
│                                     │
│  Gap: 31.7 percentage points       │
│                                     │
│  ★ Baseline data, n=222            │
│    THCS & THPT Tran Dai Nghia, HCMC │
└────────────────────────────────────┘
```

Key stat boxes:
- 61.7% self-reported compliance → but only 30% observed accuracy
- KAP Gap: statistically significant (p < 0.001)
- Root cause: Knowledge ≠ Behavior

---

### COLUMN 2: ABIS SYSTEM Architecture

**Visual: Pipeline flow diagram**

```
┌────────────────────────────────────┐
│         HOW ABIS WORKS               │
│                                     │
│  [STUDENT] ──► [BMO + Camera]     │
│     │              │                 │
│     │         ┌────▼────┐           │
│     │         │ AI VISION│          │
│     │         │ YOLOv8n │          │
│     │         │ 73.2%   │          │
│     │         └────┬────┘           │
│     │              │                 │
│     ▼         ┌───▼───┐           │
│  [LCD: Bin    │FEEDBACK│           │
│   Guidance]   └────┬───┘           │
│                     │                 │
│     ┌──────────────┼──────────────┐ │
│     ▼              ▼              ▼ │
│  ┌──────┐    ┌─────────┐  ┌──────────┐│
│  │STREAK│    │ POINTS  │  │  BADGES │ │
│  │ x2   │    │ +10pts  │  │  10+    │ │
│  └──────┘    └─────────┘  └──────────┘│
│     │              │              │       │
│     └──────────┬─┴──────────────┘       │
│                ▼                        │
│         ┌─────────────┐                │
│         │ BEHAVIORAL  │                │
│         │ PROFILER    │                │
│         │ 5 profiles │                │
│         └──────┬──────┘                │
│                ▼                        │
│    ┌─────────────────────┐            │
│    │  NOVELTY DECAY       │            │
│    │  DETECTOR (AUC=0.79)│            │
│    └─────────────────────┘            │
└────────────────────────────────────┘
```

Caption: "4 components integrated: AI Vision → Gamification → Behavioral Profiling → Adaptive Intervention"

---

### COLUMN 3: RCT DESIGN

**Visual: 4-group comparison boxes**

```
┌────────────────────────────────────┐
│        24-WEEK RCT — 4 GROUPS      │
│                                     │
│  N=222 students, Grade 6-9         │
│  Stratified by behavioral profile    │
│                                     │
│  ┌─────────────────────────────┐   │
│  │ CONTROL (n=55)              │   │
│  │ Baseline bins only           │   │
│  │ Retention: 28.4% ████░░░░░░ │   │
│  └─────────────────────────────┘   │
│  ┌─────────────────────────────┐   │
│  │ EXP-A (n=56)               │   │
│  │ AI Vision Only              │   │
│  │ Retention: 41.3% ███████░░ │   │
│  └─────────────────────────────┘   │
│  ┌─────────────────────────────┐   │
│  │ EXP-B (n=56)               │   │
│  │ AI + Full Gamification       │   │
│  │ Retention: 73.1% ██████████░ │ │
│  └─────────────────────────────┘   │
│  ┌─────────────────────────────┐   │
│  │ EXP-C (n=55) ★            │   │
│  │ AI + Gam + Adaptive        │   │
│  │ Retention: 89.3% ██████████ │   │
│  └─────────────────────────────┘   │
│                                     │
│  p < 0.001***, Cohen's d = 1.42   │
└────────────────────────────────────┘
```

Bar width proportional to retention %. Color gradient: darker green = higher.

---

### COLUMN 4: KEY RESULTS — Retention

**Visual: Kaplan-Meier-inspired bar chart**

```
┌────────────────────────────────────┐
│  RETENTION AT WEEK 12                │
│                                     │
│  100%┤                             │
│      │ ▓▓▓▓▓▓▓▓▓▓▓▓▓▓▓▓▓▓▓ Exp-C │
│   90%├▓▓▓▓▓▓▓▓▓▓▓▓▓▓▓▓▓▓▓ 89.3%│
│      │      ▓▓▓▓▓▓▓▓▓▓ Exp-B │
│   70%├▓▓▓▓▓▓▓▓▓▓▓▓▓▓▓ 73.1%  │
│      │           ▓▓▓▓▓ Exp-A │
│   40%├▓▓▓▓▓▓▓▓▓ 41.3%            │
│      │               ▓▓ Ctrl │
│   30%├▓▓▓▓▓ 28.4%                  │
│      └────────────────────────  │
│      Wk0   Wk4   Wk8   Wk12        │
│                                     │
│  Log-rank: χ²(3) = 41.7, p<0.001***│
│  HR = 0.09 vs Control (91% lower risk)│
└────────────────────────────────────┘
```

---

### ROW 2 LEFT (2 cols): SHAPLEY VALUES

**Visual: Horizontal bar chart**

```
┌──────────────────────────────────────────────────────────┐
│  WHAT DRIVES RETENTION?                                   │
│  Shapley Value Decomposition (n=206)                      │
│                                                           │
│  Streak System          ████████████████████████████░░░░░ │
│  (38.5%)                 38.5%                          │
│                                                           │
│  Points Feedback       █████████████████████░░░░░░░░░░░░░░ │
│  (29.1%)                 29.1%                           │
│                                                           │
│  Robot Emotional HMI  ████████████░░░░░░░░░░░░░░░░░░░░░░ │
│  (17.2%)                 17.2%                         │
│                                                           │
│  Badge/Achievement   ██████░░░░░░░░░░░░░░░░░░░░░░░░░░░░ │
│  (9.8%)                  9.8%                          │
│                                                           │
│  Leaderboard          ███░░░░░░░░░░░░░░░░░░░░░░░░░░░░░░ │
│  (5.4%)                  5.4%                         │
│                                                           │
│  Insight: Loss aversion (Kahneman & Tversky) drives       │
│  streak effect — students fear losing their chain.         │
└──────────────────────────────────────────────────────────┘
```

Green gradient bars, sorted descending.

---

### ROW 2 MIDDLE: NOVELTY DECAY DETECTOR

**Visual: Line chart with intervention points**

```
┌────────────────────────────────────┐
│  NOVELTY DECAY DETECTOR              │
│  Predicts Dropout 7 Days Ahead       │
│                                     │
│  1.0┤ ●                            │
│     │   ╲  ●NDD Alert              │
│  0.8├────╲────● RecoveryIntervention│
│     │       ╲                        │
│  0.6├────────╲─────── Flat curve   │
│     │           ╲                    │
│  0.4├─────────────╲────● Exp-C     │
│     │               ╲               │
│  0.2├─────────────────╲─── Exp-B    │
│     │                   ╲            │
│   0%└──────────────────────        │
│      Wk1  Wk3  Wk6  Wk8  Wk12     │
│                                     │
│  AUC-ROC = 0.79 [0.72, 0.86]       │
│  Sensitivity 73% | Specificity 76%   │
│                                     │
│  Recovery: Mild 78% | Mod 72%       │
└────────────────────────────────────┘
```

---

### ROW 2 RIGHT: AI VISION PERFORMANCE

**Visual: Mini confusion matrix heatmap**

```
┌────────────────────────────────────┐
│  AI WASTE CLASSIFICATION            │
│  YOLOv8n on TDN-Waste-1000         │
│  n=1,024 ground-truth images        │
│                                     │
│         Pl  Pa  Gl  Me  Or  Haz   │
│  Pl   ██  █   █   █   █   █     │
│  Pa   █   ██  █   █   █   █     │
│  Gl   ██  █   █   █   █   █     │
│  Me   █   █   █   ██  █   █     │
│  Or   █   █   █   █   ██  █     │
│  Haz  █   █   █   █   █   ██    │
│                                     │
│  Accuracy: 73.2% | F1: 0.70       │
│  Latency: 340ms (Raspberry Pi 4)    │
│                                     │
│  Best: Plastic (F1=0.76)           │
│  Hardest: Hazardous (F1=0.62)      │
└────────────────────────────────────┘
```

Color scale: green = high diagonal, red = misclassification.

---

### BOTTOM STRIP: CONCLUSION

```
┌──────────────────────────────────────────────────────────────────────────────────────┐
│  CONCLUSIONS                                                                             │
│  ✓ Exp-C reduces dropout risk by 91% (HR=0.09, p<0.001)                             │
│  ✓ Streak mechanics drive 38.5% of retention improvement                               │
│  ✓ NDD predicts dropout 7 days early (AUC=0.79)                                        │
│  ✓ YOLOv8n achieves 73.2% accuracy on Vietnamese school waste dataset                   │
│                                                                                         │
│  COST: < $150/unit | OPEN SOURCE | SCALABLE | FIRST RCT IN VIETNAM FOR ADAPTIVE GAMIFICATION│
│                                                                                         │
│  Team: Pham Minh Nhat + Nguyen Minh Duc | Mentor: MSc. Tran Hoang Duy | Tran Dai Nghia    │
└──────────────────────────────────────────────────────────────────────────────────────┘
```

---

## SLIDES OUTLINE (12 minutes + Q&A)

### Slide 1: Title (30s)
- Title: "Adaptive Behavioral Intervention in School-Based Environmental Education"
- Subtitle: "A Randomized Controlled Trial of Gamification, AI Personalization, and Human-Robot Interaction"
- Team: Pham Minh Nhat, Nguyen Minh Duc
- Mentor: MSc. Tran Hoang Duy
- School: THCS & THPT Tran Dai Nghia, HCMC, Vietnam
- Category: Reg-Env / Environmental Science / 04

### Slide 2: The Problem — KAP Gap (30s)
- Law: Article 79, Environmental Protection Law 2020 mandates source separation
- Gap: 61.7% self-report vs 30% observed (baseline camera data, n=222)
- Impact: If correct sorting is 30%, recycling contamination is severe
- Call to action: "We need behavior change, not just bins"

### Slide 3: Research Questions (30s)
- RQ1: Does each intervention layer (AI → AI+Gam → AI+Gam+Adapt) improve retention?
- RQ2: Which gamification mechanic contributes most to behavior change?
- RQ3: Can we detect and prevent dropout before it happens?
- RQ4: Can edge AI achieve sufficient accuracy for school deployment?

### Slide 4: Theoretical Framework (45s)
Three core theories only:
1. **Operant Conditioning (Skinner)**: Variable reinforcement → points + gacha
2. **Self-Determination Theory (Deci & Ryan)**: Autonomy + Competence + Relatedness
3. **Habit Formation (Wood & Neal)**: Cue-Routine-Reward Loop → streak system

### Slide 5: ABIS Architecture (45s)
- Diagram: Student → BMO Robot + Camera → AI Vision (YOLOv8n) → LCD Feedback
- Gamification Layer: Points + Streaks + Leaderboards + Badges + Gacha
- Adaptive Layer: Behavioral Profiler + Novelty Decay Detector + Adaptive Reward Engine
- Hardware: Raspberry Pi 4 + Camera Module 3 + LCD 7" — < $150 total

### Slide 6: RCT Design (45s)
- 4 groups: Control, Exp-A (AI only), Exp-B (AI+Gam), Exp-C (Full ABIS)
- N=222, Grade 6-9, 24 weeks
- Stratified by behavioral profile
- CONSORT flowchart

### Slide 7: AI Vision Results (45s)
- TDN-Waste-1000: 1,024 images, 6 categories
- YOLOv8n: 73.2% accuracy, 340ms latency
- Benchmark: Gemini 78.3% vs YOLOv8n 73.2% (but YOLOv8n runs offline on Pi)
- Per-class: Plastic best (F1=0.76), Hazard hardest (F1=0.62)

### Slide 8: Behavioral Profiler (30s)
- 5 profiles: competitive, collector, casual, streak_driven, social
- Gemini 2.5 Flash classification: Cohen's Kappa = 0.84
- Profile distribution pie chart
- Key insight: casual + social profiles benefit most from adaptive personalization

### Slide 9: Novelty Decay Detector (45s)
- Engagement score trajectory (line chart)
- NDD: AUC-ROC = 0.79 for 7-day dropout prediction
- 7 intervention actions: new_event, mission_shuffle, dialogue_refresh, reward_shift, hidden_challenge, streak_reminder, social_nudge
- Recovery rates: Mild 78%, Moderate 72%, Severe 62%

### Slide 10: Retention Results (30s)
- Bar chart: Control 28.4%, Exp-A 41.3%, Exp-B 73.1%, Exp-C 89.3%
- p < 0.001***, Cohen's d = 1.42
- The KEY finding: Gamification contributes more than AI vision alone

### Slide 11: Kaplan-Meier Survival Curves (45s)
- 4 survival curves (color-coded)
- Log-rank: χ²(3) = 41.7, p < 0.001***
- Exp-C median survival: 142 days vs Control 18 days
- HR = 0.09: 91% lower dropout risk

### Slide 12: Mechanism Decomposition (45s)
- Shapley value bar chart (sorted)
- Streak: 38.5% — #1 driver
- Points: 29.1%
- Robot HMI: 17.2%
- Badge: 9.8%
- Leaderboard: 5.4%
- Scientific interpretation: Loss aversion drives streak effect

### Slide 13: Discussion — Why Is The Effect So Large? (45s)
- Honest assessment: d=1.42 is 3.8x meta-analytic average
- Contributing factors: HRI novelty, single-school enthusiasm, Hawthorne effect
- Relative ordering (Ctrl < A < B < C) is robust
- Multi-school replication needed

### Slide 14: Limitations & Future Work (30s)
- Single school, convenience sampling
- 12 weeks (habit formation needs 3-6 months)
- Hawthorne effect
- Future: multi-school RCT, dataset expansion, 12-month follow-up

### Slide 15: Impact & Scalability (30s)
- Cost: < $150/deployment unit
- Raspberry Pi 4 + Camera + LCD — available globally
- Novelty Decay Detector: portable to any gamification app
- TDN-Waste-1000: first dataset for Vietnamese school waste

### Slide 16: QR Code (15s)
- QR → GitHub repo, OSF pre-registration, live demo video
- "Thank you! Questions?"

---

## LIVE DEMO SCRIPT (3-5 minutes at poster)

**1. Introduction (30 seconds)**
- "This is BMO — a robot that teaches students to sort waste correctly."
- Point to physical robot or show on-screen BMO

**2. Live AI Classification (1 minute)**
- Pick up a plastic bottle → scan with camera
- Show real-time classification: "Plastic — recycle in blue bin"
- Show confidence score and latency

**3. BMO Care — Virtual Pet (30 seconds)**
- "BMO has feelings! Let me show you..."
- Show BMO mood level and accessories
- Demonstrate mood change with correct answer

**4. Waste Rush Challenge (1 minute)**
- "Want to try? 60 seconds, sort as fast as you can!"
- Show combo multiplier going up

**5. Statistical Results (1 minute)**
- Point to Kaplan-Meier curves: "Exp-C keeps 89% after 12 weeks"
- Point to Shapley: "Streaks matter most — 38.5%"
- Point to NDD: "We can predict dropout 7 days ahead"

**6. Close (30 seconds)**
- "This costs under $150. It can run in any Vietnamese school."
- "We pre-registered this RCT on OSF before collecting data."
- QR code to GitHub, dataset, pre-registration
