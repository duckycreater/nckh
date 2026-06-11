import React, { useState, useEffect } from "react";
import { Sparkles, Zap, TrendingUp, X } from "lucide-react";

interface AdaptiveRewardBannerProps {
  userId: string;
  className?: string;
}

export function AdaptiveRewardBanner({ userId, className = "" }: AdaptiveRewardBannerProps) {
  const [interventions, setInterventions] = useState<any[]>([]);
  const [decayState, setDecayState] = useState<any>(null);
  const [reflection, setReflection] = useState<string | null>(null);
  const [reflectionDismissed, setReflectionDismissed] = useState(false);
  const [decayDismissed, setDecayDismissed] = useState(false);
  const [interventionDismissed, setInterventionDismissed] = useState(false);

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
      } catch (e) {
        console.warn('[AdaptiveRewardBanner] Failed to fetch banner data:', e);
      }
    };

    fetchData();
  }, [userId]);

  if (reflectionDismissed && decayDismissed && interventionDismissed) return null;

  const recentIntervention = interventions[0];
  const showDecayAlert = decayState?.isDecaying;
  const isHighRisk = decayState?.decaySeverity === "severe" || decayState?.decaySeverity === "moderate";

  if ((!recentIntervention || interventionDismissed) && (!showDecayAlert || decayDismissed) && (!reflection || reflectionDismissed)) return null;

  return (
    <div className={`${className}`}>
      {/* Weekly Reflection */}
      {reflection && !reflectionDismissed && (
        <div className="bg-gradient-to-r from-indigo-50 to-purple-50 rounded-xl p-4 mb-3 border border-indigo-100">
          <div className="flex items-start gap-3">
            <div className="bg-indigo-100 p-2 rounded-lg shrink-0">
              <Sparkles size={18} className="text-indigo-600" />
            </div>
            <div className="flex-1 min-w-0">
              <div className="flex items-start justify-between">
                <div>
                  <p className="text-xs font-bold text-indigo-600 uppercase mb-1">Tuan Nay</p>
                  <p className="text-sm text-gray-700">{reflection}</p>
                </div>
                <button
                  onClick={() => setReflectionDismissed(true)}
                  className="ml-2 shrink-0 p-1 rounded-full hover:bg-indigo-100 text-indigo-400 hover:text-indigo-600 transition-colors"
                  aria-label="Đóng thông báo"
                >
                  <X size={14} />
                </button>
              </div>
            </div>
          </div>
        </div>
      )}

      {/* Decay Alert */}
      {showDecayAlert && !decayDismissed && (
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
              <div className="flex items-start justify-between">
                <div>
                  <p className={`text-xs font-bold uppercase mb-1 ${isHighRisk ? "text-red-600" : "text-amber-600"}`}>
                    {isHighRisk ? "Canh Bao" : "Thong Bao"}
                  </p>
                  <p className="text-sm text-gray-700">
                    {isHighRisk
                      ? "Engagement dang giam nhanh! He thong se tu dong kich hoat uu dai dac biet de giup ban!"
                      : "Engagement co dau hieu giam. Thu kham pha cac thu thach moi nhe!"}
                  </p>
                </div>
                <button
                  onClick={() => setDecayDismissed(true)}
                  className="ml-2 shrink-0 p-1 rounded-full hover:bg-red-100 text-red-400 hover:text-red-600 transition-colors"
                  aria-label="Đóng thông báo"
                >
                  <X size={14} />
                </button>
              </div>
            </div>
          </div>
        </div>
      )}

      {/* Recent Intervention */}
      {recentIntervention && !interventionDismissed && (
        <div className="bg-emerald-50 rounded-xl p-4 mb-3 border border-emerald-100">
          <div className="flex items-start gap-3">
            <div className="bg-emerald-100 p-2 rounded-lg shrink-0">
              <Zap size={18} className="text-emerald-600" />
            </div>
            <div className="flex-1 min-w-0">
              <div className="flex items-start justify-between">
                <div>
                  <p className="text-xs font-bold text-emerald-600 uppercase mb-1">Uu Dai Dac Biet</p>
                  <p className="text-sm text-gray-700 capitalize">
                    {recentIntervention.intervention_type?.replace(/_/g, " ")} - duoc kich hoat tu dong!
                  </p>
                </div>
                <button
                  onClick={() => setInterventionDismissed(true)}
                  className="ml-2 shrink-0 p-1 rounded-full hover:bg-emerald-100 text-emerald-400 hover:text-emerald-600 transition-colors"
                  aria-label="Đóng thông báo"
                >
                  <X size={14} />
                </button>
              </div>
            </div>
          </div>
        </div>
      )}
    </div>
  );
}
