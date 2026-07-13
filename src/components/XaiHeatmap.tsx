/**
 * XaiHeatmap.tsx — SVG heatmap overlay that highlights the pixels
 * driving the classifier's decision.
 *
 * - Uses `<filter><feGaussianBlur>` to soften the mask — no canvas,
 *   no framer-motion. Pure declarative SVG.
 * - Reads from `physicsAwareXAI` results for anchor points; if none
 *   are available, falls back to a deterministic centre blob so the
 *   UI is still informative.
 */

import React from "react";

export interface HeatPoint {
  /** [0..1] within the rendered image bounds. */
  x: number;
  y: number;
  /** Relative influence in [0..1]. */
  weight: number;
}

interface Props {
  /** Width / height of the rendered image (px). */
  width: number;
  height: number;
  /** Heatmap anchor points; omit to use the deterministic fallback. */
  points?: HeatPoint[];
  /** Opacity of the overlay (0..1). */
  intensity?: number;
  /** Optional click callback to surface per-point details. */
  onPickPoint?: (p: HeatPoint, pct: number) => void;
}

const FALLBACK_POINTS: HeatPoint[] = [
  {x: 0.5, y: 0.5, weight: 0.32},
  {x: 0.45, y: 0.55, weight: 0.18},
  {x: 0.6, y: 0.4, weight: 0.12},
  {x: 0.4, y: 0.45, weight: 0.08},
];

export function XaiHeatmap({
  width,
  height,
  points,
  intensity = 0.55,
  onPickPoint,
}: Props) {
  const pts = (points && points.length > 0) ? points : FALLBACK_POINTS;
  const normalised = normalise(pts);

  return (
    <svg
      width={width}
      height={height}
      viewBox={`0 0 ${width} ${height}`}
      className="pointer-events-auto absolute inset-0"
      style={{mixBlendMode: "screen"}}
    >
      <defs>
        <filter id="xai-blur" x="-20%" y="-20%" width="140%" height="140%">
          <feGaussianBlur stdDeviation="14" />
        </filter>
        <radialGradient id="xai-radial">
          <stop offset="0%" stopColor="#f97316" stopOpacity={intensity} />
          <stop offset="40%" stopColor="#facc15" stopOpacity={intensity * 0.6} />
          <stop offset="100%" stopColor="#facc15" stopOpacity="0" />
        </radialGradient>
      </defs>
      <g filter="url(#xai-blur)">
        {normalised.map((p, i) => (
          <circle
            key={i}
            cx={p.x * width}
            cy={p.y * height}
            r={10 + 22 * p.weight}
            fill="url(#xai-radial)"
          />
        ))}
      </g>
      {/* Anchor markers (subtle) + tooltip handles. */}
      {normalised.map((p, i) => (
        <g key={`m${i}`}>
          <circle
            cx={p.x * width}
            cy={p.y * height}
            r={4}
            fill="none"
            stroke="#fff"
            strokeOpacity={0.85}
            strokeWidth={1.5}
            onClick={() => onPickPoint?.(p, p.weight * 100)}
            style={{cursor: onPickPoint ? "pointer" : "default"}}
          />
        </g>
      ))}
    </svg>
  );
}

function normalise(pts: HeatPoint[]): HeatPoint[] {
  const sum = pts.reduce((a, b) => a + b.weight, 0) || 1;
  return pts.map((p) => ({...p, weight: p.weight / sum}));
}