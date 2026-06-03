import React from "react";

interface CohortHeatmapProps {
  cohortData: Record<string, Record<number, number>>;
  title?: string;
}

export function CohortHeatmap({ cohortData, title = "Cohort Retention Heatmap" }: CohortHeatmapProps) {
  if (!cohortData || Object.keys(cohortData).length === 0) {
    return (
      <div className="text-center py-8 text-gray-400 italic">
        No cohort data available yet.
      </div>
    );
  }

  const cohorts = Object.keys(cohortData).sort();
  const maxWeek = Math.max(...cohorts.map((c) => Math.max(...Object.keys(cohortData[c]).map(Number), 0)));

  // Build grid
  const weeks = Array.from({ length: maxWeek }, (_, i) => i + 1);

  const getColor = (pct: number): string => {
    if (pct === 0) return "bg-gray-100";
    if (pct < 25) return "bg-red-200";
    if (pct < 50) return "bg-amber-200";
    if (pct < 75) return "bg-emerald-200";
    return "bg-emerald-500";
  };

  const getTextColor = (pct: number): string => {
    if (pct >= 75) return "text-white";
    return "text-gray-700";
  };

  return (
    <div className="overflow-x-auto">
      <div className="min-w-max">
        {/* Header row */}
        <div className="flex items-center mb-2">
          <div className="w-24 text-xs font-bold text-gray-500 pr-2">{title}</div>
          <div className="flex gap-1">
            {weeks.map((w) => (
              <div key={w} className="w-12 text-center text-xs font-bold text-gray-500">
                W{w}
              </div>
            ))}
          </div>
        </div>

        {/* Cohort rows */}
        {cohorts.map((cohort, ci) => {
          const weekData = cohortData[cohort];
          const initialUsers = weekData[1] || 1;

          return (
            <div key={cohort} className="flex items-center mb-1">
              <div className="w-24 text-xs text-gray-600 pr-2 truncate" title={cohort}>
                {cohort}
              </div>
              <div className="flex gap-1">
                {weeks.map((w) => {
                  const users = weekData[w] || 0;
                  const pct = initialUsers > 0 ? Math.round((users / initialUsers) * 100) : 0;
                  return (
                    <div
                      key={w}
                      className={`w-12 h-8 rounded flex items-center justify-center text-xs font-mono transition-all hover:ring-2 hover:ring-gray-400 cursor-default ${getColor(pct)} ${getTextColor(pct)}`}
                      title={`${cohort} Week ${w}: ${users} users (${pct}%)`}
                    >
                      {users > 0 ? `${pct}%` : "—"}
                    </div>
                  );
                })}
              </div>
            </div>
          );
        })}

        {/* Legend */}
        <div className="flex items-center gap-3 mt-4 text-xs text-gray-500">
          <span>Retention:</span>
          <div className="w-6 h-4 bg-red-200 rounded" />
          <span>&lt;25%</span>
          <div className="w-6 h-4 bg-amber-200 rounded" />
          <span>25-50%</span>
          <div className="w-6 h-4 bg-emerald-200 rounded" />
          <span>50-75%</span>
          <div className="w-6 h-4 bg-emerald-500 rounded" />
          <span>&gt;75%</span>
        </div>
      </div>
    </div>
  );
}
