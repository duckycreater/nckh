#!/usr/bin/env python3
"""Fit a split-conformal profile from a labelled prediction CSV.

The input must contain ``label`` and one probability column per class. Columns
may be named ``prob_<class>`` or exactly like the class name. Optional
``feature_<index>`` columns add the feature-shift screen used by the client.
This script intentionally refuses to create a profile when the input is empty,
malformed, or marked synthetic by the caller.
"""
from __future__ import annotations

import argparse
import csv
import hashlib
import json
import math
from datetime import datetime, timezone
from pathlib import Path


def finite(value: float) -> bool:
    return math.isfinite(value)


def sha256_file(path: Path) -> str:
    digest = hashlib.sha256()
    with path.open("rb") as handle:
        for chunk in iter(lambda: handle.read(1024 * 1024), b""):
            digest.update(chunk)
    return digest.hexdigest()


def read_rows(path: Path, classes: list[str]) -> tuple[list[list[float]], list[str], list[list[float]] | None]:
    with path.open("r", encoding="utf-8-sig", newline="") as handle:
        reader = csv.DictReader(handle)
        if not reader.fieldnames or "label" not in reader.fieldnames:
            raise ValueError("CSV must contain a label column")
        probability_columns = []
        for name in classes:
            candidate = f"prob_{name}"
            if candidate in reader.fieldnames:
                probability_columns.append(candidate)
            elif name in reader.fieldnames:
                probability_columns.append(name)
            else:
                raise ValueError(f"missing probability column for class {name!r}")
        feature_columns = []
        index = 0
        while f"feature_{index}" in reader.fieldnames:
            feature_columns.append(f"feature_{index}")
            index += 1

        probabilities: list[list[float]] = []
        labels: list[str] = []
        features: list[list[float]] = []
        for line_number, row in enumerate(reader, start=2):
            label = (row.get("label") or "").strip()
            if label not in classes:
                raise ValueError(f"unknown label {label!r} at CSV line {line_number}")
            values = [float(row[column]) for column in probability_columns]
            if not values or not all(finite(value) and value >= 0 for value in values) or sum(values) <= 0:
                raise ValueError(f"invalid probabilities at CSV line {line_number}")
            probabilities.append(values)
            labels.append(label)
            if feature_columns:
                feature_values = [float(row[column]) for column in feature_columns]
                if not all(finite(value) for value in feature_values):
                    raise ValueError(f"invalid feature vector at CSV line {line_number}")
                features.append(feature_values)

    if not probabilities:
        raise ValueError("calibration CSV contains no rows")
    return probabilities, labels, features if feature_columns else None


def fit(probabilities: list[list[float]], labels: list[str], classes: list[str], alpha: float, features: list[list[float]] | None) -> dict:
    scores = []
    class_index = {name: index for index, name in enumerate(classes)}
    for row, label in zip(probabilities, labels):
        total = sum(row)
        scores.append(1.0 - row[class_index[label]] / total)
    scores.sort()
    rank = min(len(scores), max(1, math.ceil((len(scores) + 1) * (1.0 - alpha))))
    profile = {
        "version": 1,
        "alpha": alpha,
        "quantile": scores[rank - 1],
        "classes": classes,
        "calibrationCount": len(scores),
        "source": "external_site",
        "createdAt": datetime.now(timezone.utc).isoformat().replace("+00:00", "Z"),
    }
    if features:
        width = len(features[0])
        mean = [sum(row[i] for row in features) / len(features) for i in range(width)]
        std = []
        for i, centre in enumerate(mean):
            variance = sum((row[i] - centre) ** 2 for row in features) / max(1, len(features) - 1)
            std.append(max(math.sqrt(variance), 1e-6))
        profile.update({"featureMean": mean, "featureStd": std, "maxFeatureZ": 4.0})
    return profile


def main() -> int:
    parser = argparse.ArgumentParser(description="Fit split-conformal profile from real labelled predictions")
    parser.add_argument("--input", required=True, help="CSV with label and probability columns")
    parser.add_argument("--output", required=True, help="Output calibration profile JSON")
    parser.add_argument("--classes", required=True, help="Comma-separated class order")
    parser.add_argument("--alpha", type=float, default=0.1)
    parser.add_argument("--source", choices=["held_out", "external_site"], default="external_site")
    args = parser.parse_args()
    if not 0 < args.alpha < 1:
        raise SystemExit("--alpha must be between 0 and 1")
    input_path = Path(args.input).resolve()
    output_path = Path(args.output).resolve()
    classes = [item.strip() for item in args.classes.split(",") if item.strip()]
    if not classes or len(set(classes)) != len(classes):
        raise SystemExit("--classes must contain unique non-empty names")
    probabilities, labels, features = read_rows(input_path, classes)
    profile = fit(probabilities, labels, classes, args.alpha, features)
    profile["source"] = args.source
    profile["provenance"] = {
        "inputSha256": sha256_file(input_path),
        "inputPath": input_path.name,
        "rowCount": len(labels),
        "tool": "scripts/fit_conformal_profile.py",
    }
    output_path.parent.mkdir(parents=True, exist_ok=True)
    output_path.write_text(json.dumps(profile, indent=2), encoding="utf-8")
    print(json.dumps({"output": str(output_path), "quantile": profile["quantile"], "calibrationCount": len(labels), "inputSha256": profile["provenance"]["inputSha256"]}))
    return 0


if __name__ == "__main__":
    raise SystemExit(main())
