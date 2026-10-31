import React, { useCallback, useEffect, useState, useRef } from "react";
import { User } from "../types";
import {
  ArrowLeft,
  Pencil,
  X,
  Save,
  RefreshCw,
  Camera,
  Trash2,
  ChevronRight,
  Shield,
  Zap,
  Award,
  Flame,
  ImageIcon,
} from "lucide-react";
import { Skeleton, ErrorRetry, ModalShell } from "../lib/ui";
import { RewardHistory } from "./RewardHistory";
import { useTranslation } from "react-i18next";
import { PROFILE_AVATARS, PROFILE_FRAMES } from "../lib/bmoAssets";

interface Props {
  nickname: string;
  currentUserNick: string;
  onClose: () => void;
  embedded?: boolean;
}

function getAuthHeaders(): RequestInit {
  const token = localStorage.getItem("auth_token");
  return token ? { headers: { Authorization: `Bearer ${token}` } } : {};
}

export function ProfileView({ nickname, currentUserNick, onClose, embedded = false }: Props) {
  const { t } = useTranslation();
  const isOwnProfile = nickname.trim().toLowerCase() === currentUserNick.trim().toLowerCase();
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
  const [activeTab, setActiveTab] = useState<"overview" | "history">("overview");

  const loadProfile = useCallback(() => {
    setLoading(true);
    setError(null);
    fetch(`/api/user/${nickname}`, getAuthHeaders())
      .then((res) => {
        if (!res.ok) throw new Error(t("profile.loadError"));
        return res.json();
      })
      .then((data) => {
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
  }, [nickname, t]);

  useEffect(() => {
    loadProfile();
  }, [loadProfile]);

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
    if (!allowed.includes(file.type)) {
      setUploadError(t("profile.onlyImages"));
      return;
    }
    if (file.size > 5 * 1024 * 1024) {
      setUploadError(t("profile.maxSize"));
      return;
    }

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
      const res = await fetch("/api/avatar/upload", {
        method: "POST",
        ...getAuthHeaders(),
        body: formData,
      });
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
    if (!editName.trim()) {
      setSavingMsg({ ok: false, text: t("profile.emptyName") });
      return;
    }
    if (!editPass) {
      setSavingMsg({ ok: false, text: t("profile.enterPassword") });
      return;
    }
    setSaving(true);
    setSavingMsg(null);
    try {
      const res = await fetch("/api/profile", {
        method: "PUT",
        headers: {
          "Content-Type": "application/json",
          ...(localStorage.getItem("auth_token")
            ? { Authorization: `Bearer ${localStorage.getItem("auth_token")}` }
            : {}),
        },
        body: JSON.stringify({
          nickname,
          name: editName.trim(),
          // Only send selectedAvatar if NOT using custom
          selectedAvatar: editCustomUrl ? "" : editAvatar || undefined,
          selectedFrame: editFrame || undefined,
          customAvatarUrl: editCustomUrl || undefined,
          pass: editPass,
        }),
      });
      const data = await res.json();
      if (data.success) {
        setSavingMsg({ ok: true, text: t("profile.saveSuccess") });
        setTimeout(() => {
          closeEdit();
          loadProfile();
        }, 900);
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
    ? (PROFILE_AVATARS.find((a) => a.id === profile.selectedAvatar) ?? null)
    : null;
  const activeFrame = profile
    ? (PROFILE_FRAMES.find((f) => f.id === profile.selectedFrame) ?? null)
    : null;

  const getAvatarName = (av: (typeof PROFILE_AVATARS)[number] | null) =>
    av ? t(`profile.avatars.${av.nameKey}` as const) : t("profile.defaultTheme");
  const getFrameName = (fr: (typeof PROFILE_FRAMES)[number] | null) =>
    fr ? t(`profile.frames.${fr.nameKey}` as const) : t("profile.noFrame");
  const getTitleName = (key: string) => t(`profile.titles.${key}` as const);

  let displayUrl: string | null = null;
  let displayFallback = profile?.name?.[0] || "?";
  if (profile?.customAvatarUrl) {
    displayUrl = profile.customAvatarUrl;
    displayFallback = "";
  } else if (activeAvatar) {
    displayUrl = activeAvatar.imageSrc;
    displayFallback = "";
  }

  // Edit preview avatar
  const editPreviewUrl =
    uploadPreview ||
    editCustomUrl ||
    PROFILE_AVATARS.find((avatar) => avatar.id === editAvatar)?.imageSrc ||
    null;

  if (loading)
    return (
      <div
        className={
          embedded
            ? "min-h-[32rem] space-y-4 overflow-y-auto rounded-[14px] border border-[var(--border-subtle)] bg-[var(--surface)] p-4 pt-16"
            : "absolute inset-0 z-40 space-y-4 overflow-y-auto bg-gray-50 p-4 pt-16"
        }
      >
        <Skeleton className="h-10 w-28 rounded-full" />
        <div className="flex flex-col items-center gap-3 pt-4">
          <Skeleton className="w-28 h-28 rounded-full" />
          <Skeleton className="h-7 w-40 rounded-lg" />
          <Skeleton className="h-5 w-24 rounded-full" />
        </div>
        <div className="grid grid-cols-2 gap-3 mt-6">
          {[1, 2, 3, 4].map((i) => (
            <Skeleton key={i} className="h-24 rounded-2xl" />
          ))}
          <Skeleton className="h-24 rounded-2xl col-span-2" />
          <Skeleton className="h-24 rounded-2xl col-span-2" />
        </div>
      </div>
    );

  if (error || !profile)
    return (
      <div
        className={
          embedded
            ? "min-h-[28rem] rounded-[14px] border border-[var(--border-subtle)] bg-[var(--surface)] p-4 pt-20 text-center"
            : "absolute inset-0 z-40 bg-white p-4 pt-20 text-center"
        }
      >
        <ErrorRetry message={error || t("profile.playerNotFound")} onRetry={loadProfile} />
        <button onClick={onClose} className="mt-4 text-emerald-500 font-bold">
          {t("profile.backButton")}
        </button>
      </div>
    );

  const level = Math.floor(profile.points / 200) + 1;
  const titleKey = profile.points > 200 ? "knight" : profile.points > 50 ? "guardian" : "seedling";
  const streak = profile.progress?.streakDays || 1;
  const streakMult = Math.min(1 + (streak - 1) * 0.1, 2);

  return (
    <div
      className={
        embedded
          ? "overflow-hidden rounded-[14px] border border-[var(--border-subtle)] bg-[var(--surface)]"
          : "absolute inset-0 z-40 overflow-y-auto bg-[var(--background)]"
      }
    >
      <header className="border-b border-[var(--border-subtle)] bg-[var(--surface)] p-5 sm:p-6">
        {!embedded && (
          <button
            onClick={onClose}
            className="mb-5 flex min-h-11 items-center gap-2 rounded-[8px] border border-[var(--border-strong)] px-3 text-sm font-semibold text-[var(--text-secondary)]"
          >
            <ArrowLeft className="h-4 w-4" /> {t("profile.backButton")}
          </button>
        )}
        <div className="flex flex-col gap-4 sm:flex-row sm:items-center">
          {displayUrl ? (
            <img
              src={displayUrl}
              alt={profile.name}
              loading="eager"
              decoding="async"
              className={`h-20 w-20 rounded-[14px] border border-[var(--border-subtle)] bg-[var(--primary-soft)] object-cover ${activeFrame?.style || ""}`}
            />
          ) : (
            <div
              className={`material-pattern material-organic flex h-20 w-20 shrink-0 items-center justify-center rounded-[14px] text-3xl font-semibold text-white ${activeFrame?.style || ""}`}
              data-material="organic"
            >
              {displayFallback}
            </div>
          )}
          <div className="min-w-0 flex-1">
            <h2 className="truncate text-2xl font-semibold tracking-[-0.025em] text-[var(--graphite)]">
              {profile.name}
            </h2>
            <p className="mt-1 text-sm text-[var(--text-muted)]">@{profile.account_id}</p>
            <div className="mt-3 flex flex-wrap gap-2">
              <span className="rounded-full border border-[var(--primary-border)] bg-[var(--primary-soft)] px-3 py-1 text-xs font-semibold text-[var(--primary-strong)]">
                {t("profile.levelTitle", { level, title: getTitleName(titleKey) })}
              </span>
              <span className="rounded-full border border-amber-200 bg-amber-50 px-3 py-1 text-xs font-semibold text-amber-700">
                {t("profile.streakDays", { streak })}
              </span>
            </div>
          </div>
          {isOwnProfile && (
            <button
              onClick={openEdit}
              className="flex min-h-11 items-center justify-center gap-2 rounded-[8px] border border-[var(--border-strong)] px-4 text-sm font-semibold text-[var(--primary)] hover:bg-[var(--primary-soft)]"
            >
              <Pencil className="h-4 w-4" /> {t("profile.editProfile")}
            </button>
          )}
        </div>
      </header>

      {/* ── MAIN CONTENT ─────────────────────────────────────────── */}
      <div className="mx-auto max-w-3xl space-y-4 p-4 sm:p-6">
        {/* EXP bar */}
        <div className="bg-white rounded-2xl p-4 shadow-sm border border-gray-100">
          <div className="flex justify-between items-center mb-2">
            <span className="text-xs font-bold text-gray-500 uppercase tracking-wide">
              {t("profile.commitment")}
            </span>
            <span className="text-lg font-black text-emerald-600">
              {profile.points}{" "}
              <span className="text-sm font-bold text-emerald-400">/ {level * 200}</span>
            </span>
          </div>
          <div className="w-full bg-gray-100 rounded-full h-3 overflow-hidden">
            <div
              className="h-full rounded-full bg-[var(--primary)] transition-[width] duration-300"
              style={{ width: `${Math.min((profile.points % 200) / 2, 100)}%` }}
            />
          </div>
          <p className="text-[10px] text-gray-400 mt-1 text-right">
            {t("profile.expToNext", { exp: Math.max(0, level * 200 - profile.points) })}
          </p>
        </div>

        {/* Stats grid */}
        <div className="grid grid-cols-2 gap-2">
          <div className="bg-white rounded-2xl p-4 shadow-sm border border-gray-100 flex flex-col items-center">
            <Flame className="text-orange-400 mb-1" size={22} />
            <span className="text-xl font-black text-gray-800">{streak}</span>
            <span className="text-[10px] font-bold text-gray-400 uppercase tracking-wide">
              {t("profile.streak")}
            </span>
            {streak > 1 && (
              <span className="text-[10px] font-black text-orange-400">
                ×{streakMult.toFixed(1)}
              </span>
            )}
          </div>
          <div className="bg-white rounded-2xl p-4 shadow-sm border border-gray-100 flex flex-col items-center">
            <Award className="text-blue-400 mb-1" size={22} />
            <span className="text-xl font-black text-gray-800">{level}</span>
            <span className="text-[10px] font-bold text-gray-400 uppercase tracking-wide">
              {t("profile.level")}
            </span>
          </div>
        </div>

        {/* Tabs */}
        <div className="flex gap-1 bg-white rounded-2xl p-1 shadow-sm border border-gray-100">
          {[
            { id: "overview", labelKey: "profile.overview" },
            ...(isOwnProfile ? [{ id: "history", labelKey: "profile.history" }] : []),
          ].map((tab) => (
            <button
              key={tab.id}
              onClick={() => setActiveTab(tab.id as typeof activeTab)}
              className={`flex-1 py-2.5 rounded-xl text-sm font-bold transition-all ${
                activeTab === tab.id
                  ? "bg-emerald-500 text-white shadow-sm"
                  : "text-gray-500 hover:text-gray-700"
              }`}
            >
              {t(tab.labelKey)}
            </button>
          ))}
        </div>

        {/* OVERVIEW TAB */}
        {activeTab === "overview" && (
          <div className="space-y-3">
            {/* Activity row */}
            <div className="bg-white rounded-2xl p-4 shadow-sm border border-gray-100 space-y-2">
              <h3 className="font-black text-gray-700 text-xs uppercase tracking-wider">
                Hoạt động
              </h3>
              {[
                {
                  labelKey: "profile.challengesCompleted",
                  value: profile.progress?.challengesCompleted?.length || 0,
                  icon: <Zap size={16} className="text-yellow-500" />,
                },
                {
                  labelKey: "profile.rewardsRedeemed",
                  value: profile.progress?.crafted?.length || 0,
                  icon: <Award size={16} className="text-amber-500" />,
                },
                {
                  labelKey: "profile.checkinDays",
                  value: profile.progress?.checkins?.length || 0,
                  icon: <Shield size={16} className="text-blue-500" />,
                },
              ].map((item) => (
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
              <h3 className="font-black text-gray-700 text-xs uppercase tracking-wider mb-3">
                {t("profile.ui")}
              </h3>
              <div className="flex gap-3">
                <div className="flex-1 flex items-center gap-2">
                  {displayUrl ? (
                    <img
                      src={displayUrl}
                      alt=""
                      loading="lazy"
                      decoding="async"
                      className="h-10 w-10 rounded-full bg-emerald-50 object-cover"
                    />
                  ) : (
                    <div
                      className="material-pattern material-organic flex h-10 w-10 items-center justify-center rounded-[8px] text-lg font-semibold text-white"
                      data-material="organic"
                    >
                      {displayFallback}
                    </div>
                  )}
                  <div>
                    <p className="text-xs font-bold text-gray-700">{getAvatarName(activeAvatar)}</p>
                    <p className="text-[10px] text-gray-400">Avatar</p>
                  </div>
                </div>
                <div className="w-px bg-gray-100" />
                <div className="flex-1 flex items-center gap-2">
                  <div
                    className={`flex h-10 w-10 items-center justify-center rounded-[8px] border border-[var(--border-subtle)] bg-[var(--surface-muted)] text-[var(--text-muted)] ${activeFrame?.style || ""}`}
                  >
                    <ImageIcon size={17} aria-hidden="true" />
                  </div>
                  <div>
                    <p className="text-xs font-bold text-gray-700">{getFrameName(activeFrame)}</p>
                    <p className="text-[10px] text-gray-400">Khung</p>
                  </div>
                </div>
                <button
                  onClick={openEdit}
                  className="flex items-center gap-1 text-emerald-600 text-xs font-bold hover:text-emerald-700 self-center"
                >
                  {t("profile.change")} <ChevronRight size={14} />
                </button>
              </div>
            </div>
          </div>
        )}

        {/* HISTORY TAB */}
        {isOwnProfile && activeTab === "history" && (
          <RewardHistory userId={nickname} currentBalance={profile.points} />
        )}
      </div>

      {/* ── EDIT MODAL ─────────────────────────────────────────────── */}
      {showEdit && (
        <ModalShell
          onClose={closeEdit}
          title={t("profile.editProfile")}
          className="max-h-[92vh] max-w-md overflow-y-auto"
        >
          {/* Modal header */}
          <div className="sticky top-0 bg-white z-10 flex items-center justify-between p-5 border-b border-gray-100">
            <h2 className="text-xl font-black text-gray-800">{t("profile.editProfile")}</h2>
            <button
              onClick={closeEdit}
              aria-label={t("common.close")}
              className="w-9 h-9 flex items-center justify-center rounded-full bg-gray-100 text-gray-500 hover:bg-gray-200 hover:text-gray-700 transition"
            >
              <X size={18} />
            </button>
          </div>

          <div className="p-5 space-y-6">
            {/* Avatar preview + upload */}
            <div className="flex flex-col items-center">
              {/* Preview */}
              <div className="relative mb-4">
                {editPreviewUrl ? (
                  <img
                    src={editPreviewUrl}
                    alt="Preview"
                    loading="lazy"
                    decoding="async"
                    className={`w-24 h-24 rounded-full bg-emerald-50 object-cover ring-4 ring-emerald-400 shadow-lg ${PROFILE_FRAMES.find((f) => f.id === editFrame)?.style || ""}`}
                  />
                ) : (
                  <div
                    className={`w-24 h-24 rounded-full flex items-center justify-center text-4xl font-black bg-gray-100 text-gray-400 shadow-lg ring-4 ring-gray-200 ${PROFILE_FRAMES.find((f) => f.id === editFrame)?.style || ""}`}
                  >
                    {profile.name?.[0] || "?"}
                  </div>
                )}
                {uploading && (
                  <div className="absolute inset-0 bg-black/40 rounded-full flex items-center justify-center">
                    <RefreshCw size={24} className="animate-spin text-white" />
                  </div>
                )}
                <label
                  htmlFor="avatar-upload"
                  className="absolute -bottom-1 -right-1 w-9 h-9 bg-emerald-500 text-white rounded-full flex items-center justify-center shadow-lg cursor-pointer hover:bg-emerald-600 transition"
                >
                  <Camera size={16} />
                </label>
                <input
                  ref={fileInputRef}
                  id="avatar-upload"
                  type="file"
                  accept="image/jpeg,image/png,image/gif,image/webp"
                  onChange={handleFileChange}
                  disabled={uploading}
                  className="hidden"
                />
              </div>

              {/* Action buttons */}
              <div className="flex gap-2">
                {editCustomUrl && (
                  <button
                    onClick={handleRemoveCustom}
                    className="flex items-center gap-1.5 px-3 py-1.5 rounded-xl text-xs font-bold border-2 border-red-200 text-red-500 hover:bg-red-50 transition"
                  >
                    <Trash2 size={13} /> {t("profile.deletePhoto")}
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
              <label
                htmlFor="profile-display-name"
                className="block text-xs font-black text-gray-500 uppercase tracking-wider mb-2"
              >
                {t("settings.displayName")}
              </label>
              <input
                id="profile-display-name"
                value={editName}
                onChange={(e) => setEditName(e.target.value)}
                maxLength={30}
                className="w-full px-4 py-3 bg-gray-50 border-2 border-gray-200 rounded-2xl text-base font-medium text-gray-800 focus:outline-none focus:border-emerald-400 focus:bg-white transition"
                placeholder={t("profile.newName")}
              />
            </div>

            {/* Collectible avatars */}
            <div>
              <p className="block text-xs font-black text-gray-500 uppercase tracking-wider mb-2">
                Avatar BMO
              </p>
              <div className="flex gap-3">
                {PROFILE_AVATARS.map((av) => (
                  <button
                    key={av.id}
                    onClick={() => {
                      setEditAvatar(editAvatar === av.id ? "" : av.id);
                      setEditCustomUrl("");
                      setUploadPreview(null);
                    }}
                    className={`w-16 h-16 overflow-hidden rounded-2xl flex flex-col items-center justify-center gap-0.5 font-black transition-all shadow-sm ${
                      editAvatar === av.id && !editCustomUrl
                        ? `${av.color} ring-2 ring-emerald-500 ring-offset-1 scale-105`
                        : "bg-gray-100 text-gray-400 hover:bg-gray-200 opacity-60 hover:opacity-100"
                    }`}
                    aria-label={t(`profile.avatars.${av.nameKey}` as const)}
                  >
                    <img
                      src={av.imageSrc}
                      alt=""
                      loading="lazy"
                      decoding="async"
                      className="h-full w-full object-contain"
                    />
                  </button>
                ))}
              </div>
            </div>

            {/* Frames */}
            <div>
              <p className="block text-xs font-black text-gray-500 uppercase tracking-wider mb-2">
                Khung avatar
              </p>
              <div className="grid grid-cols-2 gap-2">
                <button
                  onClick={() => setEditFrame("")}
                  className={`p-3 rounded-2xl text-left transition-all border-2 ${
                    !editFrame ? "border-gray-400 bg-gray-100" : "border-gray-100 bg-white"
                  }`}
                >
                  <p className="text-xs font-bold text-gray-700">{t("profile.noFrame")}</p>
                  <p className="text-[10px] text-gray-400">{t("profile.defaultTheme")}</p>
                </button>
                {PROFILE_FRAMES.map((fr) => (
                  <button
                    key={fr.id}
                    onClick={() => setEditFrame(editFrame === fr.id ? "" : fr.id)}
                    className={`p-3 rounded-2xl text-left transition-all border-2 ${
                      editFrame === fr.id
                        ? "border-emerald-400 bg-emerald-50"
                        : "border-gray-100 bg-white hover:border-gray-300"
                    }`}
                  >
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
              <input
                type="password"
                value={editPass}
                onChange={(e) => setEditPass(e.target.value)}
                className="w-full px-4 py-3 bg-gray-50 border-2 border-gray-200 rounded-2xl text-base font-medium text-gray-800 focus:outline-none focus:border-emerald-400 focus:bg-white transition"
                placeholder={t("profile.enterAccountPassword")}
              />
            </div>

            {/* Save button */}
            {savingMsg && (
              <div
                className={`text-sm font-bold px-4 py-3 rounded-2xl ${
                  savingMsg.ok
                    ? "bg-emerald-50 text-emerald-700 border border-emerald-200"
                    : "bg-red-50 text-red-600 border border-red-200"
                }`}
              >
                {savingMsg.text}
              </div>
            )}

            <div className="flex gap-3">
              <button
                onClick={handleSave}
                disabled={saving}
                className="flex-1 flex items-center justify-center gap-2 py-3.5 bg-emerald-500 text-white rounded-2xl font-bold text-base hover:bg-emerald-600 disabled:opacity-60 active:scale-[0.98] transition-all shadow-lg shadow-emerald-200"
              >
                {saving ? <RefreshCw size={18} className="animate-spin" /> : <Save size={18} />}
                {saving ? t("common.saving") : t("common.save")}
              </button>
              <button
                onClick={closeEdit}
                className="px-5 py-3.5 bg-gray-100 text-gray-600 rounded-2xl font-bold text-base hover:bg-gray-200 active:scale-[0.98] transition-all"
              >
                {t("common.cancel")}
              </button>
            </div>
          </div>
        </ModalShell>
      )}
    </div>
  );
}
