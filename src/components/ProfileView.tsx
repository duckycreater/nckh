import React, { useEffect, useState, useRef } from 'react';
import { User } from '../types';
import { ArrowLeft, Pencil, X, Save, RefreshCw, Camera, Trash2, ChevronRight, Shield, Star, Zap, Award, Flame } from 'lucide-react';
import { Skeleton, ErrorRetry } from '../lib/ui';
import { RewardHistory } from './RewardHistory';
import { useTranslation } from 'react-i18next';

const EMOJI_AVATARS = [
  { id: "av1", emoji: "🌱", nameKey: "seedling", color: "bg-emerald-100 text-emerald-600", bg: "from-emerald-400 to-teal-500" },
  { id: "av2", emoji: "💧", nameKey: "guardian", color: "bg-blue-100 text-blue-600", bg: "from-blue-400 to-cyan-500" },
  { id: "av3", emoji: "🦁", nameKey: "knight", color: "bg-amber-100 text-amber-600", bg: "from-amber-400 to-orange-500" },
];

const FRAMES = [
  { id: "fr1", nameKey: "wooden", style: "ring-4 ring-amber-700", desc: "profile.frames.woodenDesc" },
  { id: "fr2", nameKey: "ice", style: "ring-4 ring-cyan-400", desc: "profile.frames.iceDesc" },
  { id: "fr3", nameKey: "glow", style: "ring-4 ring-emerald-500 shadow-[0_0_16px_#10b981]", desc: "profile.frames.glowDesc" },
];

interface Props {
  nickname: string;
  onClose: () => void;
}

function getAuthHeaders(): RequestInit {
  const token = localStorage.getItem("auth_token");
  return token ? { headers: { Authorization: `Bearer ${token}` } } : {};
}

