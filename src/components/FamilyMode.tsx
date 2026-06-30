/**
 * FamilyMode.tsx - CayGiaPha_NhanThuc
 *
 * Multi-user household dashboard:
 * - Create or join a family
 * - View members + weekly contributions
 * - Active challenges + progress
 * - Aggregate carbon footprint (CO2 saved this week)
 * - Family leaderboard
 * - Carbon stats per member + per category
 *
 * Falls back gracefully when APIs are not yet configured (offline mode).
 */

import React, { useState, useEffect, useCallback } from "react";
import { motion, AnimatePresence } from "framer-motion";
import {
  Users, Copy, Trophy, Leaf, TrendingUp, Plus, X,
  Award, Calendar, Target, UserPlus, LogOut,
} from "lucide-react";
import { familyService } from "../services/familyService";
import type {
  Family,
  FamilyMember,
  FamilyChallenge,
  FamilyCarbonStats,
} from "../types/family";
import type { User } from "../types";

interface Props {
  user: User;
  isOpen: boolean;
  onClose: () => void;
}

const CHALLENGE_TYPES = [
  { id: "total_scans", label: "Tổng lượt quét tuần", icon: "📸", unit: "lượt" },
  { id: "category_diversity", label: "Số loại rác phân loại", icon: "♻️", unit: "loại" },
  { id: "streak_combined", label: "Tổng streak cả nhà", icon: "🔥", unit: "ngày" },
  { id: "co2_saved", label: "CO2 tiết kiệm (kg)", icon: "🌍", unit: "kg CO₂" },
] as const;

