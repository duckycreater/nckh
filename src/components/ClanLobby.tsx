import React, { useState, useEffect } from "react";
import { motion, AnimatePresence } from "framer-motion";
import {
  Users, Trophy, Star, Zap, X, ChevronRight, Crown,
  Plus, ArrowLeft, Search, Shield, Loader2, LogOut,
  MessageSquare, Target, CheckCircle, Clock, AlertCircle,
} from "lucide-react";
import { Button, Card } from "../lib/ui";
import type { Clan, ClanMember, ClanQuest, ClanMessage } from "../types";

// ─── Clan List Browser ─────────────────────────────────────────────────────────
interface ClanListProps {
  onSelect: (clanId: string) => void;
  onCreate: () => void;
  onClose: () => void;
  userNick: string;
}

function ClanList({ onSelect, onCreate, onClose, userNick }: ClanListProps) {
  const [clans, setClans] = useState<Clan[]>([]);
  const [loading, setLoading] = useState(true);
  const [search, setSearch] = useState("");

  useEffect(() => {
    fetch("/api/clans")
      .then((r) => r.json())
      .then((d) => setClans(d.clans || []))
      .catch(() => setClans([]))
      .finally(() => setLoading(false));
  }, []);

  const filtered = clans.filter(
    (c) =>
      c.name.toLowerCase().includes(search.toLowerCase()) ||
      c.tag.toLowerCase().includes(search.toLowerCase())
  );

  return (
    <div className="space-y-4">
      <div className="flex items-center justify-between">
        <button onClick={onClose} className="flex items-center gap-1 text-sm font-bold text-slate-400 hover:text-white">
          <ArrowLeft size={16} /> Quay lại
        </button>
        <Button onClick={onCreate} size="sm" variant="primary" className="gap-1">
          <Plus size={14} /> Tạo clan
        </Button>
      </div>

      {/* Search */}
      <div className="relative">
        <Search size={16} className="absolute left-3 top-1/2 -translate-y-1/2 text-slate-400" />
        <input
          value={search}
          onChange={(e) => setSearch(e.target.value)}
          placeholder="Tìm kiếm clan..."
          className="w-full rounded-xl border border-slate-700 bg-slate-800 px-4 py-2 pl-10 text-sm text-white placeholder-slate-400 focus:border-emerald-500 focus:outline-none"
        />
      </div>

      {loading ? (
        <div className="flex items-center justify-center py-12">
          <Loader2 size={28} className="animate-spin text-emerald-400" />
        </div>
      ) : filtered.length === 0 ? (
        <div className="py-8 text-center">
          <Users size={40} className="mx-auto mb-3 text-slate-600" />
          <p className="font-bold text-slate-400">Không có clan nào</p>
          <p className="mt-1 text-sm text-slate-500">Hãy tạo clan đầu tiên!</p>
        </div>
      ) : (
        <div className="space-y-2">
          {filtered.map((clan) => (
            <motion.button
              key={clan.id}
              initial={{ opacity: 0, y: 10 }}
              animate={{ opacity: 1, y: 0 }}
              onClick={() => onSelect(clan.id)}
              className="w-full rounded-2xl border border-slate-700 bg-slate-800/60 p-4 text-left transition hover:border-emerald-500/50 hover:bg-slate-800"
            >
              <div className="flex items-center justify-between">
                <div className="flex items-center gap-3">
                  <div className="flex h-10 w-10 items-center justify-center rounded-xl bg-gradient-to-br from-emerald-500/20 to-teal-500/20 text-sm font-black text-emerald-400 ring-1 ring-emerald-500/30">
                    {clan.tag.slice(0, 2)}
                  </div>
                  <div>
                    <div className="flex items-center gap-2">
                      <p className="font-black text-white">{clan.name}</p>
                      <span className="rounded bg-slate-700 px-1.5 py-0.5 text-[10px] font-black text-slate-300">[{clan.tag}]</span>
                    </div>
                    <div className="flex items-center gap-3 text-xs text-slate-400">
                      <span className="flex items-center gap-1"><Users size={10} /> {clan.memberCount}/{clan.maxMembers}</span>
                      <span className="flex items-center gap-1"><Trophy size={10} /> Lv.{clan.level}</span>
                      <span className="flex items-center gap-1"><Star size={10} /> {(clan.exp || 0).toLocaleString()} EXP</span>
                    </div>
                  </div>
                </div>
                <ChevronRight size={16} className="text-slate-500" />
              </div>
              {clan.bio && <p className="mt-2 text-xs text-slate-400 line-clamp-1">{clan.bio}</p>}
            </motion.button>
          ))}
        </div>
      )}
    </div>
  );
}

