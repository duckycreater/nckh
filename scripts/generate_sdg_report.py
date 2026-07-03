#!/usr/bin/env python3
"""
Generate UN SDG 12.5 + 13.3 progress reports for BMO Robot deployments.

This script aggregates data from Supabase (weekly_scores + ai_scan_metrics +
carbon_ledger_entries) and emits a structured report ready for submission
to UN agencies, ministries of education, or NGOs.

Outputs:
  --format json    -> reports/sdg_report_<date>.json
  --format csv     -> reports/sdg_report_<date>.csv
  --format pdf     -> reports/sdg_report_<date>.pdf (requires reportlab)
  --format all     -> all three

Usage:
  python scripts/generate_sdg_report.py --cohort global --since-days 90
  python scripts/generate_sdg_report.py --cohort control --format pdf
  python scripts/generate_sdg_report.py --cohort exp_a --format all

Required env vars:
  SUPABASE_URL
  SUPABASE_SERVICE_ROLE_KEY
"""

import argparse
import csv
import json
import os
import sys
from datetime import datetime, timezone
from pathlib import Path

try:
    import requests
except ImportError:
    print("ERROR: requests required. pip install requests")
    sys.exit(1)

# CO₂ conversion factors (kg CO₂eq per kg waste correctly sorted vs. landfill)
# Source: EPA WARM v15 + IPCC AR6 WG III
CO2_FACTORS = {
    "plastic": 2.5,
    "paper": 1.7,
    "glass": 0.6,
    "metal": 4.0,
    "organic": 0.5,
    "hazard": 0.0,
}

# Average weight per item (grams) - Vietnam-specific, BMO field study 2024
AVG_WEIGHT_G = {
    "plastic": 28,
    "paper": 22,
    "glass": 180,
    "metal": 14,
    "organic": 110,
    "hazard": 80,
}

CATEGORY_LABELS = {
    "plastic": "Nhựa",
    "paper": "Giấy",
    "glass": "Thủy tinh",
    "metal": "Kim loại",
    "organic": "Hữu cơ",
    "hazard": "Nguy hại",
}


def supabase_query(supabase_url: str, supabase_key: str, sql: str):
    """Run a read-only query via the Supabase REST `exec_sql` RPC."""
    url = f"{supabase_url}/rest/v1/rpc/exec_sql"
    headers = {
        "apikey": supabase_key,
        "Authorization": f"Bearer {supabase_key}",
        "Content-Type": "application/json",
    }
    r = requests.post(url, headers=headers, json={"query": sql}, timeout=60)
    r.raise_for_status()
    raw = r.json()
    if isinstance(raw, str):
        try:
            return json.loads(raw)
        except Exception:
            return []
    return raw if isinstance(raw, list) else [raw]


def fetch_data(supabase_url: str, supabase_key: str, cohort: str, since_days: int):
    """Aggregate scan + ledger data for the report."""
    # Scans by category
    scans_sql = f"""
        SELECT predicted_category, COUNT(*) AS scans
        FROM ai_scan_metrics
        WHERE timestamp > NOW() - INTERVAL '{int(since_days)} day'
        GROUP BY predicted_category
    """
    scans_rows = supabase_query(supabase_url, supabase_key, scans_sql)

    # Users
    users_sql = f"""
        SELECT COUNT(DISTINCT user_id) AS users,
               COUNT(DISTINCT geo_country) AS countries
        FROM ai_scan_metrics
        WHERE timestamp > NOW() - INTERVAL '{int(since_days)} day'
    """
    users_rows = supabase_query(supabase_url, supabase_key, users_sql)

    # Carbon ledger totals
    ledger_sql = f"""
        SELECT
          COALESCE(SUM(co2_kg_avoided), 0) AS total_co2,
          COALESCE(SUM(weight_kg), 0) AS total_kg,
          COUNT(*) AS entry_count
        FROM carbon_ledger_entries
        WHERE timestamp > NOW() - INTERVAL '{int(since_days)} day'
    """
    ledger_rows = supabase_query(supabase_url, supabase_key, ledger_sql)

    # Federated rounds
    rounds_sql = f"""
        SELECT COUNT(*) AS total_rounds,
               SUM(participants_count) AS total_participants,
               AVG(validation_accuracy) AS avg_accuracy
        FROM federated_rounds
        WHERE completed_at > NOW() - INTERVAL '{int(since_days)} day'
    """
    rounds_rows = supabase_query(supabase_url, supabase_key, rounds_sql)

    return {
        "scans_by_category": {r["predicted_category"]: int(r["scans"]) for r in scans_rows},
        "users": users_rows[0] if users_rows else {"users": 0, "countries": 0},
        "ledger": ledger_rows[0] if ledger_rows else {"total_co2": 0, "total_kg": 0, "entry_count": 0},
        "federated": rounds_rows[0] if rounds_rows else {"total_rounds": 0, "total_participants": 0, "avg_accuracy": 0},
    }


