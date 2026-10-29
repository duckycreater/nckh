import { useState, useEffect, useRef } from "react";
import { User } from "../types";
import { motion, AnimatePresence } from "framer-motion";
import { Gamepad2, Brain, ChevronRight, Award, Clock, Zap } from "lucide-react";
import { useTranslation } from "react-i18next";
import { getAuthHeaders } from "../lib/auth";

interface Question {
  id: number;
  content: string;
  options: { key: string; text: string }[];
}

interface MinigameProps {
  user: User;
  onComplete: (newPoints: number) => void;
}

const QUIZ_TIME = 120;

export function Minigame({ user, onComplete }: MinigameProps) {
  const { t } = useTranslation();
  const [status, setStatus] = useState<string>("LOADING");
  const [msg, setMsg] = useState("");
  const [questions, setQuestions] = useState<Question[]>([]);
  const [answers, setAnswers] = useState<{ id: number; choice: string }[]>([]);
  const [showQuiz, setShowQuiz] = useState(false);
  const [submitting, setSubmitting] = useState(false);
  const [currentQuestionIdx, setCurrentQuestionIdx] = useState(0);
  const [submitError, setSubmitError] = useState("");
  const [sessionId, setSessionId] = useState("");

  const [timeLeft, setTimeLeft] = useState(QUIZ_TIME);
  const [maxCombo, setMaxCombo] = useState(0);
  const [correctCount, setCorrectCount] = useState(0);
  const [isRunning, setIsRunning] = useState(false);
  const timerRef = useRef<NodeJS.Timeout | null>(null);

  useEffect(() => {
    const fetchExam = async () => {
      try {
        const res = await fetch(`/api/exam/${user.account_id}`, { headers: getAuthHeaders() });
        const data = await res.json();
        setStatus(data.status);
        setMsg(data.message);
        setSessionId(typeof data.sessionId === "string" ? data.sessionId : "");
        if (data.questions) {
          setQuestions(data.questions);
        }
      } catch {
        setStatus("ERROR");
        setMsg(t("minigame.connectionError"));
      }
    };
    fetchExam();
  }, [user.account_id, t]);

  useEffect(() => {
    if (!isRunning) return;
    timerRef.current = setInterval(() => {
      setTimeLeft((prev) => {
        if (prev <= 1) {
          setIsRunning(false);
          return 0;
        }
        return prev - 1;
      });
    }, 1000);
    return () => {
      if (timerRef.current) clearInterval(timerRef.current);
    };
  }, [isRunning]);

  const startQuiz = () => {
    setShowQuiz(true);
    setTimeLeft(QUIZ_TIME);
    setMaxCombo(0);
    setCorrectCount(0);
    setAnswers([]);
    setCurrentQuestionIdx(0);
    setIsRunning(true);
  };

  const handleSelect = (qId: number, choice: string) => {
    setAnswers((prev) => {
      const exist = prev.findIndex((a) => a.id === qId);
      if (exist >= 0) {
        const copy = [...prev];
        copy[exist].choice = choice;
        return copy;
      }
      return [...prev, { id: qId, choice }];
    });
    if (currentQuestionIdx < questions.length - 1) {
      setTimeout(() => setCurrentQuestionIdx((prev) => prev + 1), 160);
    }
  };

  const handleSubmit = async () => {
    if (answers.length < questions.length) {
      if (!window.confirm(t("minigame.confirmSubmit"))) return;
    } else {
      if (!window.confirm(t("minigame.confirmSubmitTitle"))) return;
    }
    setIsRunning(false);
    setSubmitting(true);
    try {
      const res = await fetch("/api/exam/submit", {
        method: "POST",
        headers: { "Content-Type": "application/json", ...getAuthHeaders() },
        body: JSON.stringify({ sessionId, userAnswers: answers }),
      });
      const data = await res.json();
      if (data.success) {
        const answerResults = Array.isArray(data.results) ? data.results : [];
        let streak = 0;
        let bestStreak = 0;
        for (const answer of answerResults) {
          streak = answer.correct ? streak + 1 : 0;
          bestStreak = Math.max(bestStreak, streak);
        }
        setCorrectCount(Number(data.correctCount) || 0);
        setMaxCombo(bestStreak);
        setStatus("DONE");
        const earned = data.newTotal - user.points;
        setMsg(t("minigame.completed", { exp: earned, maxCombo }));
        setShowQuiz(false);
        onComplete(data.newTotal);
      } else {
        setSubmitError(data.message);
      }
    } catch {
      setSubmitError(t("minigame.serverError"));
    }
    setSubmitting(false);
  };

  const formatTime = (s: number) => `${Math.floor(s / 60)}:${String(s % 60).padStart(2, "0")}`;
  const timerColor = timeLeft <= 20 ? "#ef4444" : timeLeft <= 60 ? "#f59e0b" : "#0f8f68";

  if (status === "LOADING") {
    return (
      <div className="surface-card p-6 rounded-2xl flex flex-col items-center justify-center min-h-[120px]">
        <motion.div
          animate={{ rotate: 360 }}
          transition={{ duration: 1.5, repeat: Infinity, ease: "linear" }}
        >
          <Brain size={36} className="text-gray-300" />
        </motion.div>
        <p className="mt-3 text-sm text-gray-400 font-medium">{t("common.loading")}</p>
      </div>
    );
  }

  return (
    <div className="surface-card rounded-2xl overflow-hidden">
      {!showQuiz ? (
        <div className="flex flex-col items-center text-center p-5">
          {/* Title */}
          <div className="flex items-center gap-2 mb-3">
            <Brain size={22} className="text-emerald-600" />
            <h3 className="font-bold text-gray-800 text-base">{t("minigame.quizTitle")}</h3>
          </div>

          {status === "DONE" ? (
            <div className="bg-emerald-50 p-4 rounded-xl border border-emerald-100 mt-2 flex flex-col items-center gap-2 w-full">
              <Award size={28} className="text-amber-500" />
              <p className="font-medium text-gray-700 text-sm">{msg}</p>
              <p className="text-xs font-semibold text-gray-600">
                {correctCount}/{questions.length} câu đúng
              </p>
              {maxCombo > 1 && (
                <p className="text-xs font-bold text-emerald-600">
                  {t("minigame.comboMax", { maxCombo })}
                </p>
              )}
            </div>
          ) : (
            <div className="space-y-2 mb-5 w-full">
              <p className="text-sm text-gray-500 px-2">{msg || t("minigame.quizSubtitle")}</p>
              <div className="flex gap-4 justify-center text-xs text-gray-400 font-medium">
                <span>{t("minigame.questions", { count: questions.length })}</span>
                <span>·</span>
                <span className="text-amber-600">
                  {t("minigame.timeLimit", { minutes: QUIZ_TIME / 60 })}
                </span>
                <span>·</span>
                <span className="text-emerald-600">Chấm điểm trên máy chủ</span>
              </div>
            </div>
          )}

          {status === "OPEN" && (
            <button
              onClick={startQuiz}
              className="w-full bg-emerald-500 hover:bg-emerald-600 active:bg-emerald-700 text-white py-2.5 rounded-xl font-semibold text-sm flex items-center justify-center gap-2 transition-colors"
            >
              <Gamepad2 size={18} />
              {t("minigame.startQuiz")}
            </button>
          )}
        </div>
      ) : (
        <div className="p-4">
          {/* HUD */}
          <div className="flex items-center justify-between mb-3 gap-3">
            <div className="flex items-center gap-1.5">
              <Clock size={14} style={{ color: timerColor }} />
              <span className="text-sm font-semibold tabular-nums" style={{ color: timerColor }}>
                {formatTime(timeLeft)}
              </span>
            </div>
            <div className="flex items-center gap-1.5 text-xs text-gray-500 font-medium">
              {t("minigame.questionProgress", {
                current: currentQuestionIdx + 1,
                total: questions.length,
              })}
            </div>
            <div className="flex items-center gap-1 text-xs text-gray-500">
              <Zap size={14} className="text-amber-500" />
              {answers.length}/{questions.length}
            </div>
          </div>

          {/* Timer bar */}
          <div className="h-1 rounded-full overflow-hidden mb-4 bg-gray-100">
            <motion.div
              animate={{ width: `${(timeLeft / QUIZ_TIME) * 100}%` }}
              transition={{ duration: 1, ease: "linear" }}
              className="h-full rounded-full"
              style={{ background: timerColor }}
            />
          </div>

          {/* Question */}
          <AnimatePresence mode="wait">
            <motion.div
              key={currentQuestionIdx}
              initial={{ opacity: 0, x: 20 }}
              animate={{ opacity: 1, x: 0 }}
              exit={{ opacity: 0, x: -20 }}
              transition={{ duration: 0.2 }}
              className="rounded-xl p-4 mb-3 bg-gray-50 border border-gray-100"
            >
              <p className="font-medium text-gray-800 text-sm leading-relaxed mb-4">
                {questions[currentQuestionIdx].content}
              </p>

              <div className="space-y-2">
                {questions[currentQuestionIdx].options.map((opt) => {
                  const isSelected =
                    answers.find((a) => a.id === questions[currentQuestionIdx].id)?.choice ===
                    opt.key;
                  let bg = "bg-white";
                  let border = "border-gray-200";
                  let textColor = "text-gray-700";

                  if (isSelected) {
                    bg = "bg-emerald-50";
                    border = "border-emerald-200";
                    textColor = "text-emerald-800";
                  }

                  return (
                    <motion.div
                      key={opt.key}
                      whileHover={{ scale: 1.01 }}
                      whileTap={{ scale: 0.99 }}
                      onClick={() => handleSelect(questions[currentQuestionIdx].id, opt.key)}
                      className={`p-3 rounded-xl cursor-pointer border flex items-center gap-3 transition-all ${bg} ${border}`}
                    >
                      <div
                        className={`w-6 h-6 rounded-full shrink-0 flex items-center justify-center text-xs font-bold ${isSelected ? "bg-emerald-100 text-emerald-700" : "bg-gray-100 text-gray-500"}`}
                      >
                        {opt.key}
                      </div>
                      <span
                        className={`text-sm flex-1 ${textColor} ${isSelected ? "font-semibold" : ""}`}
                      >
                        {opt.text}
                      </span>
                    </motion.div>
                  );
                })}
              </div>
            </motion.div>
          </AnimatePresence>

          {/* Stats */}
          <div className="flex items-center justify-center gap-5 mb-3 text-xs text-gray-400 font-medium">
            <span>
              {t("minigame.answered", { answered: answers.length, total: questions.length })}
            </span>
          </div>

          {submitError && (
            <div className="mb-3 p-2.5 rounded-xl text-sm text-red-600 bg-red-50 border border-red-100">
              {submitError}
            </div>
          )}

          <div className="flex gap-2">
            <button
              onClick={() => {
                setIsRunning(false);
                setShowQuiz(false);
              }}
              className="px-4 py-2 rounded-xl font-medium text-gray-500 text-sm border border-gray-200 bg-white hover:bg-gray-50 transition-colors"
            >
              {t("common.exit")}
            </button>
            {currentQuestionIdx < questions.length - 1 ? (
              <button
                onClick={() => setCurrentQuestionIdx((prev) => prev + 1)}
                className="flex-1 py-2 bg-gray-100 text-gray-600 rounded-xl font-medium text-sm flex items-center justify-center gap-1 hover:bg-gray-200 transition-colors"
              >
                {t("common.next")} <ChevronRight size={15} />
              </button>
            ) : (
              <button
                onClick={handleSubmit}
                disabled={submitting}
                className="flex-1 bg-emerald-500 hover:bg-emerald-600 active:bg-emerald-700 disabled:opacity-50 text-white py-2 rounded-xl font-semibold text-sm flex items-center justify-center gap-1 transition-colors"
              >
                {submitting ? t("minigame.submitting") : t("minigame.submitQuiz")}
              </button>
            )}
          </div>
        </div>
      )}
    </div>
  );
}
