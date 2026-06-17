# Data Specification — ABIS RCT Replication Package

## Overview

This document defines the schema, variable types, and coding conventions for all datasets used in the ABIS RCT analysis.

---

## survival_data.csv — Time-to-Event Data

Used for Kaplan-Meier survival analysis and Cox regression.

| Variable | Type | Description | Values |
|---|---|---|---|
| `user_id` | String | Anonymized user identifier | e.g., `SUBJ_001` |
| `group` | Integer | Experimental group assignment | 0=Control, 1=Exp-A, 2=Exp-B, 3=Exp-C |
| `profile_type` | Integer | Behavioral profile classification | 0=competitive, 1=collector, 2=casual, 3=streak_driven, 4=social |
| `days_to_event` | Integer | Days from enrollment to event or censoring | 1–168 (24 weeks) |
| `churned` | Integer | Event indicator | 1=churned (event), 0=censored (active) |
| `baseline_kap` | Float | Baseline KAP score | 0.0–1.0 |
| `grade` | Integer | Grade level | 6, 7, 8, 9 |
| `gender` | Integer | Gender | 0=female, 1=male |

### Event Definition

- **Event (churned = 1):** No app login for 7 consecutive days
- **Censored (churned = 0):** User still active at analysis cutoff (Week 12) or withdrew from study

### Example

```csv
user_id,group,profile_type,days_to_event,churned,baseline_kap,grade,gender
SUBJ_001,3,3,142,0,0.75,8,1
SUBJ_002,0,1,23,1,0.40,7,0
SUBJ_003,2,4,98,0,0.65,8,1
```

---

## retention_data.csv — Binary Retention per Week

Used for mixed-effects logistic regression and longitudinal analysis.

| Variable | Type | Description | Values |
|---|---|---|---|
| `user_id` | String | Anonymized user identifier | e.g., `SUBJ_001` |
| `week` | Integer | Week number | 1–24 |
| `group` | Integer | Experimental group | 0=Control, 1=Exp-A, 2=Exp-B, 3=Exp-C |
| `profile_type` | Integer | Behavioral profile | 0–4 |
| `baseline_kap` | Float | Baseline KAP score | 0.0–1.0 |
| `retained` | Integer | 7-day retention outcome | 1=retained, 0=churned |
| `engagement_score` | Float | Composite engagement (0–1) | 0.0–1.0 |
| `grade` | Integer | Grade level | 6–9 |
| `gender` | Integer | Gender | 0=female, 1=male |

### Missing Data Handling

- Missing values coded as `NA` (not as 0 or imputed values)
- **DO NOT** use LOCF for binary retention — use `mixedLogisticRegression()` function
- Mixed-effects models handle missing at random (MAR) automatically

### Example

```csv
user_id,week,group,profile_type,baseline_kap,retained,engagement_score,grade,gender
SUBJ_001,1,3,3,0.75,1,0.89,8,1
SUBJ_001,2,3,3,0.75,1,0.87,8,1
SUBJ_001,3,3,3,0.75,1,0.84,8,1
...
SUBJ_002,1,0,1,0.40,1,0.72,7,0
SUBJ_002,2,0,1,0.40,0,NA,7,0
SUBJ_002,3,0,1,0.40,0,NA,7,0
```

---

## mechanism_data.csv — Shapley Value Decomposition Input

Used for coalition game analysis to determine each gamification mechanic's contribution.

| Variable | Type | Description | Values |
|---|---|---|---|
| `user_id` | String | Anonymized user identifier | e.g., `SUBJ_001` |
| `group` | Integer | Experimental group | 0–3 |
| `streak_active` | Integer | Streak mechanic enabled | 0=no, 1=yes |
| `points_active` | Integer | Points feedback enabled | 0=no, 1=yes |
| `robot_active` | Integer | Robot HMI enabled | 0=no, 1=yes |
| `badge_active` | Integer | Badge system enabled | 0=no, 1=yes |
| `leaderboard_active` | Integer | Leaderboard enabled | 0=no, 1=yes |
| `retention_score` | Float | Retention score for this coalition | 0.0–1.0 |

### Shapley Value Computation

```python
# Coalition worth = retention score
# Players = ['streak', 'points', 'robot', 'badge', 'leaderboard']

def worth_function(coalition):
    # coalition: list of active mechanics
    # return: average retention for users with exactly this coalition
    subset = mechanism_data[
        (mechanism_data['streak_active'] == ('streak' in coalition)) &
        ...
    ]
    return subset['retention_score'].mean()
```

### Example

```csv
user_id,group,streak_active,points_active,robot_active,badge_active,leaderboard_active,retention_score
SUBJ_001,2,1,1,0,1,1,0.82
SUBJ_002,0,0,0,0,0,0,0.31
SUBJ_003,3,1,1,1,1,1,0.89
```

---

## ai_metrics.csv — Vision Model Benchmark

| Variable | Type | Description | Values |
|---|---|---|---|
| `model` | String | Model name | gemini, yolov8n, efficientnet, mobilenet |
| `image_id` | String | Image identifier | e.g., `IMG_001` |
| `true_category` | String | Ground truth label | plastic, paper, glass, metal, organic, hazard |
| `predicted_category` | String | Model prediction | plastic, paper, glass, metal, organic, hazard |
| `confidence` | Float | Model confidence | 0.0–1.0 |
| `latency_ms` | Integer | Inference time | milliseconds |
| `lighting_condition` | String | Lighting metadata | indoor_natural, indoor_artificial, mixed |
| `occlusion_level` | Integer | Occlusion severity | 0=none, 1=partial, 2=heavy |