def build_report(data: dict, cohort: str, since_days: int, locale: str = "vi") -> dict:
    """Build the structured SDG 12.5 + 13.3 report."""
    scans = data["scans_by_category"]

    total_scans = sum(scans.values())
    total_kg = 0.0
    total_co2 = 0.0
    by_category = {}
    for cat in CATEGORY_LABELS:
        n = scans.get(cat, 0)
        kg = (n * AVG_WEIGHT_G[cat]) / 1000
        co2 = kg * CO2_FACTORS[cat]
        by_category[cat] = {
            "scans": n,
            "estimated_kg": round(kg, 3),
            "co2_kg_avoided": round(co2, 3),
        }
        total_kg += kg
        total_co2 += co2

    return {
        "report_metadata": {
            "generated_at": datetime.now(timezone.utc).isoformat(),
            "cohort": cohort,
            "window_days": since_days,
            "report_version": "1.0",
            "methodology": "EPA WARM v15 + IPCC AR6 WG III",
        },
        "sdg_12_5_substantial_waste_reduction": {
            "title": "SDG 12.5 — Reduce waste generation through reduction, recycling, reuse",
            "total_scans": total_scans,
            "unique_users": data["users"].get("users", 0),
            "unique_countries": data["users"].get("countries", 0),
            "total_waste_kg_diverted": round(total_kg, 3),
            "by_category": by_category,
            "indicators": [
                {"code": "12.5.1", "metric": "National recycling rate", "note": "BMO contributes micro-level data"},
            ],
        },
        "sdg_13_3_climate_education": {
            "title": "SDG 13.3 — Improve education, awareness-raising on climate mitigation",
            "co2_kg_avoided": round(total_co2, 3),
            "trees_equivalent": round(total_co2 / 21, 4),
            "kwh_saved": round(total_co2 / 0.5, 2),
            "ledger_verified_co2": float(data["ledger"].get("total_co2") or 0),
            "ledger_entries": int(data["ledger"].get("entry_count") or 0),
            "federated_rounds": int(data["federated"].get("total_rounds") or 0),
            "federated_participants": int(data["federated"].get("total_participants") or 0),
        },
        "narrative": {
            "vi": (
                f"Trong {since_days} ngày qua, BMO đã hỗ trợ {total_scans:,} lượt phân loại rác "
                f"từ {data['users'].get('users', 0)} người dùng tại {data['users'].get('countries', 0)} quốc gia. "
                f"Ước tính đã phân loại đúng {total_kg:.1f} kg rác, tránh được {total_co2:.1f} kg CO₂eq "
                f"(tương đương {total_co2/21:.1f} cây xanh / năm). "
                f"Đóng góp trực tiếp cho Mục tiêu Phát triển Bền vững 12.5 và 13.3."
            ),
            "en": (
                f"Over the past {since_days} days, BMO supported {total_scans:,} waste sorting actions "
                f"from {data['users'].get('users', 0)} users across {data['users'].get('countries', 0)} countries. "
                f"An estimated {total_kg:.1f} kg of waste was correctly sorted, avoiding {total_co2:.1f} kg CO₂eq "
                f"(equivalent to {total_co2/21:.1f} trees / year). Direct contribution to UN SDG 12.5 and 13.3."
            ),
        },
    }


def write_json(report: dict, out_dir: Path):
    out_dir.mkdir(parents=True, exist_ok=True)
    path = out_dir / f"sdg_report_{report['report_metadata']['cohort']}_{datetime.now().strftime('%Y%m%d')}.json"
    path.write_text(json.dumps(report, indent=2, ensure_ascii=False))
    return path


def write_csv(report: dict, out_dir: Path):
    out_dir.mkdir(parents=True, exist_ok=True)
    path = out_dir / f"sdg_report_{report['report_metadata']['cohort']}_{datetime.now().strftime('%Y%m%d')}.csv"
    rows = []
    for cat, data in report["sdg_12_5_substantial_waste_reduction"]["by_category"].items():
        rows.append({
            "category": cat,
            "category_label": CATEGORY_LABELS[cat],
            "scans": data["scans"],
            "estimated_kg": data["estimated_kg"],
            "co2_kg_avoided": data["co2_kg_avoided"],
        })
    with open(path, "w", newline="", encoding="utf-8") as f:
        writer = csv.DictWriter(f, fieldnames=["category", "category_label", "scans", "estimated_kg", "co2_kg_avoided"])
        writer.writeheader()
        writer.writerows(rows)
    return path


