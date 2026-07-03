# OSF Pre-Registration Setup — BMO Robot Vietnam RCT

This is the step-by-step checklist for setting up the Open Science Framework
pre-registration for the BMO Robot multi-school RCT. Run through this list
once the partner university IRB has approved the study (or in parallel —
OSF accepts pre-registrations prior to IRB approval; mark the status
appropriately).

> Pre-registration is the most important research-design artifact. It locks
> the analysis plan before data collection so the reviewer can verify the
> claims later.

---

## 0. Account

- [ ] Create an OSF account at https://osf.io/register
- [ ] Confirm affiliation (school/lab).
- [ ] Enable 2FA in OSF account settings.
- [ ] Add ORCID (https://orcid.org) — required for journal submissions.

## 1. Project

- [ ] Click **+ Create** → **Project**.
- [ ] Title: **"BMO Robot Vietnam Multi-School RCT"**
- [ ] Description: link to `RESEARCH_PROPOSAL.md`.
- [ ] Category: *Social and Behavioral Sciences* (primary) + *Computer
      and Information Science* (secondary).
- [ ] License: **CC-BY 4.0** (default for open science).
- [ ] Visibility: **Public**.
- [ ] Add all co-authors as contributors with appropriate permissions.

## 2. Components to upload

Upload each file as a *component* (which version-controls separately from
the project wiki). All files live in this repo:

| File path (relative) | OSF component name | Storage location |
|---|---|---|
| `docs/research/RESEARCH_PROPOSAL.md` | "Research proposal" | OSF Storage |
| `docs/research/THEORY_OF_CHANGE.md` | "Theory of Change (COM-B)" | OSF Storage |
| `docs/research/PRE_REGISTRATION.md` | "Pre-registration" | OSF Storage |
| `docs/research/LITERATURE_REVIEW.md` | "Literature review" | OSF Storage |
| `docs/research/IRB_ETHICS.md` | "IRB application (draft)" | OSF Storage |
| `docs/isef/PAPER_DRAFT.md` | "Paper draft" | OSF Storage |
| `docs/isef/POSTER_DESIGN.md` | "Poster design" | OSF Storage |
| `docs/isef/DEMO_VIDEO_SCRIPT.md` | "Demo video script" | OSF Storage |
| `server/services/smartBinEmulator.ts` | "Smart-bin emulator (code)" | GitHub integration |
| `server/services/rctEngine.ts` | "RCT engine (code)" | GitHub integration |
| `server/services/dpAccountant.ts` | "DP accountant (code)" | GitHub integration |
| `src/services/dpAccountant.ts` | "DP accountant (browser)" | GitHub integration |
| `scripts/synthetic_rct.py` | "Synthetic RCT (script)" | GitHub integration |
| `scripts/analysis_synthetic.py` | "Synthetic analysis (script)" | GitHub integration |
| `scripts/benchmark_models.py` | "Benchmark script" | GitHub integration |
| `reports/synthetic_rct_results.md` | "Synthetic RCT results" | OSF Storage |
| `reports/analysis_synthetic.md` | "Synthetic analysis report" | OSF Storage |
| `reports/benchmark_vs_dwaste.md` | "Benchmark vs DWaste" | OSF Storage |
| `server/services/auditTrail.ts` | "Audit trail (Merkle tree)" | GitHub integration |

## 3. GitHub integration

- [ ] In OSF → **Settings** → **Add-ons** → **GitHub** → authorise.
- [ ] Select repo: `<your-org>/bmo-robot`.
- [ ] Default branch: `main`.
- [ ] Confirm webhook is active by creating a test commit.

## 4. Pre-registration template

- [ ] Go to the project page → **Pre-registrations** → **New Pre-registration**.
- [ ] Template: **"Open-Ended Registration"** (we need multiple sections).
- [ ] Title: **"A Privacy-Preserving Federated AI Platform for Sustainable Waste
      Sorting: A Multi-School Randomized Controlled Trial Toward UN SDG 12.5
      and 13.3"**.
- [ ] Copy the content of `PRE_REGISTRATION.md` (sections 1–8) into the
      Pre-registration description, preserving the section ordering.
- [ ] Date stamp: leave blank initially; set after final submission.
- [ ] Add the embargo period: 24 months (until publication of the ISEF paper).

## 5. Wiki / FAQ

- [ ] Create wiki page "How to cite this pre-registration" with the format
      `Authors (Year). Title. OSF. https://doi.org/<DOI>`.
- [ ] Add wiki page "Methods deviation log" so any post-pre-registration
      amendment is documented with date + reason.

## 6. Final URLs to embed

After submission, copy the following URLs and paste them into the bottom of
`PRE_REGISTRATION.md`:

- OSF Project URL: `https://osf.io/<ID>`
- OSF DOI: `https://doi.org/<DOI>`
- GitHub repo URL: `https://github.com/<org>/bmo-robot`
- Zenodo DOI (later): `https://doi.org/<DOI>`

The OSF ID must also be embedded into `IRB_ETHICS.md` for the ethics board.

## 7. Sample sizes and analysis

- [ ] Upload `scripts/synthetic_rct.py` to verify the analysis plan works.
- [ ] Run `python scripts/synthetic_rct.py --seed 42 --n-users 1000` and
      attach the resulting `synthetic_rct_results.md` and `.json` files
      as additional components.
- [ ] Confirm the synthetic Cohen's d exceeds the pre-registered threshold
      (d ≥ 0.40); otherwise revisit the parameters.

## 8. Submission

- [ ] Hit **Submit Pre-registration** — the project is now frozen at this
      state and the embargo begins.
- [ ] Confirm the URL is accessible without login (Public mode).
- [ ] Update this checklist with the final OSF ID and DOI.

---

## Final OSF ID

> (filled in after submission)

## Final OSF DOI

> (filled in after submission)

## Final GitHub repo URL

> `https://github.com/<org>/bmo-robot` (placeholder; replace before submission)

## Final Zenodo DOI

> (filled after paper is uploaded to Zenodo)