# OSF Pre-Registration — BMO Robot Multi-School RCT

This file follows the Open Science Framework **AsPredicted-style** template extended for cluster-randomised trials. It is the exact content that will be uploaded to https://osf.io before any real-pilot data collection begins. Once submitted, the OSF URL will be hashed into the bottom of this file.

---

## Title

**A Privacy-Preserving Federated AI Platform for Sustainable Waste Sorting: A Multi-School Randomized Controlled Trial Toward UN SDG 12.5 and 13.3.**

## Authors

- [PI Name], [Affiliation]
- [Co-PI 1], [Affiliation]
- [Co-PI 2], [Affiliation]

## Date of registration

[To be filled upon OSF submission]

## Study design

- **Type:** Cluster-randomised controlled trial (5 arms × 5 schools × ≥ 120 students, target N ≈ 600).
- **Unit of randomisation:** School (to avoid within-school contamination).
- **Follow-up duration:** 10-week active intervention + 4-week follow-up.
- **Pre-registration lock date:** [same as registration date].
- **Hypothesis lock:** No analytical changes will be presented as confirmatory after registration.

## Research questions

1. **RQ1 — AI/ROBO:** Does self-supervised SimCLR pretraining of the on-device Vietnamese waste classifier reduce the labelling burden for new schools by ≥ 50% while maintaining ≥ 92% top-1 accuracy?
2. **RQ2 — FL/Privacy:** Does Rényi-DP composition (vs. advanced composition) enable ≥ 50 federated training rounds at ε ≤ 1.0, δ = 1e-5 across ≥ 5 schools without measurable accuracy loss?
3. **RQ3 — Behavioural:** Does the BMO stack (vs. passive education control) increase (a) sort accuracy, (b) D30 retention, (c) environmental identity (EID-4) by effect sizes d ≥ 0.40?
4. **RQ4 — SDG Impact:** Does BMO + smart-bin collection optimisation reduce missed-collection CO₂e by ≥ 20% vs. fixed-route baseline?

## Hypotheses

- **H₁ (primary):** E4 cohort (full stack + identity-prime) shows an average increase in Whitmarsh–O'Neill environmental identity of **d ≥ 0.40** relative to control C at α = 0.05/3 (Bonferroni-corrected for three primary outcomes), with statistical power ≥ 0.80.
- **H₀ (null):** No statistically significant differences between cohorts at α = 0.05.

## Sampling plan

- **Population:** Vietnamese secondary-school students (THPT, grades 10–12), 12–17 years old, with parental consent.
- **Recruitment:** Through Ministry-of-Education partner schools in HCMC, Hanoi, Da Nang. Target ≥ 5 schools × ≥ 120 consented students.
- **Exclusion criteria:** < 13 years without parent consent; absent > 2 consecutive weeks; prior BMO user.

## Variables

### Independent variables (treatment)

- **C** — standard civic-education curriculum.
- **E1** — C + BMO gamification only.
- **E2** — E1 + Federated Learning (on-device).
- **E3** — E2 + Smart-bin Digital Twin.
- **E4** — E3 + Identity-Prime messaging.

### Dependent variables (outcomes)

