import React, { useState } from "react";
import { useTranslation } from "react-i18next";
import { User } from "../types";
import { GraduationCap, X } from "lucide-react";

interface ProfileCompletionModalProps {
  user: User;
  onSaved: (updates: { fullName?: string; classGrade?: string }) => void;
  onDismiss?: () => void;
}

const CLASS_GRADES = Array.from({ length: 12 }, (_, i) => String(i + 1));

export function ProfileCompletionModal({
  user,
  onSaved,
  onDismiss,
}: ProfileCompletionModalProps) {
  const { t } = useTranslation();
  const [fullName, setFullName] = useState(user.fullName || "");
  const [classGrade, setClassGrade] = useState(user.classGrade || "");
  const [submitting, setSubmitting] = useState(false);
  const [error, setError] = useState<string | null>(null);

  const handleSubmit = async (e: React.FormEvent) => {
    e.preventDefault();
    setError(null);
    if (fullName && fullName.length > 100) {
      setError(t("auth.passwordMinChars"));
      return;
    }
    if (!fullName.trim() && !classGrade) {
      setError(t("auth.classGradeHint"));
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
          class_grade: classGrade || null,
        }),
      });
      const data = await res.json();
      if (!res.ok || !data.success) {
        setError(data.message || t("auth.connectionError"));
        return;
      }
      onSaved({
        fullName: data.full_name || fullName.trim() || undefined,
        classGrade: data.class_grade || classGrade || undefined,
      });
    } catch {
      setError(t("auth.connectionError"));
    } finally {
      setSubmitting(false);
    }
  };

  const handleSkip = () => {
    if (onDismiss) onDismiss();
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
            <h2
              id="profile-complete-title"
              className="text-xl font-bold text-emerald-700"
            >
              {t("auth.completeProfileTitle")}
            </h2>
            <p className="mt-1 text-sm text-slate-600">
              {t("auth.completeProfileSubtitle")}
            </p>
          </div>
          {onDismiss && (
            <button
              type="button"
              onClick={handleSkip}
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
              className="w-full rounded-lg border-2 border-slate-200 bg-slate-50 p-3 text-[15px] outline-none transition-colors focus:border-emerald-500 focus:bg-white"
            />
            <p className="mt-1 text-[11px] text-slate-500">
              {t("auth.fullNameHint")}
            </p>
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
              value={classGrade}
              onChange={(e) => setClassGrade(e.target.value)}
              className="w-full rounded-lg border-2 border-slate-200 bg-slate-50 p-3 text-[15px] outline-none transition-colors focus:border-emerald-500 focus:bg-white appearance-none cursor-pointer"
            >
              <option value="">{t("auth.classGradePlaceholder")}</option>
              {CLASS_GRADES.map((grade) => (
                <option key={grade} value={grade}>
                  Lớp {grade}
                </option>
              ))}
            </select>
            <p className="mt-1 text-[11px] text-slate-500">
              {t("auth.classGradeHint")}
            </p>
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
                onClick={handleSkip}
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
