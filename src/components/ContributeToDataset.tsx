/**
 * ContributeToDataset.tsx - Phase 1: Opt-in consent UI for Public Waste AI
 *
 * Lets users contribute their waste scan images to an open scientific dataset
 * (TDN-Waste-World). Clearly explains:
 * - What's collected (image, classification, anonymized metadata)
 * - What's NOT collected (user identity stripped from images)
 * - How to withdraw (one-click GDPR-style revoke)
 * - Impact stats (# scans contributed, # released globally)
 */

import React, { useState, useEffect } from "react";
import { useTranslation } from "react-i18next";
import { motion, AnimatePresence } from "framer-motion";
import { Database, Globe, Shield, CheckCircle2, XCircle, Download, Users } from "lucide-react";

const API_BASE = import.meta.env.VITE_API_BASE_URL || "";

interface DatasetStatus {
  consentGiven: boolean;
  consentDate?: string;
  revokedAt?: string;
  totalImages: number;
  imagesInRelease: number;
  firstContributionAt?: string;
  lastContributionAt?: string;
}

interface GlobalStats {
  consented_scans?: number;
  released_scans?: number;
  curated_scans?: number;
  pending_scans?: number;
  unique_contributors?: number;
  unique_countries?: number;
}

interface Props {
  nickname: string;
  isOpen: boolean;
  onClose: () => void;
}

