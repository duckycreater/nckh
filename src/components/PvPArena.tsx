import React, { useState, useEffect, useRef } from "react";
import { motion, AnimatePresence } from "framer-motion";
import { Swords, Trophy, Zap, ArrowLeft, X, Loader2, ChevronRight, User, Star, Crown, Target } from "lucide-react";
import { Button, Card } from "../lib/ui";
import type { PvPMatchmakingResult } from "../types";

interface Props {
  onClose: () => void;
  onBattle: (matchId: string, opponentName: string) => void;
  currentUserNick: string;
}

type ArenaStage = "idle" | "searching" | "matched" | "battling" | "result";

interface MatchResult {
  won: boolean;
  reward: number;
  opponentName: string;
}

// Simulated PvP battle engine (same as CardBattle logic)
function simulatePvPBattle(): { playerWins: boolean; playerScore: number; opponentScore: number; rounds: Array<{ player: number; opponent: number }> } {
  const rounds: Array<{ player: number; opponent: number }> = [];
  let playerScore = 0;
  let opponentScore = 0;
  const totalRounds = 3 + Math.floor(Math.random() * 3); // 3-5 rounds

  for (let i = 0; i < totalRounds; i++) {
    const playerRoll = Math.random();
    const opponentRoll = Math.random();
    const playerWins = playerRoll > opponentRoll;

    const winScore = 1 + (Math.random() < 0.2 ? 1 : 0); // Sometimes bonus point
    const loseScore = Math.random() < 0.3 ? 1 : 0;

    if (playerWins) {
      playerScore += winScore;
      opponentScore += loseScore;
    } else {
      opponentScore += winScore;
      playerScore += loseScore;
    }

    rounds.push({ player: winScore, opponent: loseScore });
    if (playerScore >= 3 || opponentScore >= 3) break;
  }

  return { playerWins: playerScore > opponentScore, playerScore, opponentScore, rounds };
}

