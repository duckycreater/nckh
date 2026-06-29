# TDN-Waste-World · Dataset Card

**Version:** v2.0 (Phase 1 expanded release)
**License:** CC-BY-4.0
**DOI:** [to be assigned by OSF upon release]
**Maintainer:** Nguyen Minh Duc · THCS & THPT Trần Đại Nghĩa, Q.7, HCMC, Vietnam

---

## What's in this dataset

| Property | Value |
|---|---|
| Total images | 5,000+ (growing) |
| Categories | 6 (plastic, paper, glass, metal, organic, hazard) |
| Image size | 224×224 px average (varied source) |
| File format | JPEG |
| Languages | Vietnamese (vi), English (en) |
| License | [CC-BY-4.0](./LICENSE) |

## Intended Use

**Best for:**
- Training waste classification models for school / low-resource contexts
- Benchmarking computer vision algorithms on noisy, real-world data
- Studying cross-cultural waste composition

**Not appropriate for:**
- Production-critical industrial sorting (use specialized datasets like TACO, WasteNet)
- Identifying individuals (anonymized but no guarantee of full anonymization)

## Collection Process

```
1. User opens BMO Robot web app → scans waste
2. Image goes to Gemini 2.5 Flash → initial label
3. Groq Llama-3.3-70B cross-checks Gemini's reasoning
4. Auto-accept if both agree + confidence ≥ 0.70
5. Human curator reviews disagreement / low-confidence
6. Approved scans enter the open dataset release
```

## Privacy Safeguards

- **EXIF stripped** at upload: no GPS, no camera model, no timestamp
- **Opt-in consent** flow with clear explanation
- **GDPR-style withdrawal**: users can revoke consent; future releases exclude their data
- **Anonymized contributors**: only aggregate counts published; no personal info

## Distribution (target after Phase 1)

| Category | Vietnamese | Target % |
|---|---|---|
| plastic | Nhựa | 35% |
| paper | Giấy | 20% |
| glass | Thủy tinh | 8% |
| metal | Kim loại | 10% |
| organic | Hữu cơ | 22% |
| hazard | Nguy hại | 5% |

Distribution skewed toward plastic/paper/organic as observed in Vietnamese schools.

## How to Contribute

See [CONTRIBUTING.md](./CONTRIBUTING.md).

## Citation

```
@dataset{nguyen2026tcnwasteworld,
  title={TDN-Waste-World: A Multilingual Open Dataset for School-Based Waste Sorting},
  author={Nguyen, Minh Duc and contributors},
  year={2026},
  version={v2.0},
  doi={[DOI assigned by OSF]},
  url={https://osf.io/[project-id]}
}
```

## Related Work

- **TDN-Waste-1000** (v1.0): Initial 1,024-image release for the ISEF project
- **TACO** (Czech Technical University): General litter detection (different scope)
- **TrashNet** (Stanford): 2,527 images, 6 categories (closely related, English-only)

## Acknowledgments

- All student contributors at THCS & THPT Trần Đại Nghĩa
- Reviewers and curators
- Open Science Framework for hosting
- Gemini 2.5 Flash + Groq Llama-3.3-70B for AI infrastructure

## Contact

- GitHub: https://github.com/duckycreater/nckh
- Issues: https://github.com/duckycreater/nckh/issues