export function ProfileView({ nickname, onClose }: Props) {
  const { t } = useTranslation();
  const [profile, setProfile] = useState<User | null>(null);
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState<string | null>(null);

  // Edit modal
  const [showEdit, setShowEdit] = useState(false);
  const [editName, setEditName] = useState("");
  const [editAvatar, setEditAvatar] = useState("");
  const [editFrame, setEditFrame] = useState("");
  const [editCustomUrl, setEditCustomUrl] = useState("");
  const [editPass, setEditPass] = useState("");
  const [saving, setSaving] = useState(false);
  const [savingMsg, setSavingMsg] = useState<{ ok: boolean; text: string } | null>(null);

  // Upload
  const [uploading, setUploading] = useState(false);
  const [uploadPreview, setUploadPreview] = useState<string | null>(null);
  const [uploadError, setUploadError] = useState<string | null>(null);
  const fileInputRef = useRef<HTMLInputElement>(null);

  // Tabs
  const [activeTab, setActiveTab] = useState<'overview' | 'history'>('overview');

  const loadProfile = () => {
    setLoading(true);
    fetch(`/api/user/${nickname}`)
      .then(res => { if (!res.ok) throw new Error(t("profile.loadError")); return res.json(); })
      .then(data => {
        setProfile(data);
        setEditName(data.name || "");
        setEditAvatar(data.selectedAvatar || "");
        setEditFrame(data.selectedFrame || "");
        setEditCustomUrl(data.customAvatarUrl || "");
        setLoading(false);
      })
      .catch((err: unknown) => {
        setError(err instanceof Error ? err.message : t("common.error"));
        setLoading(false);
      });
  };

  useEffect(() => { loadProfile(); }, [nickname]);

  const openEdit = () => {
    if (!profile) return;
    setEditName(profile.name || "");
    setEditAvatar(profile.selectedAvatar || "");
    setEditFrame(profile.selectedFrame || "");
    setEditCustomUrl(profile.customAvatarUrl || "");
    setUploadPreview(null);
    setUploadError(null);
    setSavingMsg(null);
    setEditPass("");
    setShowEdit(true);
  };

  const closeEdit = () => {
    setShowEdit(false);
    setSavingMsg(null);
    setUploadError(null);
  };

  const handleFileChange = async (e: React.ChangeEvent<HTMLInputElement>) => {
    const file = e.target.files?.[0];
    if (!file) return;

    const allowed = ["image/jpeg", "image/png", "image/gif", "image/webp"];
    if (!allowed.includes(file.type)) { setUploadError(t("profile.onlyImages")); return; }
    if (file.size > 5 * 1024 * 1024) { setUploadError(t("profile.maxSize")); return; }

    setUploadError(null);
    setUploading(true);

    // Instant preview
    const url = URL.createObjectURL(file);
    setUploadPreview(url);
    // Clear emoji selection when choosing custom
    setEditAvatar("");

    const formData = new FormData();
    formData.append("image", file);
    formData.append("targetNick", nickname);
    try {
      const res = await fetch("/api/avatar/upload", { method: "POST", ...getAuthHeaders(), body: formData });
      const data = await res.json();
      URL.revokeObjectURL(url);
      setUploadPreview(null);
      if (data.success) {
        setEditCustomUrl(data.url);
        setUploadError(null);
      } else {
        setUploadError(data.message || t("profile.uploadFailed"));
        setEditCustomUrl("");
      }
    } catch {
      URL.revokeObjectURL(url);
      setUploadPreview(null);
      setUploadError(t("profile.uploadError"));
    }
    setUploading(false);
    if (fileInputRef.current) fileInputRef.current.value = "";
  };

  const handleRemoveCustom = () => {
    setEditCustomUrl("");
    setUploadPreview(null);
    setUploadError(null);
  };

  const handleSave = async () => {
    if (!editName.trim()) { setSavingMsg({ ok: false, text: t("profile.emptyName") }); return; }
    if (!editPass) { setSavingMsg({ ok: false, text: t("profile.enterPassword") }); return; }
    setSaving(true);
    setSavingMsg(null);
    try {
      const res = await fetch("/api/profile", {
        method: "PUT",
        headers: { "Content-Type": "application/json", ...(localStorage.getItem("auth_token") ? { Authorization: `Bearer ${localStorage.getItem("auth_token")}` } : {}) },
        body: JSON.stringify({
          nickname,
          name: editName.trim(),
          // Only send selectedAvatar if NOT using custom
          selectedAvatar: editCustomUrl ? "" : (editAvatar || undefined),
          selectedFrame: editFrame || undefined,
          customAvatarUrl: editCustomUrl || undefined,
          pass: editPass,
        }),
      });
      const data = await res.json();
      if (data.success) {
        setSavingMsg({ ok: true, text: t("profile.saveSuccess") });
        setTimeout(() => { closeEdit(); loadProfile(); }, 900);
      } else {
        setSavingMsg({ ok: false, text: data.message || t("profile.saveFailed") });
      }
    } catch {
      setSavingMsg({ ok: false, text: t("profile.connectionError") });
    }
    setSaving(false);
  };

  // ── Display avatar logic ───────────────────────────────────────────
  const activeAvatar = profile
    ? EMOJI_AVATARS.find(a => a.id === profile.selectedAvatar)
    : null;
  const activeFrame = profile
    ? FRAMES.find(f => f.id === profile.selectedFrame)
    : null;

  const getAvatarName = (av: typeof EMOJI_AVATARS[0] | null) =>
    av ? t(`profile.avatars.${av.nameKey}` as const) : t("profile.defaultTheme");
  const getFrameName = (fr: typeof FRAMES[0] | null) =>
    fr ? t(`profile.frames.${fr.nameKey}` as const) : t("profile.noFrame");
  const getTitleName = (key: string) => t(`profile.titles.${key}` as const);

  let displayUrl: string | null = null;
  let displayEmoji = profile?.name?.[0] || "?";
  if (profile?.customAvatarUrl) { displayUrl = profile.customAvatarUrl; displayEmoji = ""; }
  else if (activeAvatar) { displayEmoji = activeAvatar.emoji; displayUrl = null; }

  // Edit preview avatar
  const editPreviewUrl = uploadPreview || editCustomUrl || null;
  const editPreviewEmoji = editAvatar
    ? (EMOJI_AVATARS.find(a => a.id === editAvatar)?.emoji || "")
    : (!editCustomUrl && !uploadPreview ? (profile?.name?.[0] || "?") : "");

  if (loading) return (
    <div className="absolute inset-0 z-40 bg-gray-50 p-4 pt-16 space-y-4 animate-pulse overflow-y-auto">
      <Skeleton className="h-10 w-28 rounded-full" />
      <div className="flex flex-col items-center gap-3 pt-4">
        <Skeleton className="w-28 h-28 rounded-full" />
        <Skeleton className="h-7 w-40 rounded-lg" />
        <Skeleton className="h-5 w-24 rounded-full" />
      </div>
      <div className="grid grid-cols-2 gap-3 mt-6">
        {[1,2,3,4].map(i => <Skeleton key={i} className="h-24 rounded-2xl" />)}
        <Skeleton className="h-24 rounded-2xl col-span-2" />
        <Skeleton className="h-24 rounded-2xl col-span-2" />
      </div>
    </div>
  );

  if (error || !profile) return (
    <div className="absolute inset-0 z-40 bg-white p-4 text-center pt-20">
      <ErrorRetry message={error || t("profile.playerNotFound")} onRetry={loadProfile} />
      <button onClick={onClose} className="mt-4 text-emerald-500 font-bold">{t("profile.backButton")}</button>
    </div>
  );

  const level = Math.floor(profile.points / 200) + 1;
  const titleKey = profile.points > 200 ? "knight" : profile.points > 50 ? "guardian" : "seedling";
  const streak = profile.progress?.streakDays || 1;
  const streakMult = Math.min(1 + (streak - 1) * 0.1, 2);

  return (
    <div className="absolute inset-0 z-40 bg-gray-50 overflow-y-auto">

      {/* ── HEADER BANNER ─────────────────────────────────────────── */}
      <div className="relative">
        {/* Background gradient */}
        <div className="h-40 bg-gradient-to-br from-emerald-500 via-teal-500 to-cyan-500" />
        {/* Avatar circle + edit button */}
        <div className="absolute -bottom-12 left-0 right-0 flex flex-col items-center">
          <div className="relative">
            {displayUrl ? (
              <img src={displayUrl} alt={profile.name} className={`w-28 h-28 rounded-full object-cover ring-4 ring-white shadow-xl ${activeFrame?.style || ""}`} />
            ) : (
              <div className={`w-28 h-28 rounded-full flex items-center justify-center text-5xl font-black ring-4 ring-white shadow-xl bg-gradient-to-br ${activeAvatar?.bg || "from-emerald-100 to-teal-100"} ${activeAvatar ? "text-white" : "text-emerald-600"} ${activeFrame?.style || ""}`}>
                {displayEmoji}
              </div>
            )}
            {profile.customAvatarUrl && (
              <span className="absolute -bottom-1 -right-1 bg-indigo-500 text-white text-[10px] font-black px-1.5 py-0.5 rounded-full shadow">Tùy chỉnh</span>
            )}
          </div>
          <h2 className="mt-3 text-2xl font-black text-gray-800 tracking-tight">{profile.name}</h2>
          <div className="flex items-center gap-2 mt-1">
            <span className="bg-emerald-500 text-white text-xs font-black px-3 py-1 rounded-full shadow-sm">
              {t("profile.levelTitle", { level, title: getTitleName(titleKey) })}
            </span>
            <span className="bg-orange-100 text-orange-600 text-xs font-black px-3 py-1 rounded-full">
              {t("profile.streakDays", { streak })}
            </span>
          </div>
        </div>
        {/* Back + Edit buttons */}
        <div className="absolute top-4 left-4 right-4 flex justify-between">
          <button onClick={onClose} className="flex items-center gap-1 bg-white/80 backdrop-blur text-gray-700 font-bold text-sm px-3 py-1.5 rounded-full shadow hover:bg-white transition">
            <ArrowLeft className="w-4 h-4" />
            <span>{t("profile.backButton")}</span>
          </button>
          <button onClick={openEdit} className="flex items-center gap-1.5 bg-white/80 backdrop-blur text-emerald-600 font-bold text-sm px-4 py-1.5 rounded-full shadow hover:bg-white transition">
            <Pencil className="w-4 h-4" />
            <span>{t("profile.editProfile")}</span>
          </button>
        </div>
      </div>

      {/* ── MAIN CONTENT ─────────────────────────────────────────── */}
      <div className="mt-16 px-4 pb-24 space-y-4 max-w-lg mx-auto">

        {/* EXP bar */}
        <div className="bg-white rounded-2xl p-4 shadow-sm border border-gray-100">
          <div className="flex justify-between items-center mb-2">
            <span className="text-xs font-bold text-gray-500 uppercase tracking-wide">{t("profile.commitment")}</span>
            <span className="text-lg font-black text-emerald-600">{profile.points} <span className="text-sm font-bold text-emerald-400">/ {level * 200}</span></span>
          </div>
          <div className="w-full bg-gray-100 rounded-full h-3 overflow-hidden">
            <div
              className="h-full bg-gradient-to-r from-emerald-400 to-teal-500 rounded-full transition-all duration-700"
              style={{ width: `${Math.min((profile.points % 200) / 2, 100)}%` }}
            />
          </div>
          <p className="text-[10px] text-gray-400 mt-1 text-right">{t("profile.expToNext", { exp: Math.max(0, level * 200 - profile.points) })}</p>
        </div>

        {/* Stats grid */}
        <div className="grid grid-cols-3 gap-2">
          <div className="bg-white rounded-2xl p-4 shadow-sm border border-gray-100 flex flex-col items-center">
            <Flame className="text-orange-400 mb-1" size={22} />
            <span className="text-xl font-black text-gray-800">{streak}</span>
            <span className="text-[10px] font-bold text-gray-400 uppercase tracking-wide">{t("profile.streak")}</span>
            {streak > 1 && <span className="text-[10px] font-black text-orange-400">×{streakMult.toFixed(1)} EXP</span>}
          </div>
          <div className="bg-white rounded-2xl p-4 shadow-sm border border-gray-100 flex flex-col items-center">
            <Award className="text-blue-400 mb-1" size={22} />
            <span className="text-xl font-black text-gray-800">{level}</span>
            <span className="text-[10px] font-bold text-gray-400 uppercase tracking-wide">{t("profile.level")}</span>
          </div>
          <div className="bg-white rounded-2xl p-4 shadow-sm border border-gray-100 flex flex-col items-center">
            <Star className="text-purple-400 mb-1" size={22} />
            <span className="text-xl font-black text-gray-800">{profile.progress?.flashcardsRead?.length || 0}</span>
            <span className="text-[10px] font-bold text-gray-400 uppercase tracking-wide">{t("profile.cardsOwned")}</span>
          </div>
        </div>

        {/* Tabs */}
        <div className="flex gap-1 bg-white rounded-2xl p-1 shadow-sm border border-gray-100">
          {[
            { id: 'overview', labelKey: 'profile.overview' },
            { id: 'history', labelKey: 'profile.history' },
          ].map(tab => (
            <button
              key={tab.id}
              onClick={() => setActiveTab(tab.id as typeof activeTab)}
              className={`flex-1 py-2.5 rounded-xl text-sm font-bold transition-all ${
                activeTab === tab.id ? "bg-emerald-500 text-white shadow-sm" : "text-gray-500 hover:text-gray-700"
              }`}
            >
              {t(tab.labelKey)}
            </button>
          ))}
        </div>

        {/* OVERVIEW TAB */}
        {activeTab === 'overview' && (
          <div className="space-y-3">
            {/* Activity row */}
            <div className="bg-white rounded-2xl p-4 shadow-sm border border-gray-100 space-y-2">
              <h3 className="font-black text-gray-700 text-xs uppercase tracking-wider">Hoạt động</h3>
              {[
                { labelKey: "profile.challengesCompleted", value: profile.progress?.challengesCompleted?.length || 0, icon: <Zap size={16} className="text-yellow-500" /> },
                { labelKey: "profile.rewardsRedeemed", value: profile.progress?.crafted?.length || 0, icon: <Award size={16} className="text-amber-500" /> },
                { labelKey: "profile.checkinDays", value: profile.progress?.checkins?.length || 0, icon: <Shield size={16} className="text-blue-500" /> },
              ].map(item => (
                <div key={item.labelKey} className="flex items-center justify-between py-1.5">
                  <div className="flex items-center gap-2">
                    {item.icon}
                    <span className="text-sm text-gray-600">{t(item.labelKey)}</span>
                  </div>
                  <span className="text-lg font-black text-gray-800">{item.value}</span>
                </div>
              ))}
            </div>

            {/* Avatar & Frame info */}
            <div className="bg-white rounded-2xl p-4 shadow-sm border border-gray-100">
              <h3 className="font-black text-gray-700 text-xs uppercase tracking-wider mb-3">{t("profile.ui")}</h3>
              <div className="flex gap-3">
                <div className="flex-1 flex items-center gap-2">
                  <div className={`w-10 h-10 rounded-full flex items-center justify-center text-lg font-black bg-gradient-to-br ${activeAvatar?.bg || "from-emerald-100 to-teal-100"} ${activeAvatar ? "text-white" : "text-emerald-600"}`}>
                    {displayEmoji}
                  </div>
                  <div>
                    <p className="text-xs font-bold text-gray-700">{getAvatarName(activeAvatar)}</p>
                    <p className="text-[10px] text-gray-400">Avatar</p>
                  </div>
                </div>
                <div className="w-px bg-gray-100" />
                <div className="flex-1 flex items-center gap-2">
                  <div className={`w-10 h-10 rounded-full flex items-center justify-center text-xs font-black bg-gray-100 text-gray-500 ${activeFrame?.style || ""}`}>
                    🖼
                  </div>
                  <div>
                    <p className="text-xs font-bold text-gray-700">{getFrameName(activeFrame)}</p>
                    <p className="text-[10px] text-gray-400">Khung</p>
                  </div>
                </div>
                <button onClick={openEdit} className="flex items-center gap-1 text-emerald-600 text-xs font-bold hover:text-emerald-700 self-center">
                  {t("profile.change")} <ChevronRight size={14}/>
                </button>
              </div>
            </div>

            {/* Bộ sưu tập */}
            <div className="bg-indigo-50 rounded-2xl p-4 shadow-sm border border-indigo-100">
              <h3 className="font-black text-indigo-600 text-xs uppercase tracking-wider mb-2">{t("profile.collection")}</h3>
              <div className="flex items-end justify-between">
                <div>
                  <span className="text-3xl font-black text-indigo-600">{profile.progress?.flashcardsRead?.length || 0}</span>
                  <span className="text-lg font-bold text-indigo-300">/300</span>
                </div>
                <div className="w-32 bg-indigo-100 rounded-full h-2">
                  <div className="h-full bg-indigo-400 rounded-full" style={{ width: `${((profile.progress?.flashcardsRead?.length || 0) / 300) * 100}%` }} />
                </div>
              </div>
            </div>
          </div>
        )}

        {/* HISTORY TAB */}
        {activeTab === 'history' && (
          <RewardHistory userId={nickname} currentBalance={profile.points} />
        )}
      </div>

      {/* ── EDIT MODAL ─────────────────────────────────────────────── */}
      {showEdit && (
        <div className="fixed inset-0 z-50 bg-black/40 backdrop-blur-sm flex items-end sm:items-center justify-center p-0 sm:p-4">
          <div className="bg-white w-full sm:max-w-md sm:rounded-3xl rounded-t-3xl max-h-[92vh] overflow-y-auto shadow-2xl">

            {/* Modal header */}
            <div className="sticky top-0 bg-white z-10 flex items-center justify-between p-5 border-b border-gray-100">
              <h2 className="text-xl font-black text-gray-800">{t("profile.editProfile")}</h2>
              <button onClick={closeEdit} className="w-9 h-9 flex items-center justify-center rounded-full bg-gray-100 text-gray-500 hover:bg-gray-200 hover:text-gray-700 transition">
                <X size={18}/>
              </button>
            </div>

            <div className="p-5 space-y-6">

              {/* Avatar preview + upload */}
              <div className="flex flex-col items-center">
                {/* Preview */}
                <div className="relative mb-4">
                  {editPreviewUrl ? (
                    <img src={editPreviewUrl} alt="Preview" className={`w-24 h-24 rounded-full object-cover ring-4 ring-emerald-400 shadow-lg ${FRAMES.find(f => f.id === editFrame)?.style || ""}`} />
                  ) : editPreviewEmoji ? (
                    <div className={`w-24 h-24 rounded-full flex items-center justify-center text-4xl font-black bg-gradient-to-br ${EMOJI_AVATARS.find(a => a.id === editAvatar)?.bg || "from-emerald-100 to-teal-100"} text-white shadow-lg ring-4 ring-emerald-400 ${FRAMES.find(f => f.id === editFrame)?.style || ""}`}>
                      {editPreviewEmoji}
                    </div>
                  ) : (
                    <div className={`w-24 h-24 rounded-full flex items-center justify-center text-4xl font-black bg-gray-100 text-gray-400 shadow-lg ring-4 ring-gray-200 ${FRAMES.find(f => f.id === editFrame)?.style || ""}`}>
                      ?
                    </div>
                  )}
                  {uploading && (
                    <div className="absolute inset-0 bg-black/40 rounded-full flex items-center justify-center">
                      <RefreshCw size={24} className="animate-spin text-white" />
                    </div>
                  )}
                  <label htmlFor="avatar-upload" className="absolute -bottom-1 -right-1 w-9 h-9 bg-emerald-500 text-white rounded-full flex items-center justify-center shadow-lg cursor-pointer hover:bg-emerald-600 transition">
                    <Camera size={16}/>
                  </label>
                  <input ref={fileInputRef} id="avatar-upload" type="file" accept="image/jpeg,image/png,image/gif,image/webp" onChange={handleFileChange} disabled={uploading} className="hidden" />
                </div>

                {/* Action buttons */}
                <div className="flex gap-2">
                  {editCustomUrl && (
                    <button onClick={handleRemoveCustom} className="flex items-center gap-1.5 px-3 py-1.5 rounded-xl text-xs font-bold border-2 border-red-200 text-red-500 hover:bg-red-50 transition">
                      <Trash2 size={13}/> {t("profile.deletePhoto")}
                    </button>
                  )}
                </div>

                {uploadError && <p className="text-xs text-red-500 font-bold mt-1">{uploadError}</p>}
                <p className="text-[11px] text-gray-400 mt-1">JPG, PNG, GIF, WEBP · Tối đa 5MB</p>
              </div>

              {/* Divider */}
              <div className="border-t border-gray-100" />

              {/* Name */}
              <div>
                <label className="block text-xs font-black text-gray-500 uppercase tracking-wider mb-2">{t("settings.displayName")}</label>
                <input value={editName} onChange={e => setEditName(e.target.value)} maxLength={30}
                  className="w-full px-4 py-3 bg-gray-50 border-2 border-gray-200 rounded-2xl text-base font-medium text-gray-800 focus:outline-none focus:border-emerald-400 focus:bg-white transition"
                  placeholder={t("profile.newName")} />
              </div>

              {/* Emoji avatars */}
              <div>
                <label className="block text-xs font-black text-gray-500 uppercase tracking-wider mb-2">Avatar emoji</label>
                <div className="flex gap-3">
                  {EMOJI_AVATARS.map(av => (
                    <button key={av.id}
                      onClick={() => { setEditAvatar(editAvatar === av.id ? "" : av.id); setEditCustomUrl(""); setUploadPreview(null); }}
                      className={`w-14 h-14 rounded-2xl flex flex-col items-center justify-center gap-0.5 text-xl font-black transition-all shadow-sm ${
                        editAvatar === av.id && !editCustomUrl
                          ? `${av.color} ring-2 ring-emerald-500 ring-offset-1 scale-105`
                          : "bg-gray-100 text-gray-400 hover:bg-gray-200 opacity-60 hover:opacity-100"
                      }`}>
                      {av.emoji}
                      <span className="text-[8px] font-bold leading-none">{t(`profile.avatars.${av.nameKey}` as const).split(" ")[0]}</span>
                    </button>
                  ))}
                </div>
              </div>

              {/* Frames */}
              <div>
                <label className="block text-xs font-black text-gray-500 uppercase tracking-wider mb-2">Khung avatar</label>
                <div className="grid grid-cols-2 gap-2">
                  <button onClick={() => setEditFrame("")}
                    className={`p-3 rounded-2xl text-left transition-all border-2 ${
                      !editFrame ? "border-gray-400 bg-gray-100" : "border-gray-100 bg-white"
                    }`}>
                    <p className="text-xs font-bold text-gray-700">{t("profile.noFrame")}</p>
                    <p className="text-[10px] text-gray-400">{t("profile.defaultTheme")}</p>
                  </button>
                  {FRAMES.map(fr => (
                    <button key={fr.id}
                      onClick={() => setEditFrame(editFrame === fr.id ? "" : fr.id)}
                      className={`p-3 rounded-2xl text-left transition-all border-2 ${
                        editFrame === fr.id ? "border-emerald-400 bg-emerald-50" : "border-gray-100 bg-white hover:border-gray-300"
                      }`}>
                      <p className="text-xs font-bold text-gray-700">{getFrameName(fr)}</p>
                      <p className="text-[10px] text-gray-400">{t(fr.desc)}</p>
                    </button>
                  ))}
                </div>
              </div>

              {/* Password confirmation */}
              <div>
                <label className="block text-xs font-black text-gray-500 uppercase tracking-wider mb-2">
                  {t("profile.confirmPassword")}
                </label>
                <input type="password" value={editPass} onChange={e => setEditPass(e.target.value)}
                  className="w-full px-4 py-3 bg-gray-50 border-2 border-gray-200 rounded-2xl text-base font-medium text-gray-800 focus:outline-none focus:border-emerald-400 focus:bg-white transition"
                  placeholder={t("profile.enterAccountPassword")} />
              </div>

              {/* Save button */}
              {savingMsg && (
                <div className={`text-sm font-bold px-4 py-3 rounded-2xl ${
                  savingMsg.ok ? "bg-emerald-50 text-emerald-700 border border-emerald-200" : "bg-red-50 text-red-600 border border-red-200"
                }`}>
                  {savingMsg.text}
                </div>
              )}

              <div className="flex gap-3">
                <button onClick={handleSave} disabled={saving}
                  className="flex-1 flex items-center justify-center gap-2 py-3.5 bg-emerald-500 text-white rounded-2xl font-bold text-base hover:bg-emerald-600 disabled:opacity-60 active:scale-[0.98] transition-all shadow-lg shadow-emerald-200">
                  {saving ? <RefreshCw size={18} className="animate-spin"/> : <Save size={18}/>}
                  {saving ? t("common.saving") : t("common.save")}
                </button>
                <button onClick={closeEdit}
                  className="px-5 py-3.5 bg-gray-100 text-gray-600 rounded-2xl font-bold text-base hover:bg-gray-200 active:scale-[0.98] transition-all">
                  {t("common.cancel")}
                </button>
              </div>
            </div>
          </div>
        </div>
      )}
    </div>
  );
}
