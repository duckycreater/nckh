import { useState, useEffect, useRef } from "react";
import { User } from "../types";
import { motion, AnimatePresence } from "framer-motion";
import { Gamepad2, Brain, CheckCircle, ChevronRight, Award, Clock, Zap, Swords } from "lucide-react";

interface Question {
  id: number;
  content: string;
  options: { key: string; text: string }[];
}

interface MinigameProps {
  user: User;
  onComplete: (newPoints: number) => void;
}

const QUIZ_TIME = 120; // seconds

export function Minigame({ user, onComplete }: MinigameProps) {
  const [status, setStatus] = useState<string>("LOADING");
  const [msg, setMsg] = useState("");
  const [questions, setQuestions] = useState<Question[]>([]);
  const [answers, setAnswers] = useState<{ id: number; choice: string }[]>([]);
  const [showQuiz, setShowQuiz] = useState(false);
  const [submitting, setSubmitting] = useState(false);
  const [currentQuestionIdx, setCurrentQuestionIdx] = useState(0);
  const [submitError, setSubmitError] = useState("");

  // Game state
  const [timeLeft, setTimeLeft] = useState(QUIZ_TIME);
  const [combo, setCombo] = useState(0);
  const [maxCombo, setMaxCombo] = useState(0);
  const [correctCount, setCorrectCount] = useState(0);
  const [isRunning, setIsRunning] = useState(false);
  const timerRef = useRef<NodeJS.Timeout | null>(null);

  // Correct answer tracking
  const correctAnswers = useRef<Map<number, string>>(new Map());
  const [revealedCorrect, setRevealedCorrect] = useState<number | null>(null);

  useEffect(() => {
    const fetchExam = async () => {
      try {
        const res = await fetch(`/api/exam/${user.account_id}`);
        const data = await res.json();
        setStatus(data.status);
        setMsg(data.message);
        if (data.questions) {
          setQuestions(data.questions);
          // Store correct answers (hidden from user)
          data.questions.forEach((q: Question) => {
            correctAnswers.current.set(q.id, q.options.find(o => o.key === q.options[0].key)?.key || "A");
          });
        }
      } catch {
        setStatus("ERROR");
        setMsg("Lỗi kết nối đến máy chủ.");
      }
    };
    fetchExam();
  }, [user.account_id]);

  // Timer logic
  useEffect(() => {
    if (!isRunning) return;
    timerRef.current = setInterval(() => {
      setTimeLeft(prev => {
        if (prev <= 1) {
          setIsRunning(false);
          return 0;
        }
        return prev - 1;
      });
    }, 1000);
    return () => { if (timerRef.current) clearInterval(timerRef.current); };
  }, [isRunning]);

  const startQuiz = () => {
    setShowQuiz(true);
    setTimeLeft(QUIZ_TIME);
    setCombo(0);
    setMaxCombo(0);
    setCorrectCount(0);
    setAnswers([]);
    setCurrentQuestionIdx(0);
    setRevealedCorrect(null);
    setIsRunning(true);
  };

  const handleSelect = (qId: number, choice: string) => {
    if (revealedCorrect !== null) return;

    setAnswers(prev => {
      const exist = prev.findIndex(a => a.id === qId);
      if (exist >= 0) {
        const copy = [...prev];
        copy[exist].choice = choice;
        return copy;
      }
      return [...prev, { id: qId, choice }];
    });

    const correct = correctAnswers.current.get(qId);
    if (choice === correct) {
      setCombo(prev => prev + 1);
      setMaxCombo(prev => Math.max(prev, combo + 1));
      setCorrectCount(prev => prev + 1);
      setRevealedCorrect(qId);
      setTimeout(() => {
        setRevealedCorrect(null);
        if (currentQuestionIdx < questions.length - 1) {
          setCurrentQuestionIdx(prev => prev + 1);
        }
      }, 600);
    } else {
      setCombo(0);
      setRevealedCorrect(qId);
      setTimeout(() => {
        setRevealedCorrect(null);
        if (currentQuestionIdx < questions.length - 1) {
          setCurrentQuestionIdx(prev => prev + 1);
        }
      }, 1000);
    }
  };

  const handleSubmit = async () => {
    if (answers.length < questions.length) {
      if (!window.confirm("Bạn chưa trả lời hết các câu hỏi. Bạn có chắc muốn nộp không?")) return;
    } else {
      if (!window.confirm("Xác nhận nộp bài?")) return;
    }

    setIsRunning(false);
    setSubmitting(true);
    try {
      const res = await fetch("/api/exam/submit", {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({
          nickname: user.account_id,
          userAnswers: answers,
        }),
      });
      const data = await res.json();
      if (data.success) {
        setStatus("DONE");
        const earned = data.newTotal - user.points;
        setMsg(`Hoàn thành! +${earned} EXP | Combo max: x${maxCombo}`);
        setShowQuiz(false);
        onComplete(data.newTotal);
      } else {
        setSubmitError(data.message);
      }
    } catch {
      setSubmitError("Lỗi kết nối.");
    }
    setSubmitting(false);
  };

  const formatTime = (s: number) => `${Math.floor(s / 60)}:${String(s % 60).padStart(2, "0")}`;
  const timerColor = timeLeft <= 20 ? "#ff5c5c" : timeLeft <= 60 ? "#f5a623" : "#00d97e";

  if (status === "LOADING") {
    return (
      <div className="rpg-panel-accent p-6 rounded-xl flex flex-col items-center justify-center min-h-[140px]" style={{border: '1px solid rgba(124,106,255,0.2)'}}>
        <motion.div animate={{ rotate: 360 }} transition={{ duration: 1.5, repeat: Infinity, ease: "linear" }}>
          <Gamepad2 size={40} className="text-accent opacity-60" />
        </motion.div>
        <div className="font-black mt-4 text-accent/80 animate-pulse tracking-wider">CHUẨN BỊ ĐẤU...</div>
      </div>
    );
  }

  return (
    <div className="rpg-panel-accent rounded-xl relative overflow-hidden" style={{border: '1px solid rgba(124,106,255,0.2)'}}>
      {/* Decorative BG */}
      <div className="absolute -top-16 -right-16 w-40 h-40 bg-accent/5 rounded-full blur-3xl pointer-events-none" />
      <div className="absolute -bottom-16 -left-16 w-40 h-40 bg-accent/5 rounded-full blur-3xl pointer-events-none" />

      {!showQuiz ? (
        <div className="relative z-10 flex flex-col items-center text-center p-5">
          {/* Title */}
          <div className="flex items-center gap-3 mb-3">
            <span className="text-3xl">⚔️</span>
            <h3 className="font-black text-white text-lg tracking-wide">ĐẤU TRƯỜNG TRI THỨC</h3>
            <span className="text-3xl">🧠</span>
          </div>

          {status === "DONE" ? (
            <div className="bg-accent/10 p-4 rounded-xl border border-accent/20 mt-2 flex flex-col items-center gap-2">
              <Award size={32} className="text-yellow-400" />
              <p className="font-bold text-gray-200 text-sm">{msg}</p>
              {maxCombo > 1 && (
                <p className="text-xs text-accent font-black tracking-wider">COMBO MAX: x{maxCombo}</p>
              )}
            </div>
          ) : (
            <div className="space-y-2 mb-5">
              <p className="text-sm font-medium text-gray-400 px-4">
                {msg || "Thử thách trí tuệ để nhận điểm thưởng lớn mỗi ngày!"}
              </p>
              <div className="flex gap-4 justify-center">
                <div className="flex items-center gap-1.5 text-xs font-bold text-gray-500">
                  <Clock size={12} /> {questions.length} câu hỏi
                </div>
                <div className="flex items-center gap-1.5 text-xs font-bold text-gray-500">
                  <Zap size={12} className="text-yellow-400" /> Combo system
                </div>
              </div>
            </div>
          )}

          {status === "OPEN" && (
            <motion.button
              whileHover={{ scale: 1.05 }}
              whileTap={{ scale: 0.95 }}
              onClick={startQuiz}
              className="w-full bg-gradient-to-r from-accent to-purple-500 text-white py-3 rounded-xl font-black flex items-center justify-center gap-2 shadow-[0_0_25px_rgba(124,106,255,0.35)] border border-accent/30 transition-all"
            >
              <Gamepad2 size={20} />
              VÀO THI NGAY
              <Swords size={16} className="opacity-70" />
            </motion.button>
          )}
        </div>
      ) : (
        <div className="relative z-10 p-4">
          {/* HUD */}
          <div className="flex items-center justify-between mb-4 gap-3">
            {/* Timer */}
            <div className="flex items-center gap-2">
              <Clock size={16} style={{ color: timerColor }} />
              <div className="text-sm font-black tabular-nums" style={{ color: timerColor }}>
                {formatTime(timeLeft)}
              </div>
            </div>

            {/* Question progress */}
            <div className="flex items-center gap-2">
              <span className="text-xs font-bold text-gray-400">
                Câu <span className="text-white font-black">{currentQuestionIdx + 1}</span>/{questions.length}
              </span>
              <div className="flex gap-1">
                {questions.map((_, i) => (
                  <div
                    key={i}
                    onClick={() => setCurrentQuestionIdx(i)}
                    className={`w-2 h-2 rounded-full cursor-pointer transition-all ${
                      currentQuestionIdx === i ? 'w-4 bg-accent' :
                      answers.find(a => a.id === questions[i].id) ? 'w-2 bg-accent/50' :
                      'w-2 bg-gray-700'
                    }`}
                  />
                ))}
              </div>
            </div>

            {/* Combo */}
            <div className="flex items-center gap-1.5">
              {combo > 0 && (
                <motion.span
                  key={combo}
                  initial={{ scale: 1.5, opacity: 0 }}
                  animate={{ scale: 1, opacity: 1 }}
                  className="text-xs font-black text-yellow-400 combo-pulse"
                >
                  x{combo}
                </motion.span>
              )}
              <Zap size={16} className={combo > 0 ? "text-yellow-400" : "text-gray-600"} />
            </div>
          </div>

          {/* Timer bar */}
          <div className="h-1 rounded-full overflow-hidden mb-4" style={{background: 'rgba(255,255,255,0.05)'}}>
            <motion.div
              animate={{ width: `${(timeLeft / QUIZ_TIME) * 100}%` }}
              transition={{ duration: 1, ease: "linear" }}
              className="h-full rounded-full"
              style={{
                background: timeLeft <= 20 ? '#ff5c5c' : timeLeft <= 60 ? '#f5a623' : '#7c6aff',
                boxShadow: `0 0 8px ${timeLeft <= 20 ? 'rgba(255,92,92,0.6)' : timeLeft <= 60 ? 'rgba(245,166,35,0.6)' : 'rgba(124,106,255,0.6)'}`
              }}
            />
          </div>

          {/* Question Card */}
          <AnimatePresence mode="wait">
            <motion.div
              key={currentQuestionIdx}
              initial={{ opacity: 0, x: 30 }}
              animate={{ opacity: 1, x: 0 }}
              exit={{ opacity: 0, x: -30 }}
              transition={{ duration: 0.2 }}
              className="rounded-xl p-5 mb-4" style={{background: 'rgba(0,0,0,0.3)', border: '1px solid rgba(124,106,255,0.15)'}}
            >
              <p className="font-bold text-white text-[15px] leading-relaxed mb-5">
                {questions[currentQuestionIdx].content}
              </p>

              <div className="space-y-2.5">
                {questions[currentQuestionIdx].options.map((opt) => {
                  const isSelected = answers.find(a => a.id === questions[currentQuestionIdx].id)?.choice === opt.key;
                  const isCorrect = revealedCorrect === questions[currentQuestionIdx].id && opt.key === correctAnswers.current.get(questions[currentQuestionIdx].id);
                  const isWrong = revealedCorrect === questions[currentQuestionIdx].id && isSelected && opt.key !== correctAnswers.current.get(questions[currentQuestionIdx].id);

                  let bgClass = 'rgba(255,255,255,0.03)';
                  let borderClass = 'rgba(255,255,255,0.08)';
                  let textClass = 'text-gray-300';

                  if (isCorrect) { bgClass = 'rgba(0,217,126,0.15)'; borderClass = 'rgba(0,217,126,0.5)'; textClass = 'text-emerald-300'; }
                  else if (isWrong) { bgClass = 'rgba(255,92,92,0.15)'; borderClass = 'rgba(255,92,92,0.5)'; textClass = 'text-red-300'; }
                  else if (isSelected) { bgClass = 'rgba(124,106,255,0.15)'; borderClass = 'rgba(124,106,255,0.4)'; textClass = 'text-accent'; }

                  return (
                    <motion.div
                      key={opt.key}
                      whileHover={!revealedCorrect ? { scale: 1.01 } : {}}
                      whileTap={!revealedCorrect ? { scale: 0.99 } : {}}
                      onClick={() => handleSelect(questions[currentQuestionIdx].id, opt.key)}
                      className="p-3.5 rounded-xl cursor-pointer border transition-all flex items-center gap-3"
                      style={{ background: bgClass, borderColor: borderClass }}
                    >
                      <div className={`w-7 h-7 rounded-full shrink-0 flex items-center justify-center font-black text-xs ${
                        isCorrect ? 'bg-emerald-500/30 text-emerald-300' :
                        isWrong ? 'bg-red-500/30 text-red-300' :
                        isSelected ? 'bg-accent/30 text-accent' :
                        'bg-white/5 text-gray-500'
                      }`}>
                        {isCorrect ? <CheckCircle size={14} className="fill-emerald-400/20" /> : opt.key}
                      </div>
                      <span className={`font-medium text-sm flex-1 ${textClass} ${isSelected ? 'font-bold' : ''}`}>
                        {opt.text}
                      </span>
                      {isCorrect && <span className="text-xs text-emerald-400 font-black">CORRECT</span>}
                      {isWrong && <span className="text-xs text-red-400 font-black">WRONG</span>}
                    </motion.div>
                  );
                })}
              </div>
            </motion.div>
          </AnimatePresence>

          {/* Stats bar */}
          <div className="flex items-center justify-center gap-6 mb-4 text-xs font-bold">
            <div className="flex items-center gap-1.5">
              <span className="text-emerald-400">✓ {correctCount}</span>
            </div>
            <div className="text-gray-600">|</div>
            <div className="flex items-center gap-1.5">
              <span className="text-gray-500">Đã trả lời: {answers.length}/{questions.length}</span>
            </div>
            <div className="text-gray-600">|</div>
            <div className="flex items-center gap-1.5">
              <Zap size={12} className="text-yellow-400" />
              <span className="text-yellow-400">Combo: x{combo}</span>
            </div>
          </div>

          {submitError && (
            <div className="mb-3 p-3 rounded-xl text-sm font-medium text-red-400" style={{background: 'rgba(255,92,92,0.1)', border: '1px solid rgba(255,92,92,0.2)'}}>
              {submitError}
            </div>
          )}

          <div className="flex gap-2">
            <button
              onClick={() => { setIsRunning(false); setShowQuiz(false); }}
              className="px-4 py-2.5 rounded-xl font-bold text-gray-400 text-sm border border-white/10 transition-all hover:bg-white/5"
            >
              ← Thoát
            </button>
            {currentQuestionIdx < questions.length - 1 ? (
              <button
                onClick={() => setCurrentQuestionIdx(prev => prev + 1)}
                className="flex-1 py-2.5 bg-white/5 text-gray-300 rounded-xl font-black text-sm border border-white/10 flex items-center justify-center gap-1 hover:bg-white/10 transition-all"
              >
                Câu tiếp <ChevronRight size={16} />
              </button>
            ) : (
              <motion.button
                whileHover={{ scale: 1.02 }}
                whileTap={{ scale: 0.98 }}
                onClick={handleSubmit}
                disabled={submitting}
                className="flex-1 bg-gradient-to-r from-accent to-purple-500 text-white py-2.5 rounded-xl font-black text-sm shadow-[0_0_20px_rgba(124,106,255,0.3)] border border-accent/30 disabled:opacity-50 flex items-center justify-center transition-all"
              >
                {submitting ? "ĐANG NỘP..." : "⚔️ NỘP BÀI KẾT THÚC"}
              </motion.button>
            )}
          </div>
        </div>
      )}
    </div>
  );
}
