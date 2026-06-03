import { useState, useEffect } from "react";
import { User } from "../types";
import { motion, AnimatePresence } from "framer-motion";
import { Gamepad2, Brain, CheckCircle, AlertCircle, ChevronRight, Award } from "lucide-react";

interface Question {
  id: number;
  content: string;
  options: { key: string; text: string }[];
}

interface MinigameProps {
  user: User;
  onComplete: (newPoints: number) => void;
}

export function Minigame({ user, onComplete }: MinigameProps) {
  const [status, setStatus] = useState<string>("LOADING");
  const [msg, setMsg] = useState("");
  const [questions, setQuestions] = useState<Question[]>([]);
  const [answers, setAnswers] = useState<{ id: number; choice: string }[]>([]);
  const [showQuiz, setShowQuiz] = useState(false);
  const [submitting, setSubmitting] = useState(false);
  const [currentQuestionIdx, setCurrentQuestionIdx] = useState(0);
  const [submitError, setSubmitError] = useState("");

  useEffect(() => {
    const fetchExam = async () => {
      try {
        const res = await fetch(`/api/exam/${user.account_id}`);
        const data = await res.json();
        setStatus(data.status);
        setMsg(data.message);
        if (data.questions) {
          setQuestions(data.questions);
        }
      } catch {
        setStatus("ERROR");
        setMsg("Lỗi kết nối đến máy chủ.");
      }
    };
    fetchExam();
  }, [user.account_id]);

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
    
    // Auto next after slight delay
    if (currentQuestionIdx < questions.length - 1) {
      setTimeout(() => {
        setCurrentQuestionIdx(prev => prev + 1);
      }, 400);
    }
  };

  const handleSubmit = async () => {
    if (answers.length < questions.length) {
      if (
        !window.confirm(
          "Bạn chưa trả lời hết các câu hỏi. Bạn có chắc muốn nộp không?",
        )
      )
        return;
    } else {
      if (
        !window.confirm(
          "Xác nhận nộp bài? Hãy chắc chắn rằng bạn đã chọn cẩn thận.",
        )
      )
        return;
    }

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
        setMsg(
          `Bạn đã hoàn thành xuất sắc! (+${data.newTotal - user.points} điểm)`,
        );
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

  if (status === "LOADING") {
    return (
      <div className="bg-pink-50 p-6 rounded-2xl border border-pink-100 flex flex-col items-center justify-center min-h-[160px]">
        <motion.div 
          animate={{ rotate: 360 }}
          transition={{ duration: 1.5, repeat: Infinity, ease: "linear" }}
        >
          <Gamepad2 size={40} className="text-pink-300" />
        </motion.div>
        <div className="font-bold mt-4 text-pink-700 animate-pulse">Chuẩn bị Đấu...</div>
      </div>
    );
  }

  return (
    <div className="bg-gradient-to-br from-fuchsia-50 to-pink-100 rounded-2xl p-5 shadow-sm border border-pink-200 mt-4 relative overflow-hidden">
      {/* Decorative BG Elements */}
      <div className="absolute -top-10 -right-10 w-32 h-32 bg-pink-300 rounded-full blur-3xl opacity-20 pointer-events-none" />
      <div className="absolute -bottom-10 -left-10 w-32 h-32 bg-purple-300 rounded-full blur-3xl opacity-20 pointer-events-none" />

      {!showQuiz ? (
        <div className="relative z-10 flex flex-col items-center text-center">
          <div className="w-16 h-16 bg-white rounded-2xl shadow-sm flex items-center justify-center mb-4">
            <Brain size={32} className="text-pink-600" />
          </div>
          
          <h3 className="font-black text-gray-800 text-lg mb-1">Đấu Trường Sinh Thái</h3>
          
          {status === "DONE" ? (
             <div className="bg-white/60 p-4 rounded-xl border border-white mt-2 flex flex-col items-center">
               <Award size={32} className="text-amber-500 mb-2" />
               <p className="font-bold text-gray-800">{msg}</p>
             </div>
          ) : (
            <p className="text-sm font-medium text-pink-700/80 mb-6 px-4">
              {msg || "Thử thách trí tuệ để nhận điểm thưởng lớn mỗi ngày!"}
            </p>
          )}

          {status === "OPEN" && (
            <motion.button
              whileHover={{ scale: 1.05 }}
              whileTap={{ scale: 0.95 }}
              onClick={() => setShowQuiz(true)}
              className="w-full bg-gradient-to-r from-pink-500 to-rose-500 text-white py-3 rounded-full font-black flex items-center justify-center gap-2 shadow-[0_4px_15px_-3px_rgba(236,72,153,0.5)]"
            >
              <Gamepad2 size={20} /> VÀO THI NGAY
            </motion.button>
          )}
        </div>
      ) : (
        <div className="relative z-10">
          <div className="flex justify-between items-center mb-4">
            <h4 className="font-black text-gray-800 flex items-center gap-2">
              <Brain className="text-pink-600" /> Câu {currentQuestionIdx + 1} <span className="text-sm font-medium text-gray-400">/ {questions.length}</span>
            </h4>
            
            {/* Nav bubbles */}
            <div className="flex gap-1">
              {questions.map((_, i) => (
                <div 
                  key={i} 
                  className={`border transition-all ${
                    currentQuestionIdx === i ? 'w-4 bg-pink-500 border-pink-500' : 
                    answers.find(a => a.id === questions[i].id) ? 'w-2 bg-pink-200 border-pink-300' : 
                    'w-2 bg-white border-gray-300'
                  } h-2 rounded-full cursor-pointer hover:bg-pink-400`}
                  onClick={() => setCurrentQuestionIdx(i)}
                />
              ))}
            </div>
          </div>
          
          <AnimatePresence mode="wait">
            <motion.div
              key={currentQuestionIdx}
              initial={{ opacity: 0, x: 20 }}
              animate={{ opacity: 1, x: 0 }}
              exit={{ opacity: 0, x: -20 }}
              transition={{ duration: 0.2 }}
              className="bg-white rounded-xl p-5 shadow-sm border border-gray-100"
            >
              <p className="font-bold text-gray-800 mb-6 text-lg">
                {questions[currentQuestionIdx].content}
              </p>
              
              <div className="space-y-3">
                {questions[currentQuestionIdx].options.map((opt) => {
                  const isSelected = answers.find(a => a.id === questions[currentQuestionIdx].id)?.choice === opt.key;
                  
                  return (
                    <motion.div
                      key={opt.key}
                      whileHover={{ scale: 1.02 }}
                      whileTap={{ scale: 0.98 }}
                      onClick={() => handleSelect(questions[currentQuestionIdx].id, opt.key)}
                      className={`p-4 rounded-xl cursor-pointer border-2 transition-all flex items-center gap-3 ${
                        isSelected 
                        ? 'border-pink-500 bg-pink-50 text-pink-900 shadow-sm' 
                        : 'border-transparent bg-gray-50 text-gray-700 hover:bg-gray-100 border-gray-100'
                      }`}
                    >
                      <div className={`w-6 h-6 rounded-full shrink-0 flex items-center justify-center font-bold text-xs ${
                        isSelected ? 'bg-pink-500 text-white' : 'bg-gray-200 text-gray-500'
                      }`}>
                        {opt.key}
                      </div>
                      <span className={`font-medium text-sm flex-1 ${isSelected ? 'font-bold' : ''}`}>
                         {opt.text}
                      </span>
                      {isSelected && <CheckCircle size={18} className="text-pink-500" />}
                    </motion.div>
                  )
                })}
              </div>
            </motion.div>
          </AnimatePresence>

          {submitError && (
            <div className="mb-3 p-3 bg-red-50 border border-red-200 rounded-xl text-sm text-red-600 font-medium">
              {submitError}
            </div>
          )}
          <div className="mt-4 flex gap-2">
             <button
                onClick={() => setCurrentQuestionIdx(prev => Math.max(0, prev - 1))}
                disabled={currentQuestionIdx === 0}
                className="px-4 py-3 bg-white text-gray-500 rounded-full font-bold shadow-sm disabled:opacity-50"
             >
               Trở lại
             </button>
             
             {currentQuestionIdx < questions.length - 1 ? (
               <button
                  onClick={() => setCurrentQuestionIdx(prev => prev + 1)}
                  className="flex-1 py-3 bg-gray-800 text-white rounded-full font-bold shadow-sm flex items-center justify-center gap-1 hover:bg-gray-900"
               >
                 Câu tiếp theo <ChevronRight size={18} />
               </button>
             ) : (
               <motion.button
                  whileHover={{ scale: 1.02 }}
                  whileTap={{ scale: 0.98 }}
                  onClick={handleSubmit}
                  disabled={submitting}
                  className="flex-1 bg-gradient-to-r from-pink-500 to-rose-500 text-white py-3 rounded-full font-black shadow-[0_4px_15px_-3px_rgba(236,72,153,0.5)] disabled:opacity-70 flex items-center justify-center transition-all"
                >
                  {submitting ? "ĐANG NỘP..." : "NỘP BÀI THI KẾT THÚC"}
                </motion.button>
             )}
          </div>
        </div>
      )}
    </div>
  );
}