export function FamilyMode({ user, isOpen, onClose }: Props) {
  const [family, setFamily] = useState<Family | null>(null);
  const [members, setMembers] = useState<FamilyMember[]>([]);
  const [challenges, setChallenges] = useState<FamilyChallenge[]>([]);
  const [carbon, setCarbon] = useState<FamilyCarbonStats | null>(null);
  const [loading, setLoading] = useState(true);
  const [view, setView] = useState<"overview" | "members" | "challenges" | "carbon">(
    "overview",
  );
  const [createMode, setCreateMode] = useState(false);
  const [joinMode, setJoinMode] = useState(false);
  const [newFamilyName, setNewFamilyName] = useState("");
  const [inviteCode, setInviteCode] = useState("");
  const [createChallengeMode, setCreateChallengeMode] = useState(false);
  const [submitting, setSubmitting] = useState(false);

  const refresh = useCallback(async () => {
    setLoading(true);
    try {
      const myFamily = await familyService.getMyFamily().catch(() => null);
      if (!myFamily) {
        setFamily(null);
        setMembers([]);
        return;
      }
      setFamily(myFamily.family);
      setMembers(myFamily.members);

      const [ch, st] = await Promise.all([
        familyService.getChallenges(myFamily.family.id).catch(() => []),
        familyService.getCarbonStats(myFamily.family.id).catch(() => null),
      ]);
      setChallenges(ch);
      setCarbon(st);
    } finally {
      setLoading(false);
    }
  }, []);

  useEffect(() => {
    if (isOpen) refresh();
  }, [isOpen, refresh]);

  async function handleCreate() {
    if (!newFamilyName.trim()) return;
    setSubmitting(true);
    try {
      await familyService.createFamily(newFamilyName, "VN");
      setCreateMode(false);
      setNewFamilyName("");
      await refresh();
    } catch (err: any) {
      alert(err.message);
    } finally {
      setSubmitting(false);
    }
  }

  async function handleJoin() {
    if (!inviteCode.trim()) return;
    setSubmitting(true);
    try {
      await familyService.joinFamily(inviteCode);
      setJoinMode(false);
      setInviteCode("");
      await refresh();
    } catch (err: any) {
      alert(err.message);
    } finally {
      setSubmitting(false);
    }
  }

  async function handleLeave() {
    if (!confirm("Rời khỏi gia đình? Bạn sẽ mất quyền truy cập thử thách & bảng xếp hạng chung.")) {
      return;
    }
    try {
      await familyService.leaveFamily();
      await refresh();
    } catch (err: any) {
      alert(err.message);
    }
  }

  if (!isOpen) return null;

  return (
    <AnimatePresence>
      <motion.div
        initial={{ opacity: 0 }}
        animate={{ opacity: 1 }}
        exit={{ opacity: 0 }}
        className="fixed inset-0 z-[300] flex items-center justify-center bg-black/50 p-3"
        onClick={onClose}
      >
        <motion.div
          initial={{ scale: 0.95, y: 10 }}
          animate={{ scale: 1, y: 0 }}
          onClick={(e) => e.stopPropagation()}
          className="relative w-full max-w-2xl overflow-hidden rounded-2xl border border-slate-200 bg-white shadow-xl dark:border-slate-700 dark:bg-slate-900"
        >
          <div className="border-b border-slate-200 bg-gradient-to-r from-emerald-50 to-cyan-50 px-5 py-4 dark:border-slate-800 dark:from-emerald-950/30 dark:to-cyan-950/30">
            <div className="flex items-center justify-between">
              <div className="flex items-center gap-3">
                <div className="flex h-10 w-10 items-center justify-center rounded-xl bg-gradient-to-br from-emerald-500 to-cyan-500 text-white">
                  <Users size={20} />
                </div>
                <div>
                  <h3 className="text-base font-bold text-slate-900 dark:text-slate-50">
                    Family Mode
                  </h3>
                  <p className="text-xs text-slate-600 dark:text-slate-400">
                    Phân loại rác cùng gia đình
                  </p>
                </div>
              </div>
              <button
                onClick={onClose}
                className="rounded-lg p-1.5 hover:bg-slate-200 dark:hover:bg-slate-700"
              >
                <X size={18} />
              </button>
            </div>
          </div>

          <div className="max-h-[75vh] overflow-y-auto p-4">
            {loading ? (
              <div className="py-12 text-center text-sm text-slate-500">Đang tải...</div>
            ) : !family ? (
              /* ─── No family yet — create or join ───────────────────── */
              <div className="space-y-4">
                {!createMode && !joinMode && (
                  <div className="space-y-3">
                    <p className="text-center text-sm text-slate-600 dark:text-slate-400">
                      Bạn chưa tham gia gia đình nào. Tạo mới hoặc tham gia bằng mã mời.
                    </p>
                    <button
                      onClick={() => setCreateMode(true)}
                      className="w-full rounded-xl bg-gradient-to-r from-emerald-600 to-cyan-600 px-4 py-3 text-sm font-bold text-white hover:from-emerald-700 hover:to-cyan-700"
                    >
                      <Plus size={16} className="inline -mt-0.5 mr-1" /> Tạo gia đình mới
                    </button>
                    <button
                      onClick={() => setJoinMode(true)}
                      className="w-full rounded-xl border border-slate-300 bg-white px-4 py-3 text-sm font-bold text-slate-700 hover:bg-slate-50 dark:border-slate-600 dark:bg-slate-800 dark:text-slate-200"
                    >
                      <UserPlus size={16} className="inline -mt-0.5 mr-1" /> Tham gia bằng mã mời
                    </button>
                  </div>
                )}

                {createMode && (
                  <div className="space-y-3">
                    <label className="block text-xs font-semibold text-slate-700 dark:text-slate-300">
                      Tên gia đình
                    </label>
                    <input
                      type="text"
                      value={newFamilyName}
                      onChange={(e) => setNewFamilyName(e.target.value)}
                      placeholder="VD: Gia đình anh Minh"
                      className="w-full rounded-lg border border-slate-300 bg-white px-3 py-2 text-sm dark:border-slate-600 dark:bg-slate-800"
                    />
                    <div className="flex gap-2">
                      <button
                        onClick={handleCreate}
                        disabled={submitting}
                        className="flex-1 rounded-lg bg-emerald-600 px-4 py-2 text-sm font-bold text-white hover:bg-emerald-700 disabled:opacity-50"
                      >
                        {submitting ? "Đang tạo..." : "Tạo gia đình"}
                      </button>
                      <button
                        onClick={() => setCreateMode(false)}
                        className="rounded-lg border border-slate-300 px-4 py-2 text-sm hover:bg-slate-50 dark:border-slate-600"
                      >
                        Huỷ
                      </button>
                    </div>
                  </div>
                )}

                {joinMode && (
                  <div className="space-y-3">
                    <label className="block text-xs font-semibold text-slate-700 dark:text-slate-300">
                      Mã mời (6 ký tự)
                    </label>
                    <input
                      type="text"
                      value={inviteCode}
                      onChange={(e) => setInviteCode(e.target.value.toUpperCase())}
                      placeholder="ABC123"
                      maxLength={6}
                      className="w-full rounded-lg border border-slate-300 bg-white px-3 py-2 text-center text-lg font-mono uppercase tracking-widest dark:border-slate-600 dark:bg-slate-800"
                    />
                    <div className="flex gap-2">
                      <button
                        onClick={handleJoin}
                        disabled={submitting || inviteCode.length !== 6}
                        className="flex-1 rounded-lg bg-cyan-600 px-4 py-2 text-sm font-bold text-white hover:bg-cyan-700 disabled:opacity-50"
                      >
                        {submitting ? "Đang tham gia..." : "Tham gia"}
                      </button>
                      <button
                        onClick={() => setJoinMode(false)}
                        className="rounded-lg border border-slate-300 px-4 py-2 text-sm hover:bg-slate-50 dark:border-slate-600"
                      >
                        Huỷ
                      </button>
                    </div>
                  </div>
                )}
              </div>
            ) : (
              /* ─── In a family ─────────────────────────────────────── */
              <div className="space-y-4">
                {/* Family header */}
                <div className="rounded-xl border border-slate-200 bg-gradient-to-r from-slate-50 to-emerald-50/40 p-4 dark:border-slate-700 dark:from-slate-800/40 dark:to-emerald-900/10">
                  <div className="flex items-start justify-between">
                    <div>
                      <div className="text-base font-bold text-slate-900 dark:text-slate-50">
                        {family.name}
                      </div>
                      <div className="mt-0.5 text-xs text-slate-500">
                        Mã mời:{" "}
                        <button
                          onClick={() => {
                            navigator.clipboard.writeText(family.inviteCode);
                          }}
                          className="inline-flex items-center gap-1 rounded bg-slate-200 px-1.5 py-0.5 font-mono font-bold tracking-wider text-slate-700 hover:bg-slate-300 dark:bg-slate-700 dark:text-slate-200"
                        >
                          {family.inviteCode} <Copy size={10} />
                        </button>
                      </div>
                      <div className="mt-1 text-xs text-slate-500">
                        {members.length} thành viên
                      </div>
                    </div>
                    <button
                      onClick={handleLeave}
                      className="rounded-lg border border-rose-200 bg-white px-2 py-1 text-xs font-semibold text-rose-700 hover:bg-rose-50 dark:border-rose-800 dark:bg-slate-800 dark:text-rose-400"
                    >
                      <LogOut size={12} className="inline -mt-0.5 mr-0.5" /> Rời
                    </button>
                  </div>
                </div>

                {/* Tabs */}
                <div className="flex gap-1 rounded-lg bg-slate-100 p-1 dark:bg-slate-800">
                  {(["overview", "members", "challenges", "carbon"] as const).map((tab) => (
                    <button
                      key={tab}
                      onClick={() => setView(tab)}
                      className={`flex-1 rounded-md py-1.5 text-xs font-bold transition-all ${
                        view === tab
                          ? "bg-white text-emerald-700 shadow-sm dark:bg-slate-700 dark:text-emerald-300"
                          : "text-slate-500"
                      }`}
                    >
                      {tab === "overview" && "Tổng quan"}
                      {tab === "members" && "Thành viên"}
                      {tab === "challenges" && "Thử thách"}
                      {tab === "carbon" && "Carbon"}
                    </button>
                  ))}
                </div>

                {/* Tab content */}
                {view === "overview" && (
                  <OverviewTab members={members} challenges={challenges} carbon={carbon} />
                )}
                {view === "members" && <MembersTab members={members} />}
                {view === "challenges" && (
                  <ChallengesTab
                    familyId={family.id}
                    challenges={challenges}
                    onCreateMode={() => setCreateChallengeMode(true)}
                    onRefresh={refresh}
                  />
                )}
                {view === "carbon" && <CarbonTab carbon={carbon} />}

                {/* Create challenge modal */}
                {createChallengeMode && (
                  <CreateChallengeForm
                    familyId={family.id}
                    onClose={() => setCreateChallengeMode(false)}
                    onCreated={() => {
                      setCreateChallengeMode(false);
                      refresh();
                    }}
                  />
                )}
              </div>
            )}
          </div>
        </motion.div>
      </motion.div>
    </AnimatePresence>
  );
}

