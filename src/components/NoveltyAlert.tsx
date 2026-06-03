import React, { useState, useEffect } from "react";
import { AlertTriangle, RefreshCw } from "lucide-react";

interface NoveltyAlertProps {
  userId: string;
  onDismiss: () => void;
}

export function NoveltyAlert({ userId, onDismiss }: NoveltyAlertProps) {
  const [decayState, setDecayState] = useState<any>(null);
  const [loading, setLoading] = useState(false);

  useEffect(() => {
    const fetchDecay = async () => {
      try {
        const res = await fetch(`/api/decay/${userId}`);
        const data = await res.json();
        setDecayState(data);
      } catch {}
    };
    fetchDecay();
  }, [userId]);

  const handleRefresh = async () => {
    setLoading(true);
    try {
      const res = await fetch(`/api/decay/${userId}`);
      const data = await res.json();
      setDecayState(data);
      if (!data.isDecaying || data.decaySeverity === "none") {
        onDismiss();
      }
    } catch {}
    setLoading(false);
  };

  if (!decayState?.isDecaying) return null;

  const severity = decayState.decaySeverity;
  const colors = {
    mild: { bg: "bg-amber-50", border: "border-amber-200", icon: "text-amber-500", text: "text-amber-700" },
    moderate: { bg: "bg-orange-50", border: "border-orange-200", icon: "text-orange-500", text: "text-orange-700" },
    severe: { bg: "bg-red-50", border: "border-red-200", icon: "text-red-500", text: "text-red-700" },
  }[severity] || { bg: "bg-gray-50", border: "border-gray-200", icon: "text-gray-500", text: "text-gray-700" };

  return (
    <div className={`${colors.bg} ${colors.border} border rounded-xl p-4 mb-3`}>
      <div className="flex items-start gap-3">
        <div className={`p-2 rounded-lg bg-white ${colors.icon}`}>
          <AlertTriangle size={20} />
        </div>
        <div className="flex-1 min-w-0">
          <div className="flex justify-between items-start">
            <p className={`text-sm font-bold ${colors.text}`}>
              Novelty Decay Detected
            </p>
            <button
              onClick={handleRefresh}
              disabled={loading}
              className={`p-1.5 rounded-lg hover:bg-white/50 transition-colors ${loading ? "animate-spin" : ""}`}
            >
              <RefreshCw size={14} className={colors.icon} />
            </button>
          </div>
          <p className="text-xs text-gray-600 mt-1">
            Engagement score: {(decayState.engagementScore * 100).toFixed(0)}% |
            Trend: {decayState.trend > 0 ? "+" : ""}{(decayState.trend * 100).toFixed(0)}% |
            Severity: <span className={`font-bold capitalize ${colors.text}`}>{severity}</span>
          </p>
          {severity === "severe" && (
            <p className="text-xs text-red-600 mt-2 font-medium">
              Adaptive intervention has been triggered automatically.
            </p>
          )}
        </div>
      </div>
    </div>
  );
}
