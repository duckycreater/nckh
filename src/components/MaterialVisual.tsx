import React, { useMemo } from "react";
import type { MaterialPropertyId, WasteCategory } from "../../shared/materialCards";
import { cn } from "../lib/ui";

export const MATERIAL_LABELS: Record<WasteCategory, string> = {
  plastic: "Nhựa",
  paper: "Giấy",
  glass: "Thủy tinh",
  metal: "Kim loại",
  organic: "Hữu cơ",
  hazard: "Thu gom riêng",
};

const MATERIAL_CODES: Record<WasteCategory, string> = {
  plastic: "PL",
  paper: "PA",
  glass: "GL",
  metal: "MT",
  organic: "OR",
  hazard: "HZ",
};

function hashSeed(value: string) {
  let hash = 2166136261;
  for (let index = 0; index < value.length; index += 1) {
    hash ^= value.charCodeAt(index);
    hash = Math.imul(hash, 16777619);
  }
  return Math.abs(hash >>> 0);
}

export function MaterialFingerprint({
  category,
  seed,
  className,
}: {
  category: WasteCategory;
  seed?: string;
  className?: string;
}) {
  const marks = useMemo(() => {
    const hash = hashSeed(`${category}:${seed || "sample"}`);
    return Array.from({ length: 7 }, (_, index) => ({
      x: 18 + (((hash >> (index % 8)) + index * 19) % 64),
      y: 18 + (((hash >> ((index + 3) % 12)) + index * 13) % 64),
      size: 3 + ((hash >> ((index + 5) % 16)) % 7),
    }));
  }, [category, seed]);

  return (
    <svg
      viewBox="0 0 100 100"
      className={cn("h-full w-full", className)}
      aria-hidden="true"
      focusable="false"
    >
      <rect width="100" height="100" fill="transparent" />
      <path
        d="M14 72 C28 34 39 22 52 20 C71 18 86 38 86 57 C86 78 69 88 47 86 C29 85 10 88 14 72Z"
        fill="none"
        stroke="currentColor"
        strokeWidth="1.4"
        opacity="0.55"
      />
      <path
        d="M23 67 C36 45 46 34 59 34 C72 34 80 45 77 59 C74 73 62 79 48 76 C36 73 18 76 23 67Z"
        fill="none"
        stroke="currentColor"
        strokeWidth="1"
        opacity="0.42"
      />
      {marks.map((mark, index) => (
        <circle
          key={`${mark.x}-${mark.y}-${index}`}
          cx={mark.x}
          cy={mark.y}
          r={mark.size / 2}
          fill="currentColor"
          opacity={0.24 + index * 0.055}
        />
      ))}
      <text
        x="50"
        y="55"
        textAnchor="middle"
        dominantBaseline="middle"
        fill="currentColor"
        fontFamily="IBM Plex Mono, monospace"
        fontWeight="600"
        fontSize="18"
        letterSpacing="2"
      >
        {MATERIAL_CODES[category]}
      </text>
    </svg>
  );
}

export function MaterialVisual({
  category,
  imageUrl,
  objectName,
  propertyIds = [],
  className,
  overlay = true,
}: {
  category: WasteCategory;
  imageUrl?: string | null;
  objectName: string;
  propertyIds?: MaterialPropertyId[];
  className?: string;
  overlay?: boolean;
}) {
  const seed = `${objectName}:${[...propertyIds].sort().join(":")}`;
  return (
    <div
      className={cn(
        "material-pattern relative min-h-32 bg-[var(--graphite)] text-white",
        `material-${category}`,
        className,
      )}
      data-material={category}
    >
      {imageUrl ? (
        <img
          src={imageUrl}
          alt={objectName}
          loading="lazy"
          decoding="async"
          className="absolute inset-0 h-full w-full object-cover"
        />
      ) : (
        <div className="absolute inset-0 p-[14%] text-white/85">
          <MaterialFingerprint category={category} seed={seed} />
        </div>
      )}
      {imageUrl && overlay && (
        <div className="absolute inset-0 bg-[linear-gradient(180deg,rgba(10,15,12,0.02),rgba(10,15,12,0.62))]" />
      )}
      <span className="font-telemetry absolute left-3 top-3 rounded-[6px] border border-white/25 bg-black/45 px-2 py-1 text-[10px] font-semibold tracking-[0.12em] text-white">
        {MATERIAL_CODES[category]}
      </span>
    </div>
  );
}
