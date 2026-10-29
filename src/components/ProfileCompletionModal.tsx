import React, { useEffect, useState } from "react";
import { useTranslation } from "react-i18next";
import { User } from "../types";
import { GraduationCap, X } from "lucide-react";

interface ProfileCompletionModalProps {
  user: User;
  onSaved: (updates: {
    fullName?: string;
    classGrade?: string;
    classId?: string;
    profileVerificationStatus?: User["profileVerificationStatus"];
    canEarnPoints?: boolean;
    pointEligibilityReason?: string | null;
  }) => void;
  onDismiss?: () => void;
}

export function ProfileCompletionModal({ user, onSaved, onDismiss }: ProfileCompletionModalProps) {
  const { t } = useTranslation();
  const [fullName, setFullName] = useState(user.fullName || "");
  const [classId, setClassId] = useState(user.classId || "");
  const [schoolClasses, setSchoolClasses] = useState<
    Array<{ id: string; name: string; schoolYear: string }>
  >([]);
  const [submitting, setSubmitting] = useState(false);
  const [error, setError] = useState<string | null>(null);

  useEffect(() => {
    void fetch("/api/classes")
      .then(async (response) => {
        if (!response.ok) throw new Error("class_catalog_unavailable");
        return response.json();
      })
      .then((body) => setSchoolClasses(Array.isArray(body.classes) ? body.classes : []))
      .catch(() => setError("Không thể tải danh mục lớp. Vui lòng thử lại."));
  }, []);

  const handleSubmit = async (e: React.FormEvent) => {
    e.preventDefault();
    setError(null);
    if (fullName && fullName.length > 100) {
      setError(t("auth.passwordMinChars"));
      return;
    }
    if (fullName.trim().length < 2 || !classId) {
      setError("Vui lòng nhập họ tên và chọn lớp.");
      return;
    }
    setSubmitting(true);
    try {
      const token = localStorage.getItem("auth_token");
      const headers: Record<string, string> = {
        "Content-Type": "application/json",
      };
      if (token) headers.Authorization = `Bearer ${token}`;
      const res = await fetch("/api/profile/meta", {
        method: "POST",
        headers,
        body: JSON.stringify({
          nickname: user.account_id,
          full_name: fullName.trim() || null,
          class_id: classId,
        }),
      });
      const data = await res.json();
      if (!res.ok || !data.success) {
        setError(data.message || t("auth.connectionError"));
        return;
      }
      onSaved({
        fullName: data.full_name || fullName.trim() || undefined,
        classGrade: data.class_grade || undefined,
        classId: data.class_id || classId,
        profileVerificationStatus: data.profile_verification_status,
        canEarnPoints: data.can_earn_points,
        pointEligibilityReason: data.point_eligibility_reason,
      });
    } catch {
      setError(t("auth.connectionError"));
    } finally {
      setSubmitting(false);
    }
  };

  const handleSkip = async () => {
    if (submitting) return;
    setSubmitting(true);
    setError(null);
    try {
      const token = localStorage.getItem("auth_token");
      const response = await fetch("/api/profile/meta/skip", {
        method: "POST",
        headers: token ? { Authorization: `Bearer ${token}` } : {},
      });
      const data = await response.json();
      if (!response.ok || !data.success) throw new Error(data.message || t("auth.connectionError"));
      onSaved({
        profileVerificationStatus: data.profile_verification_status || "skipped",
        canEarnPoints: false,
        pointEligibilityReason: data.point_eligibility_reason || "profile_verification_required",
      });
      onDismiss?.();
    } catch (cause) {
      setError(cause instanceof Error ? cause.message : t("auth.connectionError"));
    } finally {
      setSubmitting(false);
    }
  };

  return (
    <div
      role="dialog"
      aria-modal="true"
      aria-labelledby="profile-complete-title"
      className="fixed inset-0 z-50 flex items-center justify-center bg-black/55 p-4 backdrop-blur-sm"
    >
      <div className="w-full max-w-md rounded-2xl bg-white shadow-2xl border-t-[6px] border-emerald-500 animate-[fadeIn_0.3s_ease-out]">
        <div className="flex items-start gap-3 px-6 pt-5">
          <div className="rounded-full bg-emerald-50 p-2 text-emerald-600 shrink-0">
            <GraduationCap size={22} />
          </div>
          <div className="flex-1">
            <h2 id="profile-complete-title" className="text-xl font-bold text-emerald-700">
              {t("auth.completeProfileTitle")}
            </h2>
            <p className="mt-1 text-sm text-slate-600">{t("auth.completeProfileSubtitle")}</p>
          </div>
          {onDismiss && (
            <button
              type="button"
              onClick={() => void handleSkip()}
              aria-label={t("common.close")}
              className="rounded-full p-1 text-slate-400 hover:bg-slate-100 hover:text-slate-700"
            >
              <X size={18} />
            </button>
          )}
        </div>

        <form onSubmit={handleSubmit} className="space-y-4 px-6 py-5">
          <div>
            <label
              htmlFor="profile-full-name"
              className="mb-1 block text-[13px] font-bold text-slate-700"
            >
              {t("auth.fullName")}
            </label>
            <input
              id="profile-full-name"
              type="text"
              value={fullName}
              onChange={(e) => setFullName(e.target.value)}
              placeholder={t("auth.fullNamePlaceholder")}
              autoComplete="name"
              required
              className="w-full rounded-lg border-2 border-slate-200 bg-slate-50 p-3 text-[15px] outline-none transition-colors focus:border-emerald-500 focus:bg-white"
            />
            <p className="mt-1 text-[11px] text-slate-500">{t("auth.fullNameHint")}</p>
          </div>

          <div className="rounded-[8px] border border-amber-200 bg-amber-50 px-3 py-3 text-sm leading-5 text-amber-950">
            <p className="font-semibold">{t("auth.verificationNoticeTitle")}</p>
            <p className="mt-1">{t("auth.verificationNotice")}</p>
          </div>

          <div>
            <label
              htmlFor="profile-class"
              className="mb-1 block text-[13px] font-bold text-slate-700"
            >
              {t("auth.classGrade")}
            </label>
            <select
              id="profile-class"
              value={classId}
              onChange={(e) => setClassId(e.target.value)}
              required
              className="w-full rounded-lg border-2 border-slate-200 bg-slate-50 p-3 text-[15px] outline-none transition-colors focus:border-emerald-500 focus:bg-white appearance-none cursor-pointer"
            >
              <option value="">{t("auth.classGradePlaceholder")}</option>
              {schoolClasses.map((schoolClass) => (
                <option key={schoolClass.id} value={schoolClass.id}>
                  {schoolClass.name} · {schoolClass.schoolYear}
                </option>
              ))}
            </select>
            <p className="mt-1 text-[11px] text-slate-500">{t("auth.classGradeHint")}</p>
          </div>

          {error && (
            <div
              role="alert"
              className="rounded-md border border-red-200 bg-red-50 px-3 py-2 text-sm text-red-600"
            >
              {error}
            </div>
          )}

          <div className="flex items-center justify-end gap-2 pt-2">
            {onDismiss && (
              <button
                type="button"
                onClick={() => void handleSkip()}
                disabled={submitting}
                className="rounded-lg border-2 border-slate-200 px-4 py-2 text-sm font-semibold text-slate-600 hover:bg-slate-50 disabled:opacity-50"
              >
                {t("auth.completeProfileLater")}
              </button>
            )}
            <button
              type="submit"
              disabled={submitting}
              className="rounded-lg bg-emerald-600 px-5 py-2 text-sm font-bold text-white shadow-md transition hover:-translate-y-0.5 hover:bg-emerald-700 disabled:cursor-not-allowed disabled:opacity-60"
            >
              {submitting ? t("common.saving") : t("auth.completeProfileSave")}
            </button>
          </div>
        </form>
      </div>
    </div>
  );
}