// ─── Create Clan Form ───────────────────────────────────────────────────────────
interface CreateClanProps {
  onBack: () => void;
  onCreated: (clanId: string) => void;
}

function CreateClanForm({ onBack, onCreated }: CreateClanProps) {
  const [name, setName] = useState("");
  const [tag, setTag] = useState("");
  const [bio, setBio] = useState("");
  const [loading, setLoading] = useState(false);
  const [error, setError] = useState("");

  const handleCreate = async () => {
    if (name.trim().length < 2) { setError("Tên clan phải có ít nhất 2 ký tự"); return; }
    if (tag.trim().length < 2) { setError("Tag phải có 2-5 ký tự"); return; }
    setLoading(true);
    setError("");
    try {
      const res = await fetch("/api/clans", {
        method: "POST",
        headers: {
          "Content-Type": "application/json",
          Authorization: `Bearer ${localStorage.getItem("sessionToken") || ""}`,
        },
        body: JSON.stringify({ name: name.trim(), tag: tag.trim().toUpperCase(), bio: bio.trim() }),
      });
      const data = await res.json();
      if (!res.ok) throw new Error(data.error || "Lỗi khi tạo clan");
      onCreated(data.id);
    } catch (err: unknown) {
      setError(err instanceof Error ? err.message : String(err));
    } finally {
      setLoading(false);
    }
  };

  return (
    <div className="space-y-4">
      <button onClick={onBack} className="flex items-center gap-1 text-sm font-bold text-slate-400 hover:text-white">
        <ArrowLeft size={16} /> Quay lại
      </button>

      <div>
        <h3 className="mb-4 text-lg font-black text-white">Tạo Clan Mới</h3>

        <div className="space-y-3">
          <div>
            <label className="mb-1 block text-xs font-bold text-slate-400">Tên clan</label>
            <input
              value={name}
              onChange={(e) => setName(e.target.value)}
              maxLength={30}
              placeholder="VD: Eco Warriors"
              className="w-full rounded-xl border border-slate-700 bg-slate-800 px-4 py-2.5 text-sm text-white placeholder-slate-500 focus:border-emerald-500 focus:outline-none"
            />
          </div>

          <div>
            <label className="mb-1 block text-xs font-bold text-slate-400">Tag (2-5 ký tự, hiển thị trong [ ])</label>
            <input
              value={tag}
              onChange={(e) => setTag(e.target.value.toUpperCase().slice(0, 5))}
              maxLength={5}
              placeholder="VD: ECO"
              className="w-full rounded-xl border border-slate-700 bg-slate-800 px-4 py-2.5 text-sm text-white placeholder-slate-500 focus:border-emerald-500 focus:outline-none"
            />
          </div>

          <div>
            <label className="mb-1 block text-xs font-bold text-slate-400">Mô tả (tùy chọn)</label>
            <textarea
              value={bio}
              onChange={(e) => setBio(e.target.value.slice(0, 200))}
              maxLength={200}
              rows={3}
              placeholder="Clan của chúng tôi tập trung vào..."
              className="w-full resize-none rounded-xl border border-slate-700 bg-slate-800 px-4 py-2.5 text-sm text-white placeholder-slate-500 focus:border-emerald-500 focus:outline-none"
            />
            <p className="mt-1 text-right text-[10px] text-slate-500">{bio.length}/200</p>
          </div>

          {error && (
            <div className="flex items-center gap-2 rounded-xl border border-red-500/30 bg-red-950/30 px-4 py-2 text-sm text-red-400">
              <AlertCircle size={14} /> {error}
            </div>
          )}

          <Button onClick={handleCreate} loading={loading} className="w-full" size="lg" variant="primary">
            <Crown size={16} /> Tạo clan
          </Button>
        </div>
      </div>
    </div>
  );
}

// ─── Clan Detail View ────────────────────────────────────────────────────────────
interface ClanDetailProps {
  clanId: string;
  userRole: string;
  userNick: string;
  onBack: () => void;
  onLeft: () => void;
}

type DetailTab = "info" | "quests" | "chat";