export function PvPArena({ onClose, onBattle, currentUserNick }: Props) {
  const [stage, setStage] = useState<ArenaStage>("idle");
  const [matchData, setMatchData] = useState<PvPMatchmakingResult | null>(null);
  const [searchTime, setSearchTime] = useState(0);
  const [isSearching, setIsSearching] = useState(false);
  const [battleResult, setBattleResult] = useState<MatchResult | null>(null);
  const [currentRound, setCurrentRound] = useState(0);
  const [battleRounds, setBattleRounds] = useState<Array<{ player: number; opponent: number; playerWin: boolean }>>([]);
  const [scoreAnim, setScoreAnim] = useState<{ player: number; opponent: number }>({ player: 0, opponent: 0 });
  const [showRoundResult, setShowRoundResult] = useState(false);
  const searchTimerRef = useRef<ReturnType<typeof setInterval> | null>(null);
  const battleTimerRef = useRef<ReturnType<typeof setTimeout> | null>(null);

  useEffect(() => {
    return () => {
      if (searchTimerRef.current) clearInterval(searchTimerRef.current);
      if (battleTimerRef.current) clearTimeout(battleTimerRef.current);
    };
  }, []);

  const handleFindMatch = async () => {
    setStage("searching");
    setIsSearching(true);
    setSearchTime(0);
    searchTimerRef.current = setInterval(() => setSearchTime((t) => t + 1), 1000);

    try {
      const res = await fetch("/api/pvp/match", {
        method: "POST",
        headers: { "Authorization": `Bearer ${localStorage.getItem("sessionToken") || ""}` },
      });
      const data = await res.json();
      if (!res.ok) throw new Error(data.error || "Không tìm thấy đối thủ");

      if (searchTimerRef.current) clearInterval(searchTimerRef.current);
      setMatchData(data);
      setStage("matched");
    } catch (err: any) {
      if (searchTimerRef.current) clearInterval(searchTimerRef.current);
      setStage("idle");
      alert(err.message || "Lỗi khi tìm trận đấu");
    } finally {
      setIsSearching(false);
    }
  };

  const handleStartBattle = () => {
    setStage("battling");
    runBattleSimulation();
  };

  const runBattleSimulation = () => {
    if (!matchData) return;
    const result = simulatePvPBattle();
    const rounds = result.rounds.map((r, i) => ({
      ...r,
      playerWin: i < result.rounds.length - 1
        ? r.player > r.opponent
        : (result.playerWins ? r.player >= r.opponent : r.player <= r.opponent),
    }));

    // Show round by round
    let roundIdx = 0;
    let playerScore = 0;
    let opponentScore = 0;

    const nextRound = () => {
      if (roundIdx >= rounds.length) {
        // Final result
        submitResult(result.playerWins, result.playerScore, result.opponentScore);
        return;
      }

      const r = rounds[roundIdx];
      setShowRoundResult(true);
      setScoreAnim({ player: r.player, opponent: r.opponent });
      setCurrentRound(roundIdx + 1);

      battleTimerRef.current = setTimeout(() => {
        setShowRoundResult(false);
        playerScore += r.player;
        opponentScore += r.opponent;
        setScoreAnim({ player: playerScore, opponent: opponentScore });
        setBattleRounds((prev) => [...prev, { player: r.player, opponent: r.opponent, playerWin: r.playerWin }]);
        roundIdx++;
        battleTimerRef.current = setTimeout(nextRound, 800);
      }, 1500);
    };

    battleTimerRef.current = setTimeout(nextRound, 500);
  };

  const submitResult = async (playerWins: boolean, pScore: number, oScore: number) => {
    if (!matchData) return;
    try {
      const res = await fetch("/api/pvp/result", {
        method: "POST",
        headers: {
          "Content-Type": "application/json",
          "Authorization": `Bearer ${localStorage.getItem("sessionToken") || ""}`,
        },
        body: JSON.stringify({
          matchId: matchData.matchId,
          playerWon: playerWins,
          rounds: battleRounds,
        }),
      });
      const data = await res.json();
      setBattleResult({
        won: playerWins,
        reward: data.reward || 0,
        opponentName: matchData.opponentName,
      });
      setStage("result");
    } catch {
      setBattleResult({
        won: playerWins,
        reward: playerWins ? matchData.stake * 2 : 0,
        opponentName: matchData.opponentName,
      });
      setStage("result");
    }
  };

  return (
    <motion.div
      initial={{ opacity: 0 }}
      animate={{ opacity: 1 }}
      exit={{ opacity: 0 }}
      className="fixed inset-0 z-50 flex items-center justify-center bg-black/60 backdrop-blur-sm p-4"
      onClick={(e) => e.target === e.currentTarget && onClose()}
    >
      <motion.div
        initial={{ scale: 0.9, y: 20 }}
        animate={{ scale: 1, y: 0 }}
        exit={{ scale: 0.9, y: 20 }}
        className="relative w-full max-w-md"
      >
        <Card className="overflow-hidden border-0 shadow-2xl">
          {/* Header */}
          <div className="bg-gradient-to-r from-red-500 via-orange-500 to-red-600 px-5 py-4">
            <div className="flex items-center justify-between">
              <div className="flex items-center gap-2">
                <div className="flex h-9 w-9 items-center justify-center rounded-lg bg-white/20">
                  <Swords size={20} className="text-white" />
                </div>
                <div>
                  <h2 className="text-lg font-black text-white">PvP Arena</h2>
                  <p className="text-[11px] font-bold text-white/70">Đấu trường 1v1</p>
                </div>
              </div>
              <button onClick={onClose} className="flex h-8 w-8 items-center justify-center rounded-lg bg-white/20 text-white hover:bg-white/30">
                <X size={16} />
              </button>
            </div>
          </div>

          {/* Content */}
          <div className="bg-slate-50 p-5">
            <AnimatePresence mode="wait">
              {stage === "idle" && (
                <motion.div key="idle" initial={{ opacity: 0 }} animate={{ opacity: 1 }} exit={{ opacity: 0 }}>
                  {/* Stakes info */}
                  <div className="mb-4 rounded-2xl border border-slate-200 bg-white p-4">
                    <div className="mb-3 flex items-center gap-2">
                      <Trophy size={16} className="text-amber-500" />
                      <span className="font-bold text-slate-700">Giải thưởng</span>
                    </div>
                    <div className="grid grid-cols-2 gap-3 text-center">
                      <div className="rounded-xl bg-emerald-50 p-3">
                        <p className="text-2xl font-black text-emerald-600">+40</p>
                        <p className="text-[11px] font-bold text-emerald-500">EXP khi thắng</p>
                      </div>
                      <div className="rounded-xl bg-red-50 p-3">
                        <p className="text-2xl font-black text-red-500">-20</p>
                        <p className="text-[11px] font-bold text-red-400">EXP khi thua</p>
                      </div>
                    </div>
                    <p className="mt-3 text-center text-xs text-slate-400">
                      Đặt cược 20 EXP để vào trận. Người thắng nhận toàn bộ!
                    </p>
                  </div>

                  {/* Rules */}
                  <div className="mb-5 space-y-2">
                    <div className="flex items-center gap-2 text-sm text-slate-600">
                      <div className="flex h-6 w-6 items-center justify-center rounded-full bg-blue-100 text-[10px] font-black text-blue-600">1</div>
                      Hệ thống ghép cặp ngẫu nhiên với đối thủ cùng rank
                    </div>
                    <div className="flex items-center gap-2 text-sm text-slate-600">
                      <div className="flex h-6 w-6 items-center justify-center rounded-full bg-blue-100 text-[10px] font-black text-blue-600">2</div>
                      Trận đấu tự động tính theo 3 hiệp đấu
                    </div>
                    <div className="flex items-center gap-2 text-sm text-slate-600">
                      <div className="flex h-6 w-6 items-center justify-center rounded-full bg-blue-100 text-[10px] font-black text-blue-600">3</div>
                      Người thắng nhận toàn bộ tiền cược
                    </div>
                  </div>

                  <Button onClick={handleFindMatch} className="w-full" size="lg" variant="primary">
                    <Swords size={18} />
                    Tìm trận đấu
                  </Button>
                </motion.div>
              )}

              {stage === "searching" && (
                <motion.div key="searching" initial={{ opacity: 0 }} animate={{ opacity: 1 }} exit={{ opacity: 0 }} className="py-6 text-center">
                  <div className="mx-auto mb-6 flex h-20 w-20 items-center justify-center rounded-full bg-red-50">
                    <motion.div animate={{ rotate: 360 }} transition={{ duration: 3, repeat: Infinity, ease: "linear" }}>
                      <Swords size={36} className="text-red-500" />
                    </motion.div>
                  </div>
                  <p className="mb-2 text-lg font-black text-slate-700">Đang tìm đối thủ...</p>
                  <p className="font-bold text-slate-400">Đối thủ gần rank của bạn</p>
                  <div className="mt-4 flex items-center justify-center gap-1 text-3xl font-black text-slate-300">
                    <motion.span animate={{ opacity: [1, 0.3, 1] }} transition={{ duration: 0.8, repeat: Infinity }}>.</motion.span>
                    <motion.span animate={{ opacity: [1, 0.3, 1] }} transition={{ duration: 0.8, repeat: Infinity, delay: 0.15 }}>.</motion.span>
                    <motion.span animate={{ opacity: [1, 0.3, 1] }} transition={{ duration: 0.8, repeat: Infinity, delay: 0.3 }}>.</motion.span>
                  </div>
                  <p className="mt-3 font-mono text-sm text-slate-400">{searchTime}s</p>
                </motion.div>
              )}

              {stage === "matched" && matchData && (
                <motion.div key="matched" initial={{ opacity: 0, scale: 0.95 }} animate={{ opacity: 1, scale: 1 }} exit={{ opacity: 0 }} className="py-4">
                  <motion.div
                    initial={{ scale: 0 }}
                    animate={{ scale: 1 }}
                    transition={{ type: "spring", stiffness: 300, damping: 20 }}
                    className="mb-5 flex items-center justify-center gap-3"
                  >
                    <div className="flex flex-col items-center">
                      <div className="flex h-16 w-16 items-center justify-center rounded-full bg-emerald-100 text-lg font-black text-emerald-600 ring-4 ring-emerald-200">
                        <User size={28} />
                      </div>
                      <p className="mt-1 font-black text-slate-700">{currentUserNick}</p>
                      <p className="text-xs font-bold text-emerald-500">Bạn</p>
                    </div>

                    <div className="flex flex-col items-center">
                      <Swords size={24} className="text-slate-400" />
                      <p className="font-black text-slate-400">VS</p>
                    </div>

                    <div className="flex flex-col items-center">
                      <div className="relative flex h-16 w-16 items-center justify-center rounded-full bg-red-100 text-lg font-black text-red-600 ring-4 ring-red-200">
                        <Target size={28} />
                        {matchData.opponentPoints > 1000 && (
                          <div className="absolute -right-1 -top-1 flex h-5 w-5 items-center justify-center rounded-full bg-amber-400 text-[9px] font-black text-white">
                            <Crown size={10} />
                          </div>
                        )}
                      </div>
                      <p className="mt-1 font-black text-slate-700">{matchData.opponentName}</p>
                      <p className="text-xs font-bold text-red-400">{(matchData.opponentPoints || 0).toLocaleString()} EXP</p>
                    </div>
                  </motion.div>

                  <div className="mb-5 flex items-center justify-center gap-2 rounded-xl bg-amber-50 px-4 py-2">
                    <Zap size={16} className="text-amber-500" />
                    <p className="font-bold text-amber-700">Cược: {matchData.stake} EXP → Thắng nhận {matchData.stake * 2} EXP!</p>
                  </div>

                  <div className="flex gap-3">
                    <Button onClick={onClose} variant="secondary" className="flex-1">Hủy</Button>
                    <Button onClick={handleStartBattle} variant="primary" className="flex-1 gap-1">
                      <Swords size={16} /> Chiến đấu!
                    </Button>
                  </div>
                </motion.div>
              )}

              {stage === "battling" && (
                <motion.div key="battling" initial={{ opacity: 0 }} animate={{ opacity: 1 }} exit={{ opacity: 0 }} className="py-4">
                  {/* Score display */}
                  <div className="mb-6 flex items-center justify-between rounded-2xl border border-slate-200 bg-white p-4">
                    <div className="flex flex-col items-center">
                      <p className="text-[10px] font-bold uppercase tracking-wider text-slate-400">Bạn</p>
                      <motion.p
                        key={scoreAnim.player}
                        initial={{ scale: 1.5 }}
                        animate={{ scale: 1 }}
                        className="text-5xl font-black text-emerald-600"
                      >
                        {scoreAnim.player}
                      </motion.p>
                    </div>
                    <div className="text-center">
                      <p className="mb-1 font-black text-slate-300">VS</p>
                      <p className="text-xs font-bold text-slate-400">Hiệp {currentRound}</p>
                    </div>
                    <div className="flex flex-col items-center">
                      <p className="text-[10px] font-bold uppercase tracking-wider text-slate-400">Đối thủ</p>
                      <motion.p
                        key={scoreAnim.opponent}
                        initial={{ scale: 1.5 }}
                        animate={{ scale: 1 }}
                        className="text-5xl font-black text-red-500"
                      >
                        {scoreAnim.opponent}
                      </motion.p>
                    </div>
                  </div>

                  {/* Round result */}
                  <AnimatePresence>
                    {showRoundResult && (
                      <motion.div
                        initial={{ opacity: 0, y: 10 }}
                        animate={{ opacity: 1, y: 0 }}
                        exit={{ opacity: 0, y: -10 }}
                        className="mb-4 flex items-center justify-center gap-4"
                      >
                        <div className="flex items-center gap-1 rounded-xl bg-emerald-50 px-4 py-2 font-black text-emerald-600">
                          <Star size={14} className="fill-current" /> +{scoreAnim.player}
                        </div>
                        <div className="text-xs font-bold text-slate-400">vs</div>
                        <div className="flex items-center gap-1 rounded-xl bg-red-50 px-4 py-2 font-black text-red-500">
                          +{scoreAnim.opponent}
                        </div>
                      </motion.div>
                    )}
                  </AnimatePresence>

                  {/* Battle log */}
                  <div className="space-y-2">
                    {battleRounds.map((r, i) => (
                      <div key={i} className="flex items-center justify-between rounded-xl bg-white px-4 py-2 text-sm">
                        <span className="font-bold text-slate-400">Hiệp {i + 1}</span>
                        <div className="flex items-center gap-2">
                          <span className={`font-black ${r.playerWin ? "text-emerald-600" : "text-slate-400"}`}>{r.player} điểm</span>
                          <span className="text-slate-300">vs</span>
                          <span className={`font-black ${!r.playerWin ? "text-red-500" : "text-slate-400"}`}>{r.opponent} điểm</span>
                        </div>
                        {r.playerWin
                          ? <Star size={14} className="fill-amber-400 text-amber-400" />
                          : <X size={14} className="text-red-400" />
                        }
                      </div>
                    ))}
                  </div>
                </motion.div>
              )}

              {stage === "result" && battleResult && (
                <motion.div key="result" initial={{ opacity: 0, scale: 0.8 }} animate={{ opacity: 1, scale: 1 }} exit={{ opacity: 0 }} className="py-4 text-center">
                  {battleResult.won ? (
                    <>
                      <motion.div
                        initial={{ scale: 0 }}
                        animate={{ scale: 1, rotate: [0, 10, -10, 0] }}
                        transition={{ delay: 0.2, type: "spring", stiffness: 300 }}
                        className="mx-auto mb-4 flex h-20 w-20 items-center justify-center rounded-full bg-gradient-to-br from-amber-300 to-yellow-500 shadow-lg"
                      >
                        <Trophy size={40} className="text-white" />
                      </motion.div>
                      <motion.h3
                        initial={{ opacity: 0, y: 10 }}
                        animate={{ opacity: 1, y: 0 }}
                        transition={{ delay: 0.4 }}
                        className="mb-2 text-2xl font-black text-amber-600"
                      >
                        Chiến Thắng!
                      </motion.h3>
                      <motion.p
                        initial={{ opacity: 0 }}
                        animate={{ opacity: 1 }}
                        transition={{ delay: 0.5 }}
                        className="mb-4 font-bold text-slate-500"
                      >
                        Đánh bại {battleResult.opponentName}
                      </motion.p>
                      <motion.div
                        initial={{ opacity: 0, y: 10 }}
                        animate={{ opacity: 1, y: 0 }}
                        transition={{ delay: 0.6 }}
                        className="mx-auto mb-6 inline-flex items-center gap-2 rounded-2xl bg-emerald-50 px-6 py-3 font-black text-2xl text-emerald-600"
                      >
                        <Zap size={24} className="fill-current" />
                        +{battleResult.reward} EXP
                      </motion.div>
                    </>
                  ) : (
                    <>
                      <motion.div
                        initial={{ scale: 0 }}
                        animate={{ scale: 1 }}
                        transition={{ delay: 0.2, type: "spring", stiffness: 300 }}
                        className="mx-auto mb-4 flex h-20 w-20 items-center justify-center rounded-full bg-slate-100"
                      >
                        <span className="text-4xl">😔</span>
                      </motion.div>
                      <motion.h3
                        initial={{ opacity: 0, y: 10 }}
                        animate={{ opacity: 1, y: 0 }}
                        transition={{ delay: 0.4 }}
                        className="mb-2 text-2xl font-black text-slate-500"
                      >
                        Thất Bại
                      </motion.h3>
                      <motion.p
                        initial={{ opacity: 0 }}
                        animate={{ opacity: 1 }}
                        transition={{ delay: 0.5 }}
                        className="mb-4 font-bold text-slate-400"
                      >
                        Thua {battleResult.opponentName}. Giữ lại 20 EXP cược.
                      </motion.p>
                      <motion.div
                        initial={{ opacity: 0 }}
                        animate={{ opacity: 1 }}
                        transition={{ delay: 0.6 }}
                        className="mb-6 inline-flex items-center gap-2 rounded-2xl bg-red-50 px-6 py-3 font-black text-slate-500"
                      >
                        -20 EXP đã cược
                      </motion.div>
                    </>
                  )}

                  <Button onClick={onClose} className="w-full" variant="secondary">
                    Quay về
                  </Button>
                </motion.div>
              )}
            </AnimatePresence>
          </div>
        </Card>
      </motion.div>
    </motion.div>
  );
}