**Primary:**
- Sort accuracy rate (%).
- 30-day retention rate (%).
- Environmental identity (Whitmarsh–O'Neill EID-4, normalised to 0..1).

**Secondary:**
- kg CO₂e avoided / user / week (EPA WARM v15).
- FL rounds with ε ≤ 1.0 (count).
- Privacy audit log completeness (%).
- Self-reported motivation (EID-4 subscale).
- Self-reported peer network influence (1-item, 1..7).

**Mediators (pre-registered):**
- COM-B subscores from `src/services/theoryOfChange.ts` (capability, opportunity, motivation, behaviour).
- Self-concept as a sorter (1-item, 1..7).
- Loss-aversion event response rate.

**Moderators (pre-registered):**
- Baseline EID-4.
- Self-reported digital literacy (1-item).
- Household composition (1-item).

## Analysis plan

### Primary analyses

1. **Welch's t-test** comparing E4 vs C on identity-score change (week 10 − week 0). Multiple-comparison correction: Holm–Bonferroni across the three primary outcomes.
2. **Mixed-effects logistic regression** of sort accuracy with cohort fixed effects and school random intercepts (lme4-style specification; statsmodels in Python).
3. **Hierarchical mixed-effects logistic regression** for retention with the same structure.

### Secondary analyses

- Mediation via Baron & Kenny bootstrap (95% CI from 5,000 resamples) for COM-B subscores.
- Moderation via subgroup tests: baseline EID-4 × cohort.
- Sensitivity analyses with multiple imputation for missing data.

### Power analysis

- **Effect size target:** d = 0.40 (Cohen's small-to-medium).
- **α:** 0.05 / 3 = 0.017 (Bonferroni-corrected for three primary outcomes).
- **Power:** ≥ 0.80.
- **Sample size:** N = 600 (5 schools × 120 students).
- **ICC:** assumed 0.10 (typical for school-level behavioural interventions).

### Stopping rules

- **Interim analysis:** at week 6, blinded to cohort assignment, examine total scan volume across all cohorts. If E4 cohort shows ≥ 2 SD lower engagement than C (suggesting harm), the trial will pause for safety review by the IRB.
- **Final analysis:** after week 14 follow-up; pre-registered analysis script lives in `scripts/analysis_synthetic.py` and will be locked at OSF submission time.

## Data management

- **Raw data** stored in Supabase (Postgres) tables: `ai_scan_metrics`, `user_engagement_log`, `eid_surveys`, `privacy_audit_log`, `federated_rounds`.
- **Anonymisation:** All identifiers pseudonymised at ingestion; re-identification requires dual-key access.
- **Sharing:** De-identified data + analysis code public on GitHub + Zenodo DOI upon paper publication.
- **Storage:** BMO server stores only weight deltas + DP noise; never stores raw scan images from < 13 yo users (COPPA + GDPR-K compliance).

## Ethics

- **IRB approval:** [pending — see IRB_ETHICS.md].
- **Informed consent:** Parent + student assent obtained via the BMO onboarding flow before any randomisation.
- **Right-to-withdraw:** Immediate; school-side opt-out at any time; data deleted on request.

## Conflicts of interest

- None declared.
- The platform is developed by [the authors / lab] and is open-source; no commercial sponsorship.
- All analyses are pre-registered; no post-hoc changes to analysis plan will be reported as confirmatory.

## References

- Michie, S., van Stralen, M.M., & West, R. (2011). *The behaviour change wheel*. Implementation Science 6:42.
- Whitmarsh, L., & O'Neill, S. (2010). *Green identity, green living?* J. Environmental Psychology 30(3): 305–314.
- Mironov, I. (2017). *Rényi differential privacy*. IEEE CSF.
- McMahan, B., et al. (2017). *Communication-efficient learning of deep networks from decentralized data*. AISTATS.
- Cohen, J. (1988). *Statistical power analysis for the behavioral sciences*. Erlbaum.
- Baron, R.M., & Kenny, D.A. (1986). *The moderator-mediator variable distinction*. JPSP 51:1173–1182.
- Schulz, K.F., et al. (2010). *CONSORT 2010 Statement: updated guidelines for reporting parallel group randomised trials*. BMJ 340:c332.

---

## OSF Submission Checklist

- [ ] Create OSF account
- [ ] Create new project "BMO Robot Vietnam RCT"
- [ ] Upload this file + `RESEARCH_PROPOSAL.md` + `THEORY_OF_CHANGE.md` + `synthetic_rct_results.md`
- [ ] Add the synthesised data from `scripts/synthetic_rct.py` as a separate component
- [ ] Add `server/services/rctEngine.ts` + `src/services/dpAccountant.ts` as supplementary code components
- [ ] Add `docs/isef/PAPER_DRAFT.md` as a paper draft
- [ ] Add `reports/benchmark_vs_dwaste.md` as an additional supporting materials component
- [ ] Make project public (default for OSF pre-registrations)
- [ ] Append final OSF URL below

**Final OSF URL:** [To be filled upon submission]