function ClanDetail({ clanId, userRole, userNick, onBack, onLeft }: ClanDetailProps) {
  const [clan, setClan] = useState<any>(null);
  const [members, setMembers] = useState<ClanMember[]>([]);
  const [quests, setQuests] = useState<ClanQuest[]>([]);
  const [messages, setMessages] = useState<ClanMessage[]>([]);
  const [tab, setTab] = useState<DetailTab>("info");
  const [msgText, setMsgText] = useState("");
  const [sendingMsg, setSendingMsg] = useState(false);
  const [loading, setLoading] = useState(true);
  const [donateAmount, setDonateAmount] = useState("100");
  const [donating, setDonating] = useState(false);
  const [donateMsg, setDonateMsg] = useState("");

  const isOwner = userRole === "owner";
  const isOfficer = userRole === "officer" || isOwner;

  const fetchClan = () => {
    fetch(`/api/clan/${clanId}`)
      .then((r) => r.json())
      .then((d) => {
        setClan(d);
        setMembers(d.members || []);
        setQuests(d.quests || []);
        setMessages(d.messages || []);
        setLoading(false);
      })
      .catch(() => setLoading(false));
  };

  useEffect(() => { fetchClan(); }, [clanId]);

  const handleDonate = async () => {
    const amount = parseInt(donateAmount) || 0;
    if (amount < 10) return;
    setDonating(true);
    setDonateMsg("");
    try {
      const res = await fetch(`/api/clan/${clanId}/donate`, {
        method: "POST",
        headers: {
          "Content-Type": "application/json",
          Authorization: `Bearer ${localStorage.getItem("sessionToken") || ""}`,
        },
        body: JSON.stringify({ amount }),
      });
      const data = await res.json();
      if (!res.ok) throw new Error(data.error);
      setDonateMsg(`Đã đóng góp ${amount} EXP!`);
      fetchClan();
    } catch (err: unknown) {
      setDonateMsg(err instanceof Error ? err.message : String(err));
    } finally {
      setDonating(false);
    }
  };

  const handleSendMsg = async () => {
    if (!msgText.trim()) return;
    setSendingMsg(true);
    try {
      const res = await fetch(`/api/clan/${clanId}/messages`, {
        method: "POST",
        headers: {
          "Content-Type": "application/json",
          Authorization: `Bearer ${localStorage.getItem("sessionToken") || ""}`,
        },
        body: JSON.stringify({ text: msgText.trim() }),
      });
      if (res.ok) {
        setMsgText("");
        fetchClan();
      }
    } finally {
      setSendingMsg(false);
    }
  };

  const handleLeave = async () => {
    if (!confirm("Bạn có chắc muốn rời clan này?")) return;
    try {
      const res = await fetch(`/api/clan/${clanId}/leave`, {
        method: "POST",
        headers: { Authorization: `Bearer ${localStorage.getItem("sessionToken") || ""}` },
      });
      if (res.ok) onLeft();
    } catch { /* ignore */ }
  };

  if (loading) {
    return (
      <div className="flex items-center justify-center py-12">
        <Loader2 size={28} className="animate-spin text-emerald-400" />
      </div>
    );
  }

  if (!clan) return null;

  const sortedMembers = [...members].sort((a, b) => {
    if (a.role === "owner") return -1;
    if (b.role === "owner") return 1;
    if (a.role === "officer") return -1;
    if (b.role === "officer") return 1;
    return (b.expContributed || 0) - (a.expContributed || 0);
  });

  const weeklyProgress = clan.weeklyGoal ? Math.min(100, Math.round((clan.weeklyDonations / clan.weeklyGoal) * 100)) : 0;

  return (
    <div className="space-y-4">
      <button onClick={onBack} className="flex items-center gap-1 text-sm font-bold text-slate-400 hover:text-white">
        <ArrowLeft size={16} /> Danh sách clan
      </button>

      {/* Clan Header */}
      <div className="rounded-2xl border border-emerald-500/20 bg-gradient-to-br from-emerald-950/40 to-teal-950/40 p-4">
        <div className="flex items-center gap-3">
          <div className="flex h-14 w-14 items-center justify-center rounded-2xl bg-gradient-to-br from-emerald-500/20 to-teal-500/20 text-lg font-black text-emerald-400 ring-2 ring-emerald-500/30">
            {clan.tag?.slice(0, 2) || "??"}
          </div>
          <div className="flex-1">
            <div className="flex items-center gap-2">
              <h3 className="text-lg font-black text-white">{clan.name}</h3>
              <span className="rounded bg-emerald-500/20 px-2 py-0.5 text-xs font-black text-emerald-400">[{clan.tag}]</span>
            </div>
            <div className="mt-1 flex items-center gap-3 text-xs text-slate-400">
              <span className="flex items-center gap-1"><Users size={11} /> {members.length}/{20}</span>
              <span className="flex items-center gap-1"><Trophy size={11} /> Lv.{clan.level || 1}</span>
              <span className="flex items-center gap-1"><Star size={11} /> {(clan.exp || 0).toLocaleString()} EXP</span>
            </div>
          </div>
          {clan.leaderId === userNick && (
            <div className="flex items-center gap-1 rounded-xl bg-amber-500/20 px-2 py-1 text-xs font-black text-amber-400">
              <Crown size={11} /> Chủ tịch
            </div>
          )}
        </div>
        {clan.bio && <p className="mt-2 text-sm text-slate-400">{clan.bio}</p>}

        {/* Weekly Goal */}
        <div className="mt-3">
          <div className="mb-1 flex items-center justify-between text-xs">
            <span className="font-bold text-slate-400">Mục tiêu tuần này</span>
            <span className="font-bold text-emerald-400">{clan.weeklyDonations || 0} / {clan.weeklyGoal || 500} EXP</span>
          </div>
          <div className="h-2 overflow-hidden rounded-full bg-slate-800">
            <motion.div
              initial={{ width: 0 }}
              animate={{ width: `${weeklyProgress}%` }}
              className="h-full rounded-full bg-gradient-to-r from-emerald-500 to-teal-400"
            />
          </div>
        </div>

        {/* Donate */}
        <div className="mt-3 flex items-center gap-2">
          <input
            type="number"
            value={donateAmount}
            onChange={(e) => setDonateAmount(e.target.value)}
            min={10}
            max={10000}
            className="w-24 rounded-xl border border-slate-700 bg-slate-800 px-3 py-1.5 text-sm font-bold text-white focus:border-emerald-500 focus:outline-none"
          />
          <Button onClick={handleDonate} loading={donating} size="sm" variant="primary" className="gap-1">
            <Zap size={12} /> Đóng góp
          </Button>
          {donateMsg && (
            <span className="text-xs font-bold text-emerald-400">{donateMsg}</span>
          )}
        </div>
      </div>

      {/* Tabs */}
      <div className="flex gap-1 rounded-2xl border border-slate-700/50 bg-slate-800/30 p-1">
        {(["info", "quests", "chat"] as DetailTab[]).map((t) => (
          <button
            key={t}
            onClick={() => setTab(t)}
            className={`flex-1 rounded-xl px-3 py-2 text-xs font-bold transition ${
              tab === t ? "bg-emerald-500/20 text-emerald-400" : "text-slate-400 hover:text-white"
            }`}
          >
            {t === "info" ? "Thành viên" : t === "quests" ? "Nhiệm vụ" : "Tin nhắn"}
          </button>
        ))}
      </div>

      {/* Tab: Members */}
      {tab === "info" && (
        <div className="space-y-1.5">
          {sortedMembers.map((m, i) => (
            <div key={m.userId} className="flex items-center justify-between rounded-xl border border-slate-700/50 bg-slate-800/30 px-3 py-2">
              <div className="flex items-center gap-2">
                <span className={`w-4 text-center text-xs font-black ${i === 0 ? "text-amber-400" : i === 1 ? "text-slate-300" : i === 2 ? "text-orange-400" : "text-slate-500"}`}>
                  #{i + 1}
                </span>
                <div>
                  <div className="flex items-center gap-1.5">
                    <p className="text-sm font-bold text-white">{m.nick || m.userId}</p>
                    {m.role === "owner" && <Crown size={11} className="text-amber-400" />}
                    {m.role === "officer" && <Shield size={11} className="text-blue-400" />}
                    {m.userId === userNick && <span className="text-[9px] font-black text-emerald-400">(Bạn)</span>}
                  </div>
                  <p className="text-[10px] text-slate-400">Đã đóng góp: {(m.expContributed || 0).toLocaleString()} EXP</p>
                </div>
              </div>
              <div className="text-right">
                <p className="text-xs font-bold text-slate-400">Tuần này</p>
                <p className="text-sm font-black text-emerald-400">+{m.weeklyDonation || 0}</p>
              </div>
            </div>
          ))}
        </div>
      )}

      {/* Tab: Quests */}
      {tab === "quests" && (
        <div className="space-y-2">
          {quests.length === 0 ? (
            <div className="rounded-2xl border border-dashed border-slate-700 py-8 text-center">
              <Target size={32} className="mx-auto mb-2 text-slate-600" />
              <p className="font-bold text-slate-500">Chưa có nhiệm vụ tuần này</p>
            </div>
          ) : (
            quests.map((q: any) => (
              <div key={q.id} className={`rounded-2xl border p-3 ${q.completed ? "border-emerald-500/30 bg-emerald-950/20" : "border-slate-700/50 bg-slate-800/30"}`}>
                <div className="flex items-start justify-between gap-2">
                  <div className="flex items-start gap-2">
                    {q.completed ? (
                      <CheckCircle size={16} className="mt-0.5 shrink-0 text-emerald-400" />
                    ) : (
                      <Target size={16} className="mt-0.5 shrink-0 text-slate-400" />
                    )}
                    <div>
                      <p className={`text-sm font-bold ${q.completed ? "text-emerald-400" : "text-white"}`}>{q.descVi || q.desc}</p>
                      <p className="text-xs text-slate-400">Phần thưởng: <span className="font-black text-amber-400">{q.reward} EXP</span></p>
                    </div>
                  </div>
                  {q.target && (
                    <div className="text-right">
                      <p className="text-xs font-bold text-slate-400">{q.progress || 0}/{q.target}</p>
                      <p className="text-sm font-black text-white">{q.target ? Math.round(((q.progress || 0) / q.target) * 100) : 0}%</p>
                    </div>
                  )}
                </div>
                {q.target && !q.completed && (
                  <div className="mt-2 h-1.5 overflow-hidden rounded-full bg-slate-800">
                    <div
                      className="h-full rounded-full bg-emerald-500"
                      style={{ width: `${Math.min(100, ((q.progress || 0) / q.target) * 100)}%` }}
                    />
                  </div>
                )}
              </div>
            ))
          )}
        </div>
      )}

      {/* Tab: Chat */}
      {tab === "chat" && (
        <div className="space-y-3">
          <div className="max-h-64 space-y-1.5 overflow-y-auto rounded-2xl border border-slate-700/50 bg-slate-900/50 p-3">
            {messages.length === 0 ? (
              <p className="py-4 text-center text-xs text-slate-500">Chưa có tin nhắn nào. Hãy là người đầu tiên!</p>
            ) : (
              messages.map((m: any) => (
                <div key={m.id} className="flex gap-2">
                  <div className={`shrink-0 rounded-lg px-2 py-1 text-xs ${m.userId === userNick ? "bg-emerald-500/20 text-emerald-400" : "bg-slate-800 text-slate-300"}`}>
                    <span className="font-black">{m.nick}: </span>
                    <span>{m.text}</span>
                  </div>
                </div>
              ))
            )}
          </div>
          <div className="flex gap-2">
            <input
              value={msgText}
              onChange={(e) => setMsgText(e.target.value)}
              onKeyDown={(e) => e.code === "Enter" && handleSendMsg()}
              maxLength={500}
              placeholder="Viết tin nhắn..."
              className="flex-1 rounded-xl border border-slate-700 bg-slate-800 px-4 py-2 text-sm text-white placeholder-slate-500 focus:border-emerald-500 focus:outline-none"
            />
            <Button onClick={handleSendMsg} loading={sendingMsg} size="sm" variant="primary" className="gap-1">
              <MessageSquare size={14} />
            </Button>
          </div>
        </div>
      )}

      {/* Leave */}
      {!isOwner && (
        <button
          onClick={handleLeave}
          className="flex w-full items-center justify-center gap-2 rounded-xl border border-red-500/30 bg-red-950/20 px-4 py-2 text-sm font-bold text-red-400 transition hover:border-red-500/50"
        >
          <LogOut size={14} /> Rời clan
        </button>
      )}
    </div>
  );
}

