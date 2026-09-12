import React, { useMemo, useState } from "react";
import { motion } from "framer-motion";
import { useTranslation } from "react-i18next";
import { computeEID4Score, EID4_ITEMS_VI, EID4_ITEMS_EN } from "../services/identityEngine";

export interface ValidatedSurveyProps {
  language?: "vi" | "en";
  onSubmit?: (payload: {
    responses: number[];
    eidScore: number;
    cronbachAlpha: number | null;
    n: number;
  }) => void;
}

/**
 * Validated survey for EID-4 (Whitmarsh & O'Neill, 2010).
 * Reliability statistics such as Cronbach's alpha require a cohort of
 * respondents and are deliberately not estimated from a single response.
 */
export const ValidatedSurvey: React.FC<ValidatedSurveyProps> = ({ language = "vi", onSubmit }) => {
  const { t } = useTranslation();
  const items = language === "vi" ? EID4_ITEMS_VI : EID4_ITEMS_EN;
  const [responses, setResponses] = useState<number[]>(items.map(() => -1));
  const [submitted, setSubmitted] = useState(false);

  const stats = useMemo(() => {
    const valid = responses.filter((v) => v >= 1);
    return { alpha: null, eid: valid.length === items.length ? computeEID4Score(valid) : NaN };
  }, [responses, items.length]);

  const handleSelect = (idx: number, value: number) => {
    if (submitted) return;
    setResponses((prev) => {
      const next = [...prev];
      next[idx] = value;
      return next;
    });
  };

  const allAnswered = responses.every((v) => v >= 1);

  const submit = () => {
    if (!allAnswered) return;
    setSubmitted(true);
    onSubmit?.({
      responses,
      eidScore: stats.eid,
      cronbachAlpha: stats.alpha,
      n: 1,
    });
  };

  return (
    <div className="w-full rounded-3xl border border-slate-200 bg-white p-6 shadow-sm dark:border-slate-700 dark:bg-slate-900">
      <div className="flex items-center justify-between">
        <div>
          <h2 className="text-xl font-semibold tracking-tight text-slate-900 dark:text-white">
            Environmental Identity Survey (EID-4)
          </h2>
          <p className="mt-1 text-xs text-slate-500 dark:text-slate-400">
            Whitmarsh &amp; O&rsquo;Neill (2010). Likert 1-7.
          </p>
        </div>
        {submitted && (
          <span className="rounded-full bg-emerald-100 px-3 py-1 text-xs font-mono text-emerald-700">
            Submitted
          </span>
        )}
      </div>

      <ol className="mt-6 space-y-4">
        {items.map((it, idx) => (
          <li
            key={idx}
            className="rounded-2xl border border-slate-200 bg-slate-50 p-4 dark:border-slate-700 dark:bg-slate-800"
          >
            <p className="text-sm font-medium text-slate-800 dark:text-slate-100">
              {idx + 1}. {it}
            </p>
            <div className="mt-3 flex flex-wrap gap-2">
              {[1, 2, 3, 4, 5, 6, 7].map((value) => {
                const selected = responses[idx] === value;
                return (
                  <button
                    key={value}
                    onClick={() => handleSelect(idx, value)}
                    className={`min-w-[2.5rem] rounded-full border-2 px-3 py-2 text-sm font-bold transition ${
                      selected
                        ? "border-cyan-600 bg-cyan-600 text-white"
                        : "border-slate-300 bg-white text-slate-700 hover:border-cyan-500 dark:border-slate-600 dark:bg-slate-900 dark:text-slate-300"
                    }`}
                    aria-pressed={selected}
                  >
                    {value}
                  </button>
                );
              })}
            </div>
          </li>
        ))}
      </ol>

      <div className="mt-6 flex flex-col items-start justify-between gap-3 md:flex-row md:items-center">
        <div className="text-xs text-slate-500 dark:text-slate-400">
          <p>
            Items answered: {responses.filter((v) => v >= 1).length} / {items.length}
          </p>
          <p>EID score (0..1): {Number.isFinite(stats.eid) ? stats.eid.toFixed(3) : "—"}</p>
          <p>Internal consistency (Cronbach&apos;s α): cohort-level analysis only</p>
        </div>
        <motion.button
          whileTap={{ scale: 0.96 }}
          disabled={!allAnswered || submitted}
          onClick={submit}
          className={`rounded-full px-5 py-2 text-sm font-semibold transition ${
            allAnswered && !submitted
              ? "bg-cyan-600 text-white hover:bg-cyan-700"
              : "cursor-not-allowed bg-slate-300 text-slate-600 dark:bg-slate-700 dark:text-slate-400"
          }`}
        >
          {submitted ? t("survey.submitted") : t("survey.submit")}
        </motion.button>
      </div>
    </div>
  );
};

export default ValidatedSurvey;