/* ───────────────────── Sub-components ───────────────────── */

function OverviewTab({
  members,
  challenges,
  carbon,
}: {
  members: FamilyMember[];
  challenges: FamilyChallenge[];
  carbon: FamilyCarbonStats | null;
}) {
  const activeMembers = members.filter((m) => m.isActive).length;
  const topMember = [...members].sort(
    (a, b) => b.contributionsWeekly - a.contributionsWeekly,
  )[0];
  const activeChallenges = challenges.filter((c) => !c.completed);

  return (
    <div className="space-y-3">
      <div className="grid grid-cols-3 gap-2">
        <Stat icon={<Users size={14} />} label="Thành viên" value={`${members.length}`} sub={`${activeMembers} hoạt động`} />
        <Stat
          icon={<Target size={14} />}
          label="Thử thách"
          value={`${activeChallenges.length}`}
          sub="đang diễn ra"
        />
        <Stat
          icon={<Leaf size={14} />}
          label="CO₂ tuần"
          value={`${carbon?.totalCo2Kg.toFixed(1) || "0"} kg`}
          sub={`${carbon?.treesEquivalent.toFixed(1) || "0"} cây/năm`}
        />
      </div>

      {topMember && (
        <div className="rounded-lg border border-yellow-200 bg-yellow-50 p-3 dark:border-yellow-800/40 dark:bg-yellow-900/20">
          <div className="flex items-center gap-2">
            <Trophy size={16} className="text-yellow-600 dark:text-yellow-400" />
            <div className="text-xs">
              <span className="font-bold text-yellow-900 dark:text-yellow-200">
                Thành viên xuất sắc tuần này
              </span>
              <span className="ml-1 text-yellow-700/80 dark:text-yellow-300/80">
                — {topMember.contributionsWeekly} lượt quét
              </span>
            </div>
          </div>
        </div>
      )}
    </div>
  );
}