// ─── Main ClanLobby Component ───────────────────────────────────────────────────
interface Props {
  onClose: () => void;
  userNick: string;
  onClanLeft?: () => void;
}

type LobbyStage = "my_clan" | "list" | "create" | "detail";

export function ClanLobby({ onClose, userNick, onClanLeft }: Props) {
  const [stage, setStage] = useState<LobbyStage>("my_clan");
  const [myClan, setMyClan] = useState<any>(null);
  const [clanId, setClanId] = useState<string | null>(null);
  const [userRole, setUserRole] = useState<string>("");
  const [loading, setLoading] = useState(true);

  useEffect(() => {
    fetch("/api/user-clan", {
      headers: { Authorization: `Bearer ${localStorage.getItem("sessionToken") || ""}` },
    })
      .then((r) => r.json())
      .then((d) => {
        if (d.inClan) {
          setMyClan(d.clan);
          setClanId(d.clanId);
          setUserRole(d.role);
          setStage("detail");
        } else {
          setStage("list");
        }
      })
      .catch(() => setStage("list"))
      .finally(() => setLoading(false));
  }, []);

  const handleClanCreated = (newClanId: string) => {
    setClanId(newClanId);
    setUserRole("owner");
    setStage("detail");
    fetch("/api/user-clan", {
      headers: { Authorization: `Bearer ${localStorage.getItem("sessionToken") || ""}` },
    }).then((r) => r.json()).then((d) => {
      setMyClan(d.clan);
      setUserRole(d.role);
    });
  };

  const handleClanSelected = (id: string) => {
    setClanId(id);
    fetch("/api/user-clan", {
      headers: { Authorization: `Bearer ${localStorage.getItem("sessionToken") || ""}` },
    }).then((r) => r.json()).then((d) => {
      setUserRole(d.role || "");
    });
    setStage("detail");
  };

  const handleLeft = () => {
    setMyClan(null);
    setClanId(null);
    setUserRole("");
    setStage("list");
    onClanLeft?.();
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
        className="max-h-[90vh] w-full max-w-lg overflow-y-auto"
      >
        <Card className="overflow-hidden border-0 shadow-2xl">
          {/* Header */}
          <div className="bg-gradient-to-r from-emerald-600 via-teal-600 to-emerald-700 px-5 py-4">
            <div className="flex items-center justify-between">
              <div className="flex items-center gap-2">
                <div className="flex h-9 w-9 items-center justify-center rounded-lg bg-white/20">
                  <Users size={20} className="text-white" />
                </div>
                <div>
                  <h2 className="text-lg font-black text-white">Clan</h2>
                  <p className="text-[11px] font-bold text-white/70">
                    {myClan ? `Clan ${myClan.name}` : "Khám phá clan"}
                  </p>
                </div>
              </div>
              <button onClick={onClose} className="flex h-8 w-8 items-center justify-center rounded-lg bg-white/20 text-white hover:bg-white/30">
                <X size={16} />
              </button>
            </div>
          </div>

          <div className="p-5" style={{ background: "var(--surface-muted, #f6faf8)" }}>
            {loading ? (
              <div className="flex items-center justify-center py-12">
                <Loader2 size={28} className="animate-spin text-emerald-400" />
              </div>
            ) : (
              <AnimatePresence mode="wait">
                {stage === "my_clan" && (
                  <motion.div key="my_clan" initial={{ opacity: 0 }} animate={{ opacity: 1 }} exit={{ opacity: 0 }} className="flex flex-col items-center gap-4 py-8">
                    <Loader2 size={24} className="animate-spin text-emerald-400" />
                    <p className="text-sm text-slate-500">Đang kiểm tra clan...</p>
                  </motion.div>
                )}

                {stage === "list" && (
                  <motion.div key="list" initial={{ opacity: 0, y: 10 }} animate={{ opacity: 1, y: 0 }} exit={{ opacity: 0 }}>
                    <ClanList
                      onSelect={handleClanSelected}
                      onCreate={() => setStage("create")}
                      onClose={onClose}
                      userNick={userNick}
                    />
                  </motion.div>
                )}

                {stage === "create" && (
                  <motion.div key="create" initial={{ opacity: 0, y: 10 }} animate={{ opacity: 1, y: 0 }} exit={{ opacity: 0 }}>
                    <CreateClanForm onBack={() => setStage("list")} onCreated={handleClanCreated} />
                  </motion.div>
                )}

                {stage === "detail" && clanId && (
                  <motion.div key="detail" initial={{ opacity: 0 }} animate={{ opacity: 1 }} exit={{ opacity: 0 }}>
                    <ClanDetail
                      clanId={clanId}
                      userRole={userRole}
                      userNick={userNick}
                      onBack={() => setStage("list")}
                      onLeft={handleLeft}
                    />
                  </motion.div>
                )}
              </AnimatePresence>
            )}
          </div>
        </Card>
      </motion.div>
    </motion.div>
  );
}