### Example

```csv
model,image_id,true_category,predicted_category,confidence,latency_ms,lighting_condition,occlusion_level
yolov8n,IMG_001,plastic,plastic,0.82,340,indoor_natural,0
yolov8n,IMG_002,glass,plastic,0.71,380,indoor_artificial,1
gemini,IMG_001,plastic,plastic,0.91,950,indoor_natural,0
```

---

## behavioral_profiles.csv — Profile Classification

| Variable | Type | Description | Values |
|---|---|---|---|
| `user_id` | String | Anonymized user identifier | e.g., `SUBJ_001` |
| `ai_profile` | String | Gemini-classified profile | competitive, collector, casual, streak_driven, social |
| `ai_confidence` | Float | AI classification confidence | 0.0–1.0 |
| `rule_profile` | String | Rule-based classification | competitive, collector, casual, streak_driven, social |
| `profile_score_competitive` | Float | Multi-dimensional score | 0.0–1.0 |
| `profile_score_collector` | Float | Multi-dimensional score | 0.0–1.0 |
| `profile_score_casual` | Float | Multi-dimensional score | 0.0–1.0 |
| `profile_score_streak_driven` | Float | Multi-dimensional score | 0.0–1.0 |
| `profile_score_social` | Float | Multi-dimensional score | 0.0–1.0 |
| `login_frequency` | Float | Logins per week | 0.0–∞ |
| `streak_stability` | Float | Streak consistency | 0.0–1.0 |
| `reward_response_rate` | Float | Earned/spent ratio | 0.0–1.0 |
| `avg_session_duration` | Float | Seconds per session | 0.0–∞ |
| `feature_diversity` | Float | Features used / total | 0.0–1.0 |
| `leaderboard_views` | Float | Views per week | 0.0–∞ |

---

## Variable Codebook

### Group Coding

| Code | Group Name | Description |
|---|---|---|
| 0 | Control | Baseline: no gamification, no AI |
| 1 | Exp-A | AI vision only (YOLOv8n) |
| 2 | Exp-B | AI + full gamification (all 5 mechanics) |
| 3 | Exp-C | AI + gamification + adaptive personalization |

### Profile Coding

| Code | Profile | Key Characteristics |
|---|---|---|
| 0 | competitive | High leaderboard engagement |
| 1 | collector | High gacha, badge focus |
| 2 | casual | Low overall engagement |
| 3 | streak_driven | Streak maintenance focus |
| 4 | social | High social interaction |

### Waste Category Coding

| Code | Category | Vietnamese | Description |
|---|---|---|---|
| 0 | plastic | Nhựa | Recyclable plastic |
| 1 | paper | Giấy | Paper/cardboard |
| 2 | glass | Thủy tinh | Glass bottles |
| 3 | metal | Kim loại | Metal cans |
| 4 | organic | Hữu cơ | Food waste |
| 5 | hazard | Nguy hại | Batteries, chemicals |

### Missing Data Codes

| Value | Meaning |
|---|---|
| `NA` | Not available (missing at random) |
| `NA_MAR` | Missing at random (handled by mixed-effects) |
| `NA_MNAR` | Missing not at random (sensitivity analysis needed) |
| `NA_SYSTEM` | System failure (excluded from analysis) |

---

## Data Dictionary Notes

1. **Anonymization**: All `user_id` values are anonymized sequential codes (`SUBJ_001`, `SUBJ_002`, etc.). No real names or student IDs are included.

2. **Temporal ordering**: Week 1 is the first week after randomization. Baseline data (pre-randomization) is not included in survival analysis.

3. **Censoring**: Users who moved schools or withdrew consent are right-censored at their last known active day (not at the withdrawal date, to avoid immortal time bias).

4. **Primary outcome**: 7-day retention — a user is considered "retained" in week W if they logged in at least once during days (7W-6) to (7W).

5. **Engagement score**: Composite metric = (login_frequency / max_login) × 0.3 + (session_duration / max_session) × 0.3 + (feature_diversity) × 0.2 + (streak_stability) × 0.2

---

## Export Instructions

```python
# Export from PostgreSQL (example queries)

# Survival data
SELECT
    u.user_id,
    e.group_name,
    b.profile_type,
    EXTRACT(DAY FROM (e.last_event - e.enrolled_at)) as days_to_event,
    CASE WHEN e.last_event < NOW() - INTERVAL '7 days' THEN 1 ELSE 0 END as churned,
    r.baseline_kap
FROM research_users u
JOIN experiment_assignments e ON e.user_id = u.user_id
JOIN user_behavioral_profiles b ON b.user_id = u.user_id
JOIN research_kap_baseline r ON r.user_id = u.user_id
```

---

## Data Quality Checks

Run these checks before analysis:

```python
# 1. Check for impossible values
assert retention_data['retained'].isin([0, 1]).all()
assert retention_data['week'].between(1, 24).all()
assert survival_data['churned'].isin([0, 1]).all()
assert survival_data['days_to_event'] > 0

# 2. Check group balance
group_counts = survival_data.groupby('group').size()
assert group_counts.min() >= 45  # At least 45 per group after attrition

# 3. Check for duplicate user-weeks
assert len(retention_data) == retention_data.groupby(['user_id', 'week']).ngroups

# 4. Check missing data pattern (should be random, not systematic)
missing_by_group = retention_data.groupby('group').apply(
    lambda x: x['retained'].isna().mean()
)
assert missing_by_group.max() - missing_by_group.min() < 0.05  # <5% imbalance
```