function MembersTab({ members }: { members: FamilyMember[] }) {
  if (members.length === 0) {
    return (
      <div className="py-6 text-center text-sm text-slate-500">
        Chưa có thành viên. Chia sẻ mã mời để mời người tham gia.
      </div>
    );
  }

  return (
    <div className="space-y-2">
      {members
        .sort((a, b) => b.contributionsWeekly - a.contributionsWeekly)
        .map((m) => {
          const pct = (m.contributionsWeekly / Math.max(...members.map((x) => x.contributionsWeekly), 1)) * 100;
          return (
            <div
              key={m.userId}
              className="flex items-center gap-3 rounded-lg border border-slate-200 bg-white p-3 dark:border-slate-700 dark:bg-slate-800"
            >
              <div className="flex h-9 w-9 items-center justify-center rounded-full bg-gradient-to-br from-emerald-500 to-cyan-500 text-sm font-bold text-white">
                {m.userId.slice(0, 2).toUpperCase()}
              </div>
              <div className="flex-1">
                <div className="flex items-center gap-1.5">
                  <span className="text-sm font-semibold text-slate-800 dark:text-slate-200">
                    {m.userId}
                  </span>
                  <span className="rounded-full bg-slate-100 px-1.5 py-0.5 text-[10px] font-bold uppercase text-slate-600 dark:bg-slate-700 dark:text-slate-300">
                    {m.role}
                  </span>
                  {!m.isActive && (
                    <span className="text-[10px] italic text-slate-400">(không hoạt động)</span>
                  )}
                </div>
                <div className="mt-1 h-1.5 overflow-hidden rounded-full bg-slate-200 dark:bg-slate-700">
                  <div
                    className="h-full rounded-full bg-gradient-to-r from-emerald-500 to-cyan-500"
                    style={{ width: `${pct}%` }}
                  />
                </div>
                <div className="mt-0.5 flex justify-between text-[10px] text-slate-500">
                  <span>{m.contributionsWeekly} lượt tuần này</span>
                  <span>Tổng: {m.contributionsTotal}</span>
                </div>
              </div>
            </div>
          );
        })}
    </div>
  );
}

