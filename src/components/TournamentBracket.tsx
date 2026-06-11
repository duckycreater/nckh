import React, { useState, useEffect } from "react";
import { motion, AnimatePresence } from "framer-motion";
import { Trophy, Users, Clock, X, Loader2, Star, Crown, Medal } from "lucide-react";
import { Button, Card } from "../lib/ui";
import type { TournamentStatus, TournamentParticipant, TournamentBracket } from "../types";

interface Props {
  onClose: () => void;
  currentUserNick: string;
}

type TourneyStage = "loading" | "info" | "joined" | "bracket";

function getWeekLabel(): string {
  const now = new Date();
  const vnOffset = 7 * 60;
  const localMs = now.getTime() + (now.getTimezoneOffset() * 60000);
  const vnNow = new Date(localMs + vnOffset * 60000);
  const dayOfWeek = vnNow.getDay();
  const mondayMs = vnNow.getTime() - ((dayOfWeek === 0 ? 6 : dayOfWeek - 1) * 24 * 60 * 60 * 1000);
  const weekStart = new Date(mondayMs);
  const weekEnd = new Date(weekStart.getTime() + 6 * 24 * 60 * 60 * 1000);
  const fmt = (d: Date) => `${d.getDate()}/${d.getMonth() + 1}`;
  return `${fmt(weekStart)} - ${fmt(weekEnd)}`;
}

const REWARDS_DISPLAY = [
  { place: 1, label: "🥇 Vô địch", exp: 1000, badge: "Vô Địch Tuần", color: "from-yellow-400 to-amber-500", bg: "bg-yellow-50", border: "border-yellow-200" },
  { place: 2, label: "🥈 Á quân", exp: 500, badge: null, color: "from-slate-300 to-slate-400", bg: "bg-slate-50", border: "border-slate-200" },
  { place: 3, label: "🥉 Hạng ba", exp: 250, badge: null, color: "from-orange-400 to-orange-500", bg: "bg-orange-50", border: "border-orange-200" },
  { place: 8, label: "⭐ Top 8", exp: 100, badge: null, color: "from-blue-400 to-blue-500", bg: "bg-blue-50", border: "border-blue-200" },
];

