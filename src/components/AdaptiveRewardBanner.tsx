import React, { useState, useEffect } from "react";
import { Sparkles, Zap, TrendingUp } from "lucide-react";

interface AdaptiveRewardBannerProps {
  userId: string;
  className?: string;
}

export function AdaptiveRewardBanner({ userId, className = "" }: AdaptiveRewardBannerProps) {
  const [interventions, setInterventions] = useState<any[]>([]);
  const [decayState, setDecayState] = useState<any>(null);
  const [reflection, setReflection] = useState<string | null>(null);
  const [dismissed, setDismissed] = useState(false);

  useEffect(() => {
    const fetchData = async () => {
      try {
        const [interventionsRes, decayRes, reflectionRes] = await Promise.all([
          fetch(`/api/interventions/${userId}`),
          fetch(`/api/decay/${userId}`),
          fetch(`/api/reflection/${userId}`),
        ]);

        const interventionsData = await interventionsRes.json();
        const decayData = await decayRes.json();
        const reflectionData = await reflectionRes.json();

        setInterventions(interventionsData.slice(0, 2));
        setDecayState(decayData);
        if (reflectionData.reflectionText) {
          setReflection(reflectionData.reflectionText);
        }
      } catch {
        // Silently fail - banner is optional
      }
    };

    fetchData();
  }, [userId]);

  if (dismissed) return null;

  const recentIntervention = interventions[0];
  const showDecayAlert = decayState?.isDecaying;
  const isHighRisk = decayState?.decaySeverity === "severe" || decayState?.decaySeverity === "moderate";

  if (!recentIntervention && !showDecayAlert && !reflection) return null;

  return (
    <div className={`${className}`}>
      {/* Weekly Reflection */}
      {reflection && (
        <div className="bg-gradient-to-r from-indigo-50 to-purple-50 rounded-xl p-4 mb-3 border border-indigo-100">
          <div className="flex items-start gap-3">
            <div className="bg-indigo-100 p-2 rounded-lg shrink-0">
              <Sparkles size={18} className="text-indigo-600" />
            </div>
            <div className="flex-1 min-w-0">
              <p className="text-xs font-bold text-indigo-600 uppercase mb-1">Tuan Nay</p>
              <p className="text-sm text-gray-700">{reflection}</p>
            </div>
          </div>
        </div>
      )}

      {/* Decay Alert */}
      {showDecayAlert && (
        <div className={`rounded-xl p-4 mb-3 border ${
          isHighRisk
            ? "bg-red-50 border-red-200"
            : "bg-amber-50 border-amber-200"
        }`}>
          <div className="flex items-start gap-3">
            <div className={`p-2 rounded-lg shrink-0 ${isHighRisk ? "bg-red-100" : "bg-amber-100"}`}>
              <TrendingUp size={18} className={isHighRisk ? "text-red-600" : "text-amber-600"} />
            </div>
            <div className="flex-1 min-w-0">
              <p className={`text-xs font-bold uppercase mb-1 ${isHighRisk ? "text-red-600" : "text-amber-600"}`}>
                {isHighRisk ? "Canh Bao" : "Thong Bao"}
              </p>
              <p className="text-sm text-gray-700">
                {isHighRisk
                  ? "Engagement dang giam nhanh! He thong se tu dong kich hoat uu dai dac biet de giup ban!"
                  : "Engagement co dau hieu giam. Thu kham pha cac thu thach moi nhe!"}
              </p>
            </div>
          </div>
        </div>
      )}

      {/* Recent Intervention */}
      {recentIntervention && (
        <div className="bg-emerald-50 rounded-xl p-4 mb-3 border border-emerald-100">
          <div className="flex items-start gap-3">
            <div className="bg-emerald-100 p-2 rounded-lg shrink-0">
              <Zap size={18} className="text-emerald-600" />
            </div>
            <div className="flex-1 min-w-0">
              <p className="text-xs font-bold text-emerald-600 uppercase mb-1">Uu Dai Dac Biet</p>
              <p className="text-sm text-gray-700 capitalize">
                {recentIntervention.intervention_type?.replace(/_/g, " ")} - duoc kich hoat tu dong!
              </p>
            </div>
          </div>
        </div>
      )}
    </div>
  );
}