function ChallengesTab({
  familyId,
  challenges,
  onCreateMode,
}: {
  familyId: string;
  challenges: FamilyChallenge[];
  onCreateMode: () => void;
  onRefresh: () => void;
}) {
  const active = challenges.filter((c) => !c.completed);
  const completed = challenges.filter((c) => c.completed).slice(-5);

  return (
    <div className="space-y-3">
      <button
        onClick={onCreateMode}
        className="w-full rounded-xl border-2 border-dashed border-emerald-300 bg-emerald-50 px-4 py-3 text-sm font-bold text-emerald-800 hover:bg-emerald-100 dark:border-emerald-700 dark:bg-emerald-900/20 dark:text-emerald-300"
      >
        <Plus size={14} className="inline -mt-0.5 mr-1" /> Tạo thử thách mới
      </button>

      {active.length === 0 && completed.length === 0 && (
        <div className="py-6 text-center text-sm text-slate-500">
          Chưa có thử thách nào. Tạo thử thách đầu tiên cho cả nhà!
        </div>
      )}

      {active.map((c) => {
        const pct = Math.min(100, (c.progress / c.target) * 100);
        const typeMeta = CHALLENGE_TYPES.find((t) => t.id === c.type);
        return (
          <div
            key={c.id}
            className="rounded-xl border border-slate-200 bg-white p-3 dark:border-slate-700 dark:bg-slate-800"
          >
            <div className="flex items-start gap-3">
              <div className="text-2xl">{typeMeta?.icon}</div>
              <div className="flex-1">
                <div className="text-sm font-bold text-slate-800 dark:text-slate-200">
                  {c.title}
                </div>
                <div className="text-xs text-slate-500">{c.description}</div>
                <div className="mt-2 h-2 overflow-hidden rounded-full bg-slate-200 dark:bg-slate-700">
                  <div
                    className="h-full rounded-full bg-gradient-to-r from-emerald-500 to-cyan-500"
                    style={{ width: `${pct}%` }}
                  />
                </div>
                <div className="mt-1 flex justify-between text-[10px] text-slate-500">
                  <span>
                    {c.progress}/{c.target} {typeMeta?.unit}
                  </span>
                  <span className="flex items-center gap-1">
                    <Calendar size={10} />
                    {new Date(c.endAt).toLocaleDateString("vi-VN")}
                  </span>
                </div>
              </div>
            </div>
          </div>
        );
      })}
    </div>
  );
}

