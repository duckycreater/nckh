# IRB / Ethics Application — BMO Robot Multi-School RCT

This is the draft ethics application for submission to the partner university's Institutional Review Board. It uses the **Belmont Report** framework (Respect for Persons, Beneficence, Justice) plus the **AOPSIR** checklist for adolescent research (COPPA + GDPR-K compliance).

---

## 1. Project Title

**A Privacy-Preserving Federated AI Platform for Sustainable Waste Sorting: A Multi-School Randomized Controlled Trial (BMO Robot).**

## 2. Investigators & Affiliations

| Role | Name | Affiliation |
|---|---|---|
| PI | [TBD] | [School] |
| Co-PI | [TBD] | [Lab] |
| Faculty Mentor | [TBD] | [University department] |

## 3. Objectives

The project's primary academic objective is to evaluate whether a multi-component AI + behaviour-change intervention (BMO Robot) improves secondary-school students' waste-sorting accuracy, retention, and environmental identity, in compliance with privacy regulations. The team's prior implementation work has been IRB-exempt (educational deployment); **this is the first IRB application because the project introduces randomisation + research-grade data collection**.

## 4. Methods Summary

- Cluster-randomised 5-arm trial across ≥ 5 Vietnamese secondary schools.
- N = 600 (5 schools × ≥ 120 students per cohort).
- 10-week active intervention + 4-week follow-up.
- Wave-1 (week 0): baseline survey + onboarding + consent.
- Wave-2 (weeks 1–10): intervention.
- Wave-3 (weeks 10–14): post-survey + retention measurement.
- All data pseudonymised at ingestion. Federated learning aggregates weight-deltas only — **no raw images uploaded from < 13 yo users**.

## 5. Belmont Principles

### 5.1 Respect for Persons

- **Informed consent** is bilingual (Vietnamese + English) and required from a parent/guardian for students < 13 yo; required from students 13–17 yo themselves.
- The consent form explains randomisation (some students will not receive BMO), the use of weight-deltas (not raw images), the right to withdraw at any time without penalty, and contact details for the data-protection officer.
- **Child assent** is collected separately with age-appropriate language and visual confirmation that the child understands the activity.
- For adolescents 16–17 yo the consent form is in three languages (VI/EN/optional third) and explicitly cites COPPA + GDPR-K protections.

### 5.2 Beneficence

- **Anticipated benefit:** students in treatment arms (E1–E4) gain access to an AI tutor that improves their category-recognition accuracy. Pilot studies suggest +12 percentage-point accuracy gain.
- **Anticipated risk:** minimal. The intervention exposes no category of harm beyond the routine risk of any smartphone app (online time, occasional frustration during scan retries).
- **Risk minimisation:**
  - All scans are processed on-device; raw images never leave the student's phone for < 13 yo cohort (COPPA/GDPR-K compliance).
  - Treatment is opt-out at any time; data already collected can be deleted on request (right-to-be-forgotten).
  - No data shared with commercial advertisers.
  - The control arm C receives the BMO app after the 14-week follow-up.

### 5.3 Justice

- **Inclusive recruitment:** schools are selected across three Vietnamese provinces (HCMC, Hanoi, Da Nang) to spread geographic and economic distribution. The RCT does not exclude students with disabilities (the BMO voice interface `VoiceInterface.tsx` is compliant).
- **Compensation:** none — participation is voluntary. Per-school compensation is a small engagement gift (≤ 5 USD per student) covering pencils/branded stickers.
- **Post-trial access:** all schools receive BMO access for ≥ 12 months after trial close; data published openly on GitHub + Zenodo DOI.
- **Community engagement:** the team will run a 1-hour community webinar per school explaining findings.

## 6. Privacy & Data Protection

### 6.1 COPPA (Children's Online Privacy Protection Act)

BMO does **not** collect, store, or transmit personally-identifiable information (PII) from users under 13. Concretely:

- Raw scan images are processed on-device via the ONNX model. The image is discarded immediately after classification.
- Only weight-deltas + DP noise are sent to the FL server.
- The parental consent record (id-only, not the parent's identity) is held separately from any research data.

### 6.2 GDPR-Kids / GDPR Article 8

The consent flow implements **verifiable parental consent** through:

1. Email verification (parents receive a signed-link with a one-time token).
2. ID check optional for high-stakes deployments; we use only (1) for low-stakes classroom pilots.
3. A separate privacy notice in child-appropriate language.

### 6.3 Differential Privacy budget

Per [dpAccountant.ts](../../src/services/dpAccountant.ts), cumulative Rényi-DP budget is capped at **ε ≤ 1.0, δ = 1e-5** across 50 FL rounds. Weight-deltas use L2-clipping at 1.0 + Gaussian σ calibrated via Rényi DP composition (Mironov 2017). This is tighter than the de-facto "ε = 1, δ = 1e-5 per round" used by industry [Apple Differential Privacy Whitepaper].

### 6.4 Tamper-evident audit

[auditTrail.ts](../../server/services/auditTrail.ts) (planned per `T15` todo) emits a Merkle-tree-rooted audit log into the [Supabase privacy_audit_log](../../docs/db_schema_privacy.md) table. Every weight update + cohort assignment is hashed and chained, allowing external auditors to verify that no image data ever leaked from the device.

## 7. Risks and Mitigation

| Risk | Probability | Severity | Mitigation |
|---|---|---|---|
| Identity deanonymisation via biometric inference on scan metadata | Very low | Medium | DP noise enforces indistinguishability; we do not log per-scan sensor data; only aggregate features reach the server |
| Parental objection to randomisation | Low | High | Parents can withdraw their child via the parent-portal link emailed at consent; the child's data is then deleted immediately |
| Adverse novelty-effect (engagement drops sharply after week 3) | Medium | Low | `lossAversionEngine.ts` mitigates; data monitoring plan + interim safety review triggers protocol amendment |
| Smart-bin privacy leak (e.g., radio MAC address) | Very low | Medium | Emulator + DP-noised aggregate only; no real bins deployed during pilot |

## 8. Consent Forms

Three consent forms (Vietnamese + English) are attached as Appendices A/B/C in the supplementary ZIP:

- **A — Parental consent (under 13).**
- **B — Adolescent assent (13–17).**
- **C — School administrator agreement.**

Each includes:

1. A description of the study in plain language.
2. The right-to-withdraw clause.
3. The DP guarantee (ε = 1.0, δ = 1e-5).
4. Contact details for PI + data-protection officer.
5. Signatures (or Vietnamese-stamp equivalent).

## 9. Data Management Plan

| Data type | Storage | Retention | Sharing |
|---|---|---|---|
| Raw scan images | On-device only | n/a (deleted at inference) | n/a |
| Weight deltas | Supabase Postgres | 18 months | Public GitHub releases after 12 months |
| Survey responses | Supabase Postgres (pseudonymised) | 24 months | Public Zenodo DOI after 18 months |
| Audit logs | Supabase Postgres (Merkle-rooted) | 7 years | On request to data-protection officer |
| Cohort assignments | File system (locked, OSF) | Permanent | Public OSF URL at T41 completion |

## 10. Compliance with National Regulations

- Vietnam's **Decree 13/2023/ND-CP** on personal data protection: informed consent, purpose limitation, minimal-data principle, and data-deletion on request are all met.
- Vietnam's **MOET Circular 32/2020/TT-BGDDT**: school-level research approval process is followed; each school's principal signs the school-administrator consent (Appendix C) before randomisation.
- The lab's privacy-regulation register documents this study at /privacy/BMO-RCT.

## 11. Personnel Training

All researchers and field staff complete:

1. CITI Human Subjects Research course (group 2 social-behavioural).
2. Internal data-handling workshop (4 hours).
3. Bias and inclusion training (2 hours).

Records are maintained at /training/BMO-RCT.

## 12. Adverse Event Reporting

Any adverse event (privacy breach, mental-health concern, loss of data) is logged within 24 hours via the lab's Ethics Reporting Hotline; the IRB is notified within 7 days as required by Vietnamese regulations.

## 13. Estimated Timeline

| Item | Date |
|---|---|
| IRB submission | [Month 1, week 1] |
| IRB approval anticipated | [Month 1, week 4] |
| Pilot real-world RCT starts | [Month 4] |
| Pilot real-world RCT ends | [Month 14] |
| Final report to IRB | [Month 16] |

## 14. Appendices (held separately)

- A — Parental consent (VI/EN).
- B — Adolescent assent (VI/EN).
- C — School administrator agreement.
- D — Plain-language privacy guarantee.
- E — Data-flow diagram.

---

> "We treat adolescent learners as participants, not subjects. Their privacy is non-negotiable; their right to leave the study is non-negotiable; their dignity in the post-trial dissemination is non-negotiable."