export function ContributeToDataset({ nickname, isOpen, onClose }: Props) {
  const { t } = useTranslation();
  const [status, setStatus] = useState<DatasetStatus | null>(null);
  const [stats, setStats] = useState<GlobalStats | null>(null);
  const [loading, setLoading] = useState(false);
  const [submitting, setSubmitting] = useState(false);

  useEffect(() => {
    if (!isOpen || !nickname) return;
    fetchStatus();
    fetchStats();
  }, [isOpen, nickname]);

  async function fetchStatus() {
    setLoading(true);
    try {
      const r = await fetch(`${API_BASE}/api/dataset/status?nickname=${encodeURIComponent(nickname)}`);
      if (r.ok) setStatus(await r.json());
    } catch (e) {
      console.error(e);
    } finally {
      setLoading(false);
    }
  }

  async function fetchStats() {
    try {
      const r = await fetch(`${API_BASE}/api/dataset/stats`);
      if (r.ok) setStats(await r.json());
    } catch (e) {
      console.error(e);
    }
  }

  async function grantConsent() {
    setSubmitting(true);
    try {
      const token = localStorage.getItem("bmo_token") || "";
      const r = await fetch(`${API_BASE}/api/dataset/consent`, {
        method: "POST",
        headers: {
          "Content-Type": "application/json",
          Authorization: `Bearer ${token}`,
        },
      });
      if (r.ok) await fetchStatus();
    } catch (e) {
      console.error(e);
    } finally {
      setSubmitting(false);
    }
  }

  async function revokeConsent() {
    if (!confirm("Bạn có chắc muốn thu hồi đồng ý? Ảnh của bạn sẽ bị ẩn khỏi các bản phát hành tương lai.")) {
      return;
    }
    setSubmitting(true);
    try {
      const token = localStorage.getItem("bmo_token") || "";
      const r = await fetch(`${API_BASE}/api/dataset/revoke`, {
        method: "POST",
        headers: {
          "Content-Type": "application/json",
          Authorization: `Bearer ${token}`,
        },
      });
      if (r.ok) await fetchStatus();
    } catch (e) {
      console.error(e);
    } finally {
      setSubmitting(false);
    }
  }

  if (!isOpen) return null;

  return (
    <AnimatePresence>
      <motion.div
        initial={{ opacity: 0 }}
        animate={{ opacity: 1 }}
        exit={{ opacity: 0 }}
        className="fixed inset-0 z-[300] flex items-center justify-center bg-black/50 p-4"
        onClick={onClose}
      >
        <motion.div
          initial={{ scale: 0.95, y: 10 }}
          animate={{ scale: 1, y: 0 }}
          onClick={(e) => e.stopPropagation()}
          className="relative w-full max-w-md overflow-hidden rounded-2xl border border-slate-200 bg-white shadow-xl dark:border-slate-700 dark:bg-slate-900"
        >
          {/* Header */}
          <div className="border-b border-slate-200 bg-gradient-to-r from-blue-50 to-emerald-50 px-5 py-4 dark:border-slate-800 dark:from-blue-950/30 dark:to-emerald-950/30">
            <div className="flex items-center gap-3">
              <div className="flex h-10 w-10 items-center justify-center rounded-xl bg-gradient-to-br from-blue-500 to-emerald-500 text-white">
                <Globe size={20} />
              </div>
              <div>
                <h3 className="text-base font-bold text-slate-900 dark:text-slate-50">
                  {t("dataset.title", "Đóng góp cho Khoa học Mở")}
                </h3>
                <p className="text-xs text-slate-600 dark:text-slate-400">
                  TDN-Waste-World · CC-BY-4.0
                </p>
              </div>
            </div>
          </div>

          <div className="max-h-[70vh] overflow-y-auto p-5">
            {loading ? (
              <div className="py-8 text-center text-sm text-slate-500">Đang tải...</div>
            ) : (
              <>
                {/* Status banner */}
                {status?.consentGiven && !status.revokedAt ? (
                  <div className="mb-4 flex items-start gap-2 rounded-lg border border-emerald-200 bg-emerald-50 p-3 dark:border-emerald-800/40 dark:bg-emerald-900/20">
                    <CheckCircle2 size={16} className="mt-0.5 text-emerald-600 dark:text-emerald-400" />
                    <div className="flex-1 text-xs text-emerald-800 dark:text-emerald-200">
                      <strong>Bạn đang đóng góp.</strong>
                      {status.consentDate && (
                        <span className="block text-emerald-700/80 dark:text-emerald-300/80">
                          Từ {new Date(status.consentDate).toLocaleDateString("vi-VN")}
                        </span>
                      )}
                    </div>
                  </div>
                ) : (
                  <div className="mb-4 flex items-start gap-2 rounded-lg border border-slate-200 bg-slate-50 p-3 dark:border-slate-700 dark:bg-slate-800/50">
                    <Shield size={16} className="mt-0.5 text-slate-500" />
                    <div className="text-xs text-slate-700 dark:text-slate-300">
                      Bạn chưa đóng góp. Ảnh chỉ dùng cho AI cá nhân, không xuất bản.
                    </div>
                  </div>
                )}

                {/* Personal stats */}
                {status && status.totalImages > 0 && (
                  <div className="mb-4 grid grid-cols-2 gap-2">
                    <div className="rounded-lg bg-slate-50 p-3 text-center dark:bg-slate-800/50">
                      <div className="text-xl font-bold text-blue-600 dark:text-blue-400">{status.totalImages}</div>
                      <div className="text-[10px] uppercase tracking-wider text-slate-500">Ảnh đã đóng góp</div>
                    </div>
                    <div className="rounded-lg bg-slate-50 p-3 text-center dark:bg-slate-800/50">
                      <div className="text-xl font-bold text-emerald-600 dark:text-emerald-400">{status.imagesInRelease}</div>
                      <div className="text-[10px] uppercase tracking-wider text-slate-500">Đã vào dataset thế giới</div>
                    </div>
                  </div>
                )}

                {/* Global stats */}
                {stats && (
                  <div className="mb-4 rounded-lg border border-slate-200 p-3 dark:border-slate-700">
                    <div className="mb-2 flex items-center gap-1.5 text-xs font-bold uppercase tracking-wider text-slate-500">
                      <Users size={12} /> Toàn cầu (90 ngày)
                    </div>
                    <div className="grid grid-cols-3 gap-2 text-center">
                      <div>
                        <div className="text-sm font-bold text-slate-700 dark:text-slate-200">{stats.unique_contributors || 0}</div>
                        <div className="text-[9px] text-slate-500">Người đóng góp</div>
                      </div>
                      <div>
                        <div className="text-sm font-bold text-slate-700 dark:text-slate-200">{stats.unique_countries || 0}</div>
                        <div className="text-[9px] text-slate-500">Quốc gia</div>
                      </div>
                      <div>
                        <div className="text-sm font-bold text-slate-700 dark:text-slate-200">{stats.released_scans || 0}</div>
                        <div className="text-[9px] text-slate-500">Ảnh công khai</div>
                      </div>
                    </div>
                  </div>
                )}

                {/* What we collect */}
                <div className="mb-4 space-y-2 text-xs text-slate-600 dark:text-slate-400">
                  <p className="font-bold text-slate-800 dark:text-slate-200">Chúng tôi thu thập:</p>
                  <ul className="ml-4 space-y-1 list-disc">
                    <li>Ảnh rác (đã xóa EXIF: GPS, thông tin camera)</li>
                    <li>Phân loại dự đoán + điểm tin cậy</li>
                    <li>Điều kiện ánh sáng, mức che lấp (auto-detect)</li>
                  </ul>
                  <p className="mt-3 font-bold text-slate-800 dark:text-slate-200">Chúng tôi KHÔNG thu thập:</p>
                  <ul className="ml-4 space-y-1 list-disc">
                    <li>Tên thật, email, số điện thoại</li>
                    <li>Vị trí chính xác của bạn</li>
                    <li>Bất kỳ thông tin nhận dạng cá nhân nào</li>
                  </ul>
                </div>

                {/* Action buttons */}
                <div className="space-y-2">
                  {status?.consentGiven && !status.revokedAt ? (
                    <>
                      <button
                        onClick={revokeConsent}
                        disabled={submitting}
                        className="w-full rounded-lg border border-amber-300 bg-amber-50 px-4 py-2.5 text-sm font-bold text-amber-800 transition-colors hover:bg-amber-100 disabled:opacity-50 dark:border-amber-700 dark:bg-amber-900/30 dark:text-amber-200 dark:hover:bg-amber-900/50"
                      >
                        {submitting ? "Đang xử lý..." : "Thu hồi đồng ý (xóa khỏi dataset tương lai)"}
                      </button>
                      <a
                        href="https://osf.io"
                        target="_blank"
                        rel="noopener noreferrer"
                        className="flex w-full items-center justify-center gap-1.5 rounded-lg border border-slate-200 bg-white px-4 py-2 text-xs font-semibold text-slate-700 transition-colors hover:bg-slate-50 dark:border-slate-700 dark:bg-slate-800 dark:text-slate-300 dark:hover:bg-slate-700"
                      >
                        <Download size={12} /> Xem dataset đã phát hành trên OSF
                      </a>
                    </>
                  ) : (
                    <button
                      onClick={grantConsent}
                      disabled={submitting}
                      className="w-full rounded-lg bg-gradient-to-r from-blue-600 to-emerald-600 px-4 py-2.5 text-sm font-bold text-white shadow-sm transition-all hover:from-blue-700 hover:to-emerald-700 disabled:opacity-50"
                    >
                      {submitting ? "Đang xử lý..." : "Đồng ý đóng góp ảnh cho nghiên cứu khoa học mở"}
                    </button>
                  )}
                  <button
                    onClick={onClose}
                    className="w-full rounded-lg px-4 py-2 text-xs text-slate-500 transition-colors hover:bg-slate-50 dark:hover:bg-slate-800"
                  >
                    Đóng
                  </button>
                </div>
              </>
            )}
          </div>
        </motion.div>
      </motion.div>
    </AnimatePresence>
  );
}

export default ContributeToDataset;