function CarbonTab({ carbon }: { carbon: FamilyCarbonStats | null }) {
  if (!carbon) {
    return (
      <div className="py-6 text-center text-sm text-slate-500">
        Chưa có dữ liệu carbon tuần này.
      </div>
    );
  }
  const cats = carbon.perCategory;
  const maxVal = Math.max(...Object.values(cats), 1);

  return (
    <div className="space-y-3">
      <div className="rounded-xl border border-emerald-200 bg-gradient-to-br from-emerald-50 to-cyan-50 p-4 dark:border-emerald-800/40 dark:from-emerald-900/20 dark:to-cyan-900/20">
        <div className="flex items-baseline justify-between">
          <div>
            <div className="text-[10px] uppercase tracking-wider text-emerald-700 dark:text-emerald-300">
              Tuần này
            </div>
            <div className="text-2xl font-bold text-emerald-900 dark:text-emerald-200">
              {carbon.totalCo2Kg.toFixed(1)} kg
            </div>
            <div className="text-xs text-emerald-700/80 dark:text-emerald-300/80">
              CO₂ tránh được
            </div>
          </div>
          <div className="text-right">
            <div className="text-[10px] uppercase tracking-wider text-cyan-700 dark:text-cyan-300">
              Tương đương
            </div>
            <div className="text-2xl font-bold text-cyan-900 dark:text-cyan-200">
              {carbon.treesEquivalent.toFixed(1)}
            </div>
            <div className="text-xs text-cyan-700/80 dark:text-cyan-300/80">
              cây xanh / năm
            </div>
          </div>
        </div>
        {carbon.comparedToLastWeek !== 0 && (
          <div className="mt-2 flex items-center gap-1 text-xs">
            <TrendingUp
              size={12}
              className={
                carbon.comparedToLastWeek > 0
                  ? "text-emerald-600"
                  : "rotate-180 text-rose-600"
              }
            />
            <span className={carbon.comparedToLastWeek > 0 ? "text-emerald-700" : "text-rose-700"}>
              {carbon.comparedToLastWeek > 0 ? "+" : ""}
              {carbon.comparedToLastWeek.toFixed(0)}% so với tuần trước
            </span>
          </div>
        )}
      </div>

      {/* Per category breakdown */}
      <div className="rounded-xl border border-slate-200 bg-white p-3 dark:border-slate-700 dark:bg-slate-800">
        <div className="mb-2 text-xs font-bold uppercase tracking-wider text-slate-600 dark:text-slate-300">
          Theo loại rác
        </div>
        {(Object.keys(cats) as Array<keyof typeof cats>).map((k) => {
          const val = cats[k];
          const pct = (val / maxVal) * 100;
          const color =
            k === "plastic"
              ? "bg-blue-500"
              : k === "paper"
              ? "bg-amber-500"
              : k === "glass"
              ? "bg-cyan-500"
              : k === "metal"
              ? "bg-slate-500"
              : k === "organic"
              ? "bg-emerald-500"
              : "bg-rose-500";
          return (
            <div key={k} className="mb-1.5">
              <div className="flex items-center justify-between text-xs">
                <span className="capitalize text-slate-700 dark:text-slate-300">
                  {k === "plastic" ? "Nhựa" : k === "paper" ? "Giấy" : k === "glass" ? "Thủy tinh" : k === "metal" ? "Kim loại" : k === "organic" ? "Hữu cơ" : "Nguy hại"}
                </span>
                <span className="font-mono text-slate-600 dark:text-slate-400">
                  {val.toFixed(1)} kg
                </span>
              </div>
              <div className="h-1.5 overflow-hidden rounded-full bg-slate-100 dark:bg-slate-700">
                <div className={`h-full rounded-full ${color}`} style={{ width: `${pct}%` }} />
              </div>
            </div>
          );
        })}
      </div>

      {/* Per member */}
      <div className="rounded-xl border border-slate-200 bg-white p-3 dark:border-slate-700 dark:bg-slate-800">
        <div className="mb-2 text-xs font-bold uppercase tracking-wider text-slate-600 dark:text-slate-300">
          Đóng góp thành viên
        </div>
        {carbon.perMember
          .sort((a, b) => b.co2Kg - a.co2Kg)
          .map((m) => (
            <div key={m.userId} className="mb-1 flex items-center justify-between text-xs">
              <div className="flex items-center gap-2">
                <Award size={12} className="text-amber-500" />
                <span className="text-slate-700 dark:text-slate-300">{m.displayName}</span>
              </div>
              <div className="text-right">
                <span className="font-mono font-bold text-emerald-700 dark:text-emerald-300">
                  {m.co2Kg.toFixed(1)} kg
                </span>
                <span className="ml-2 text-slate-400">({m.scans} lượt)</span>
              </div>
            </div>
          ))}
      </div>
    </div>
  );
}

function Stat({
  icon,
  label,
  value,
  sub,
}: {
  icon: React.ReactNode;
  label: string;
  value: string;
  sub?: string;
}) {
  return (
    <div className="rounded-lg border border-slate-200 bg-white p-3 dark:border-slate-700 dark:bg-slate-800">
      <div className="flex items-center gap-1.5 text-xs text-slate-500">
        {icon} {label}
      </div>
      <div className="mt-1 text-xl font-bold text-slate-800 dark:text-slate-100">
        {value}
      </div>
      {sub && <div className="mt-0.5 text-[10px] text-slate-400">{sub}</div>}
    </div>
  );
}