export function TournamentBracket({ onClose, currentUserNick }: Props) {
  const [stage, setStage] = useState<TourneyStage>("loading");
  const [status, setStatus] = useState<TournamentStatus | null>(null);
  const [bracket, setBracket] = useState<{ bracket: TournamentBracket | null; participants: TournamentParticipant[] } | null>(null);
  const [joining, setJoining] = useState(false);
  const [weekLabel] = useState(getWeekLabel());

  useEffect(() => {
    fetchStatus();
  }, []);

  const fetchStatus = async () => {
    try {
      const res = await fetch("/api/tournament/current");
      const data = await res.json();
      setStatus(data as TournamentStatus);

      if (data.userJoined) {
        setStage("joined");
        fetchBracket();
      } else {
        setStage("info");
      }
    } catch {
      setStage("info");
    }
  };

  const fetchBracket = async () => {
    try {
      const res = await fetch("/api/tournament/bracket");
      const data = await res.json();
      setBracket(data as { bracket: TournamentBracket | null; participants: TournamentParticipant[] });
      setStage("bracket");
    } catch {
      setStage("joined");
    }
  };

  const handleJoin = async () => {
    setJoining(true);
    try {
      const res = await fetch("/api/tournament/join", {
        method: "POST",
        headers: { "Authorization": `Bearer ${localStorage.getItem("sessionToken") || ""}` },
      });
      const data = await res.json();
      if (!res.ok) throw new Error(data.error);
      setStatus((s) => s ? { ...s, userJoined: true, userPosition: null } : null);
      setStage("joined");
      fetchBracket();
    } catch (err: any) {
      alert(err.message || "Lỗi khi tham gia giải đấu");
    } finally {
      setJoining(false);
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
        className="relative max-h-[90vh] w-full max-w-2xl overflow-y-auto"
      >
        <Card className="overflow-hidden border-0 shadow-2xl">
          {/* Header */}
          <div className="bg-gradient-to-r from-violet-600 via-purple-600 to-violet-700 px-5 py-4">
            <div className="flex items-center justify-between">
              <div className="flex items-center gap-2">
                <div className="flex h-9 w-9 items-center justify-center rounded-lg bg-white/20">
                  <Trophy size={20} className="text-white" />
                </div>
                <div>
                  <h2 className="text-lg font-black text-white">Giải Đấu Tuần</h2>
                  <p className="text-[11px] font-bold text-white/70">{weekLabel}</p>
                </div>
              </div>
              <div className="flex items-center gap-2">
                {status?.timeRemaining && (
                  <div className="flex items-center gap-1 rounded-lg bg-white/20 px-2 py-1 text-xs font-bold text-white">
                    <Clock size={12} /> {status.timeRemaining}
                  </div>
                )}
                <button onClick={onClose} className="flex h-8 w-8 items-center justify-center rounded-lg bg-white/20 text-white hover:bg-white/30">
                  <X size={16} />
                </button>
              </div>
            </div>
          </div>

          <div className="bg-slate-50 p-5">
            <AnimatePresence mode="wait">
              {stage === "loading" && (
                <motion.div key="loading" initial={{ opacity: 0 }} animate={{ opacity: 1 }} exit={{ opacity: 0 }} className="flex items-center justify-center py-12">
                  <Loader2 size={32} className="animate-spin text-purple-400" />
                </motion.div>
              )}

              {stage === "info" && (
                <motion.div key="info" initial={{ opacity: 0, y: 10 }} animate={{ opacity: 1, y: 0 }} exit={{ opacity: 0 }}>
                  {/* Participants */}
                  <div className="mb-4 flex items-center gap-2 rounded-xl border border-slate-200 bg-white px-4 py-3">
                    <Users size={16} className="text-slate-400" />
                    <span className="font-bold text-slate-600">
                      {(status?.tournament as any)?.participants?.length || 0} người tham gia
                    </span>
                  </div>

                  {/* Rewards */}
                  <div className="mb-5">
                    <p className="mb-3 font-black text-slate-700">Phần thưởng</p>
                    <div className="grid grid-cols-2 gap-3">
                      {REWARDS_DISPLAY.map((r) => (
                        <div key={r.place} className={`rounded-2xl border ${r.bg} ${r.border} p-3 text-center`}>
                          <p className={`mb-1 bg-gradient-to-r bg-clip-text text-xl font-black text-transparent ${r.color}`}>{r.exp} EXP</p>
                          <p className="text-xs font-bold text-slate-500">{r.label}</p>
                          {r.badge && <p className="mt-1 text-[10px] font-black italic text-purple-600">{r.badge}</p>}
                        </div>
                      ))}
                    </div>
                  </div>

                  {/* Rules */}
                  <div className="mb-5 space-y-2 text-sm text-slate-600">
                    <div className="flex items-start gap-2">
                      <span className="mt-0.5 flex h-5 w-5 shrink-0 items-center justify-center rounded-full bg-purple-100 text-[9px] font-black text-purple-600">1</span>
                      Giải đấu diễn ra từ <strong>thứ 2 - Chủ nhật</strong> hàng tuần
                    </div>
                    <div className="flex items-start gap-2">
                      <span className="mt-0.5 flex h-5 w-5 shrink-0 items-center justify-center rounded-full bg-purple-100 text-[9px] font-black text-purple-600">2</span>
                      Top 8 người có điểm cao nhất tuần sẽ được vào vòng loại trực tiếp
                    </div>
                    <div className="flex items-start gap-2">
                      <span className="mt-0.5 flex h-5 w-5 shrink-0 items-center rounded-full bg-purple-100 text-[9px] font-black text-purple-600">3</span>
                      Vòng loại trực tiếp đấu theo thể thức <strong>knockout</strong>
                    </div>
                    <div className="flex items-start gap-2">
                      <span className="mt-0.5 flex h-5 w-5 shrink-0 items-center rounded-full bg-purple-100 text-[9px] font-black text-purple-600">4</span>
                      Tham gia miễn phí — dùng điểm hiện tại làm thứ hạng
                    </div>
                  </div>

                  <Button onClick={handleJoin} loading={joining} className="w-full" size="lg" variant="primary">
                    <Trophy size={18} />
                    Tham gia giải đấu
                  </Button>
                </motion.div>
              )}

              {(stage === "joined" || stage === "bracket") && (
                <motion.div key="joined" initial={{ opacity: 0 }} animate={{ opacity: 1 }} exit={{ opacity: 0 }}>
                  {/* Joined banner */}
                  <div className="mb-4 flex items-center justify-between rounded-xl border border-purple-200 bg-purple-50 px-4 py-3">
                    <div className="flex items-center gap-2">
                      <Crown size={16} className="text-purple-600" />
                      <span className="font-bold text-purple-700">Bạn đã tham gia giải đấu!</span>
                    </div>
                    {status?.userPosition && (
                      <span className="rounded-full bg-purple-600 px-3 py-1 text-xs font-black text-white">
                        Hạng #{status.userPosition}
                      </span>
                    )}
                  </div>

                  {/* Participants table */}
                  <div className="mb-4">
                    <div className="mb-2 flex items-center justify-between">
                      <p className="font-black text-slate-700">Bảng xếp hạng tuần</p>
                      <button onClick={fetchBracket} className="text-xs font-bold text-purple-600 hover:underline">Làm mới</button>
                    </div>
                    <div className="space-y-1">
                      {bracket?.participants?.slice(0, 10).map((p, i) => (
                        <div key={p.userId} className={`flex items-center justify-between rounded-xl px-3 py-2 ${p.userId === currentUserNick ? "bg-purple-50 border border-purple-200" : "bg-white border border-slate-100"}`}>
                          <div className="flex items-center gap-2">
                            <span className={`w-6 text-center text-xs font-black ${i === 0 ? "text-amber-500" : i === 1 ? "text-slate-400" : i === 2 ? "text-orange-400" : "text-slate-400"}`}>
                              {i === 0 ? "🥇" : i === 1 ? "🥈" : i === 2 ? "🥉" : `#${i + 1}`}
                            </span>
                            <span className={`text-sm font-bold ${p.userId === currentUserNick ? "text-purple-700" : "text-slate-700"}`}>
                              {p.name}
                              {p.userId === currentUserNick && " (Bạn)"}
                            </span>
                          </div>
                          <span className="text-sm font-black text-slate-500">{(p.weeklyScore || 0).toLocaleString()} EXP</span>
                        </div>
                      ))}
                      {(!bracket?.participants || bracket.participants.length === 0) && (
                        <p className="py-4 text-center text-sm text-slate-400">Chưa có dữ liệu</p>
                      )}
                    </div>
                  </div>

                  {/* Bracket display */}
                  {stage === "bracket" && bracket?.bracket && (
                    <div className="mb-4">
                      <p className="mb-2 font-black text-slate-700">Vòng loại trực tiếp</p>
                      <div className="space-y-4">
                        {bracket.bracket.rounds.map((round) => (
                          <div key={round.round}>
                            <p className="mb-2 text-xs font-bold uppercase tracking-wider text-slate-400">{round.name}</p>
                            <div className="space-y-2">
                              {round.matches.map((match) => (
                                <div key={match.id} className={`flex items-center justify-between rounded-xl border px-3 py-2 ${match.status === "live" ? "border-red-300 bg-red-50" : "border-slate-200 bg-white"}`}>
                                  <div className="flex items-center gap-2">
                                    <span className={`w-1.5 rounded-full ${match.status === "live" ? "bg-red-500 animate-pulse" : "bg-slate-300"}`} />
                                    <div>
                                      <p className={`text-sm font-bold ${match.player1Id === currentUserNick ? "text-purple-700" : "text-slate-700"}`}>
                                        {match.player1Name}
                                      </p>
                                      {match.player2Id && (
                                        <p className={`text-sm font-bold ${match.player2Id === currentUserNick ? "text-purple-700" : "text-slate-700"}`}>
                                          {match.player2Name}
                                        </p>
                                      )}
                                      {!match.player2Id && <p className="text-sm font-bold text-slate-400">Chưa xác định</p>}
                                    </div>
                                  </div>
                                  {match.status === "completed" && (
                                    <div className="flex items-center gap-1 text-xs font-bold text-slate-400">
                                      <Star size={12} className={match.winnerId === currentUserNick ? "fill-amber-400 text-amber-400" : ""} />
                                      {match.winnerId ? "Hoàn thành" : "—"}
                                    </div>
                                  )}
                                  {match.status === "live" && (
                                    <span className="rounded-full bg-red-100 px-2 py-0.5 text-[10px] font-black text-red-600">ĐANG ĐẤU</span>
                                  )}
                                </div>
                              ))}
                            </div>
                          </div>
                        ))}
                      </div>
                    </div>
                  )}

                  {stage === "joined" && !bracket?.bracket && (
                    <div className="mb-4 rounded-xl border border-dashed border-slate-300 bg-slate-50 p-6 text-center">
                      <p className="font-bold text-slate-500">Cần ít nhất 2 người tham gia để xếp bracket</p>
                      <p className="mt-1 text-xs text-slate-400">Bracket sẽ được tạo tự động khi đủ 2 người</p>
                    </div>
                  )}

                  <Button onClick={fetchBracket} variant="secondary" className="w-full">
                    Xem thêm / Cập nhật
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