def write_pdf(report: dict, out_dir: Path):
    try:
        from reportlab.lib.pagesizes import A4
        from reportlab.lib.styles import getSampleStyleSheet, ParagraphStyle
        from reportlab.lib.units import cm
        from reportlab.platypus import SimpleDocTemplate, Paragraph, Spacer, Table
        from reportlab.lib import colors
    except ImportError:
        print("WARN: reportlab not installed; skipping PDF. pip install reportlab")
        return None
    out_dir.mkdir(parents=True, exist_ok=True)
    path = out_dir / f"sdg_report_{report['report_metadata']['cohort']}_{datetime.now().strftime('%Y%m%d')}.pdf"
    doc = SimpleDocTemplate(str(path), pagesize=A4, title="BMO SDG Report")
    styles = getSampleStyleSheet()
    story = []
    story.append(Paragraph(f"<b>BMO Robot — UN SDG Report</b>", styles["Title"]))
    story.append(Paragraph(
        f"Cohort: {report['report_metadata']['cohort']} | "
        f"Window: {report['report_metadata']['window_days']} days | "
        f"Generated: {report['report_metadata']['generated_at']}",
        styles["Normal"]
    ))
    story.append(Spacer(1, 0.5 * cm))
    story.append(Paragraph(f"<b>SDG 12.5 — Waste Reduction</b>", styles["Heading2"]))
    story.append(Paragraph(
        f"Total scans: {report['sdg_12_5_substantial_waste_reduction']['total_scans']:,}<br/>"
        f"Unique users: {report['sdg_12_5_substantial_waste_reduction']['unique_users']}<br/>"
        f"Total kg diverted: {report['sdg_12_5_substantial_waste_reduction']['total_waste_kg_diverted']:.1f}",
        styles["Normal"]
    ))
    story.append(Spacer(1, 0.5 * cm))
    story.append(Paragraph(f"<b>SDG 13.3 — Climate Education</b>", styles["Heading2"]))
    story.append(Paragraph(
        f"CO₂ avoided: {report['sdg_13_3_climate_education']['co2_kg_avoided']:.1f} kg<br/>"
        f"Trees equivalent: {report['sdg_13_3_climate_education']['trees_equivalent']:.1f}<br/>"
        f"kWh saved: {report['sdg_13_3_climate_education']['kwh_saved']:.0f}",
        styles["Normal"]
    ))
    story.append(Spacer(1, 0.5 * cm))
    story.append(Paragraph(f"<b>Methodology</b><br/>{report['report_metadata']['methodology']}", styles["Italic"]))
    doc.build(story)
    return path


def main():
    parser = argparse.ArgumentParser()
    parser.add_argument("--cohort", default="global", help="control/exp_a/exp_b/exp_c/global")
    parser.add_argument("--since-days", type=int, default=90)
    parser.add_argument("--format", choices=["json", "csv", "pdf", "all"], default="all")
    parser.add_argument("--out-dir", default="./reports")
    parser.add_argument("--supabase-url", default=os.getenv("SUPABASE_URL"))
    parser.add_argument("--supabase-key", default=os.getenv("SUPABASE_SERVICE_ROLE_KEY"))
    parser.add_argument("--locale", default="vi", choices=["vi", "en"])
    args = parser.parse_args()

    if not args.supabase_url or not args.supabase_key:
        print("ERROR: SUPABASE_URL and SUPABASE_SERVICE_ROLE_KEY env vars required")
        sys.exit(1)

    print(f"Fetching data: cohort={args.cohort}, since_days={args.since_days}")
    data = fetch_data(args.supabase_url, args.supabase_key, args.cohort, args.since_days)

    report = build_report(data, args.cohort, args.since_days, args.locale)
    out_dir = Path(args.out_dir)

    outputs = []
    if args.format in ("json", "all"):
        outputs.append(write_json(report, out_dir))
    if args.format in ("csv", "all"):
        outputs.append(write_csv(report, out_dir))
    if args.format in ("pdf", "all"):
        p = write_pdf(report, out_dir)
        if p: outputs.append(p)

    print(f"\n✓ Generated {len(outputs)} file(s):")
    for p in outputs:
        print(f"  - {p}")
    print(f"\nNarrative ({args.locale}):")
    print(f"  {report['narrative'][args.locale]}")


if __name__ == "__main__":
    main()