function CreateChallengeForm({
  familyId,
  onClose,
  onCreated,
}: {
  familyId: string;
  onClose: () => void;
  onCreated: () => void;
}) {
  const [title, setTitle] = useState("");
  const [description, setDescription] = useState("");
  const [type, setType] = useState<typeof CHALLENGE_TYPES[number]["id"]>("total_scans");
  const [target, setTarget] = useState(20);
  const [days, setDays] = useState(7);
  const [reward, setReward] = useState(50);
  const [submitting, setSubmitting] = useState(false);

  async function submit() {
    setSubmitting(true);
    try {
      const endAt = Date.now() + days * 24 * 60 * 60 * 1000;
      await familyService.createChallenge(familyId, {
        title: title.trim(),
        description: description.trim(),
        type,
        target,
        endAt,
        reward,
      });
      onCreated();
    } catch (err: any) {
      alert(err.message);
    } finally {
      setSubmitting(false);
    }
  }

  return (
    <div className="fixed inset-0 z-[400] flex items-center justify-center bg-black/50 p-3">
      <div className="w-full max-w-md rounded-2xl border border-slate-200 bg-white p-5 dark:border-slate-700 dark:bg-slate-900">
        <div className="mb-3 flex items-center justify-between">
          <h4 className="text-base font-bold">Thử thách mới</h4>
          <button onClick={onClose}>
            <X size={18} />
          </button>
        </div>

        <div className="space-y-3">
          <input
            value={title}
            onChange={(e) => setTitle(e.target.value)}
            placeholder="Tiêu đề"
            className="w-full rounded-lg border border-slate-300 bg-white px-3 py-2 text-sm dark:border-slate-600 dark:bg-slate-800"
          />
          <textarea
            value={description}
            onChange={(e) => setDescription(e.target.value)}
            placeholder="Mô tả"
            className="w-full rounded-lg border border-slate-300 bg-white px-3 py-2 text-sm dark:border-slate-600 dark:bg-slate-800"
            rows={2}
          />
          <div className="grid grid-cols-2 gap-2">
            {CHALLENGE_TYPES.map((t) => (
              <button
                key={t.id}
                onClick={() => setType(t.id)}
                className={`rounded-lg border-2 p-2 text-left text-xs ${
                  type === t.id
                    ? "border-emerald-500 bg-emerald-50 dark:bg-emerald-900/20"
                    : "border-slate-200 dark:border-slate-700"
                }`}
              >
                <div className="text-lg">{t.icon}</div>
                <div className="font-bold">{t.label}</div>
              </button>
            ))}
          </div>
          <div className="grid grid-cols-3 gap-2">
            <div>
              <label className="text-[10px] uppercase text-slate-500">Mục tiêu</label>
              <input
                type="number"
                value={target}
                onChange={(e) => setTarget(Number(e.target.value))}
                min={1}
                className="w-full rounded-lg border border-slate-300 bg-white px-2 py-1.5 text-sm dark:border-slate-600 dark:bg-slate-800"
              />
            </div>
            <div>
              <label className="text-[10px] uppercase text-slate-500">Ngày</label>
              <input
                type="number"
                value={days}
                onChange={(e) => setDays(Number(e.target.value))}
                min={1}
                max={30}
                className="w-full rounded-lg border border-slate-300 bg-white px-2 py-1.5 text-sm dark:border-slate-600 dark:bg-slate-800"
              />
            </div>
            <div>
              <label className="text-[10px] uppercase text-slate-500">EXP/người</label>
              <input
                type="number"
                value={reward}
                onChange={(e) => setReward(Number(e.target.value))}
                min={0}
                className="w-full rounded-lg border border-slate-300 bg-white px-2 py-1.5 text-sm dark:border-slate-600 dark:bg-slate-800"
              />
            </div>
          </div>

          <button
            onClick={submit}
            disabled={submitting || !title.trim()}
            className="w-full rounded-lg bg-emerald-600 px-4 py-2 text-sm font-bold text-white hover:bg-emerald-700 disabled:opacity-50"
          >
            {submitting ? "Đang tạo..." : "Tạo thử thách"}
          </button>
        </div>
      </div>
    </div>
  );
}

export default FamilyMode;