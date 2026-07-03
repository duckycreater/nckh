# Paper Draft — Outline (8–12 pages, ISEF format)

This is the **section-by-section outline** of the BMO Robot ISEF paper (8–12 pages, single-column, ISEF 2024-2026 format). Each section has a target length and a list of bullets indicating the intended content. Numbers will be filled after the synthetic RCT pilot (T36–T40) and the full literature review (T4).

---

## Title (~120 chars)

**Privacy-Preserving Federated AI for Sustainable Waste Sorting: A Multi-School Randomized Controlled Trial Toward UN SDG 12.5 and 13.3**

> Backup title: "Can a smartphone app reshape how teenagers sort their waste? An RCT of BMO Robot across five Vietnamese high schools."

## Authors & Affiliations

- [Authors]
- [School], Vietnam
- Correspondence: [PI email]

## Abstract (~250 words)

Five-paragraph structure: Problem → Approach → Methods → Results (synth) → Significance. Must include:

1. One-sentence problem statement (1 sentence)
2. Approach summary — COM-B + Rényi DP + federated + smart-bin twin (2 sentences)
3. Methods — 5-arm cluster RCT, N=600 (2 sentences)
4. Synthetic RCT result (Cohen's d, confidence interval) (2–3 sentences)
5. Significance statement + awards targeted (2 sentences)

Numbers should be pulled live from `reports/synthetic_rct_results.md` (T39).

## 1. Introduction (~1 page)

- **§1.1** Vietnam's waste-recovery crisis: 30% recovery vs. OECD 50%.
- **§1.2** Why gamification alone fails (Milkman 2021 novelty-decay, West & Michie 2020).
- **§1.3** Why privacy matters (COPPA, GDPR-K) — adolescents cannot legally upload raw images.
- **§1.4** The BMO platform and the four superpowers.
- **§1.5** Four research questions (one sentence each).

> Story hook: "Imagine a 14-year-old in Hanoi scanning a plastic bottle. The image is processed on her phone in 80 ms. She gets instant feedback. The pattern that *informed* the model never left her phone — yet the model got smarter because 5,000 students in 5 schools contributed similar deltas. This paper reports the design, methodology, and first-year results of that system."

## 2. Background & Related Work (~2 pages)

- **§2.1** Computer-vision waste sorting (TrashNet, DWaste, Bircanoglu, MDPI 2025 review).
- **§2.2** Federated learning in education: limited (Konečný 2016, Mansour 2020).
- **§2.3** Rényi DP composition (Mironov 2017).
- **§2.4** COM-B + gamification meta-analysis (Hamari 2019).
- **§2.5** Smart-bin digital twins + VRP (Aazam 2016, Toth & Vigo 2014).
- **§2.6** What is missing — full summary of the four gaps.

## 3. System Architecture (~1.5 pages)

- **§3.1** On-device AI pipeline (figure: flowchart of scanner → classifier → FL client).
- **§3.2** Federated learning protocol (sequence diagram).
- **§3.3** Rényi DP composition (math + figures).
- **§3.4** Smart-bin digital twin (figure: UML).
- **§3.5** COM-B-grounded intervention stack (Theory of Change diagram).

> One figure each in this section.

## 4. Methods (~2 pages)

- **§4.1** Study design — 5-arm cluster RCT, N=600, ICC=0.10, power=0.82.
- **§4.2** Participants — Vietnamese secondary students, recruitment paths.
- **§4.3** Outcomes (primary/secondary/mediator/moderator) — table 1.
- **§4.4** Statistical analysis plan — primary tests + Holm-Bonferroni.
- **§4.5** Pre-registration and ethics — OSF URL, IRB approval #.
- **§4.6** Synthetic RCT pilot (moved from the rubric: 1,000 simulated students, results in §5).

## 5. Results (~2 pages)

- **§5.1** Synthetic RCT (Cohen's d, 95% CI per cohort).
- **§5.2** Federated model performance vs DWaste baseline (mAP, latency, energy).
- **§5.3** Rényi DP composition: rounds achieved at ε=1.0.
- **§5.4** Smart-bin VRP simulation: CO₂e saved.
- **§5.5** Real-pilot pending data (placeholder for now; Appendix B for IRB-pending schools).

> Use 4–6 figures in this section. Tables must be plain-text formatted for ISEF.

## 6. Discussion (~1.5 pages)

- **§6.1** What's novel (one paragraph per superpower).
- **§6.2** Where BMO extends the literature.
- **§6.3** Limitations (smart-bin emulator vs real bins; small Vietnamese sample; seasonality).
- **§6.4** Threats to validity (history, novelty effect, social desirability bias).
- **§6.5** Future work (FedDyn, SCAFFOLD, OR-Tools full integration).

## 7. Conclusion (~0.5 page)

- Restate 4 RQs and (synthetic) answers.
- State alignment with SDG 12.5 / 13.3.
- Call to action — release of open-source code + Zenodo DOI.

## 8. References (~1.5 pages)

~60 references using ACM APA-7 style. Generated from `LITERATURE_REVIEW.md`.

## 9. Appendices (separate documents)

- Appendix A — COM-B scoring formulas.
- Appendix B — Smart-bin emulator calibration.
- Appendix C — Rényi DP composition derivation.
- Appendix D — Survey instruments (EID-4 Vietnamese translation).
- Appendix E — Pre-registration analysis plan.

---

## Cross-references

- Full text built from `RESEARCH_PROPOSAL.md` (§1, §3).
- Synthetic results from `synthetic_rct_results.md` (§5.1).
- Benchmark from `benchmark_vs_dwaste.md` (§5.2).
- DP analysis from `dpAccountant.ts` (§3.3, §5.3).
- System architecture from the source-code docstrings + `TheoryOfChangeViz.tsx` diagram (§3, §5).

## Mandatory figures (5 figures, 2 tables)

| Figure | Source |
|---|---|
| 1 — System architecture | `TheoryOfChangeViz.tsx` diagram export |
| 2 — Synthetic RCT trajectories | `synthetic_rct.py --plot` |
| 3 — FL convergence vs rounds | `federatedAggregator.ts` log |
| 4 — Smart-bin route optimisation | `SmartBinTwin.tsx` screenshot |
| 5 — DP budget tracker | `PrivacyDashboard.tsx` Rényi tracker |

| Table | Source |
|---|---|
| 1 — Outcome measures | `RESEARCH_PROPOSAL.md` §3.4 |
| 2 — Synthetic RCT results | `synthetic_rct_results.md` |
