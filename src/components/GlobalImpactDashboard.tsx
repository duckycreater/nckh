import React, { useEffect, useState } from "react";
import {
  AlertTriangle,
  BarChart3,
  BookOpenCheck,
  FlaskConical,
  Leaf,
  Recycle,
  ScanLine,
  Zap,
} from "lucide-react";
import { TrustPanel } from "./TrustPanel";
import { Card, EmptyState, SkeletonRow, StatusBadge } from "../lib/ui";
import type { WasteCategory } from "../../shared/materialCards";
import { MATERIAL_LABELS } from "./MaterialVisual";

const API_BASE = import.meta.env.VITE_API_BASE_URL || "";

interface ImpactSummary {
  totalScans: number;
  totalEstimatedKg: number;
  totalCo2KgSaved: number;
  totalTreesEquivalent: number;
  totalKwhSaved: number;
  byCategory: Record<
    string,
    {
      scans: number;
      estimatedKg: number;
      co2KgSaved: number;
      treesEquivalent: number;
      kwhSaved: number;
    }
  >;
  narrative: string;
  uniqueCountries?: number;
  uniqueContributors?: number;
}

const CATEGORIES = new Set<WasteCategory>([
  "plastic",
  "paper",
  "glass",
  "metal",
  "organic",
  "hazard",
]);

function isWasteCategory(value: string): value is WasteCategory {
  return CATEGORIES.has(value as WasteCategory);
}

export function GlobalImpactDashboard() {
  const [summary, setSummary] = useState<ImpactSummary | null>(null);
  const [loading, setLoading] = useState(true);
  const [unavailable, setUnavailable] = useState(false);
  const [cohort, setCohort] = useState("global");

  useEffect(() => {
    let active = true;
    setLoading(true);
    setUnavailable(false);
    void fetch(`${API_BASE}/api/impact/summary?cohort=${encodeURIComponent(cohort)}&sinceDays=90`)
      .then(async (response) => {
        if (!response.ok) throw new Error("impact_unavailable");
        return (await response.json()) as ImpactSummary;
      })
      .then((data) => {
        if (active) setSummary(data);
      })
      .catch(() => {
        if (active) {
          setSummary(null);
          setUnavailable(true);
        }
      })
      .finally(() => {
        if (active) setLoading(false);
      });
    return () => {
      active = false;
    };
  }, [cohort]);

  return (
    <main className="min-h-screen bg-[var(--background)] px-4 py-6 sm:px-6 sm:py-10">
      <div className="mx-auto max-w-6xl">
        <header className="overflow-hidden rounded-[14px] border border-white/10 bg-[var(--graphite)] text-white">
          <div className="scan-grid relative px-6 py-10 sm:px-10 sm:py-14">
            <div className="relative max-w-3xl">
              <h1 className="text-3xl font-semibold tracking-[-0.04em] sm:text-5xl">
                Báo cáo hoạt động vật liệu BMO
              </h1>
              <p className="mt-5 max-w-2xl text-sm leading-7 text-[#bdc7c1] sm:text-base">
                Tổng hợp lượt phân tích đã ghi nhận và các chỉ số quy đổi phục vụ nghiên cứu. Các
                chỉ số môi trường bên dưới là ước tính mô hình, không phải phép đo khối lượng hay
                bằng chứng vật thể đã được tái chế.
              </p>
              <div className="mt-6 flex flex-wrap gap-2">
                <StatusBadge tone="warning">Dữ liệu ước tính</StatusBadge>
                <StatusBadge tone="default">Cửa sổ 90 ngày</StatusBadge>
              </div>
            </div>
          </div>
        </header>

        <section className="mt-5 grid gap-4 lg:grid-cols-[1fr_auto] lg:items-center">
          <div className="flex gap-3 rounded-[10px] border border-amber-200 bg-amber-50 p-4 text-sm leading-6 text-amber-950">
            <AlertTriangle className="mt-0.5 shrink-0" size={18} />
            <p>
              <strong>Phạm vi diễn giải:</strong> lượt quét là sự kiện sử dụng hệ thống. Khối lượng,
              CO₂ và điện năng được suy ra từ hệ số quy đổi; không được dùng như số đo thực địa nếu
              chưa có cân đo và xác nhận thu gom độc lập.
            </p>
          </div>
          <div className="flex flex-wrap gap-1 rounded-[10px] border border-[var(--border-subtle)] bg-[var(--surface-muted)] p-1" aria-label="Bộ lọc nhóm nghiên cứu">
            {["global", "control", "exp_a", "exp_b", "exp_c"].map((value) => (
              <button
                key={value}
                type="button"
                onClick={() => setCohort(value)}
                className={`rounded-[8px] px-3 py-2 text-xs font-semibold transition-colors ${cohort === value ? "bg-[var(--graphite)] text-white" : "text-[var(--text-muted)] hover:text-[var(--graphite)]"}`}
              >
                {value === "global" ? "Tổng hợp" : value.toUpperCase()}
              </button>
            ))}
          </div>
        </section>

        {loading ? (
          <section className="mt-5 grid gap-3 sm:grid-cols-2 lg:grid-cols-4" aria-label="Đang tải báo cáo">
            {[0, 1, 2, 3].map((item) => <SkeletonRow key={item} className="h-32" />)}
          </section>
        ) : unavailable ? (
          <Card className="mt-5">
            <EmptyState
              icon={<BarChart3 size={24} />}
              title="Chưa có dữ liệu báo cáo"
              subtitle="Dữ liệu nghiên cứu hiện chưa sẵn sàng. Vui lòng quay lại sau."
            />
          </Card>
        ) : summary ? (
          <>
            <section className="mt-5 grid gap-3 sm:grid-cols-2 lg:grid-cols-4" aria-label="Chỉ số tổng hợp">
              <Metric icon={ScanLine} label="Lượt phân tích đã ghi nhận" value={summary.totalScans.toLocaleString("vi-VN")} direct />
              <Metric icon={Recycle} label="Khối lượng quy đổi" value={`${summary.totalEstimatedKg.toFixed(1)} kg`} />
              <Metric icon={Leaf} label="CO₂ quy đổi tránh phát thải" value={`${summary.totalCo2KgSaved.toFixed(1)} kg`} />
              <Metric icon={Zap} label="Điện năng quy đổi" value={`${summary.totalKwhSaved.toFixed(0)} kWh`} />
            </section>

            <section className="mt-5 rounded-[14px] border border-[var(--border-subtle)] bg-[var(--surface)] p-5 sm:p-6">
              <div className="flex flex-col gap-2 sm:flex-row sm:items-end sm:justify-between">
                <div>
                  <h2 className="text-xl font-semibold text-[var(--graphite)]">Phân bố theo nhóm vật liệu</h2>
                </div>
                <p className="text-xs text-[var(--text-muted)]">Khối lượng và CO₂ đều là giá trị quy đổi</p>
              </div>
              <div className="mt-5 grid gap-3 md:grid-cols-2 xl:grid-cols-3">
                {Object.entries(summary.byCategory).map(([category, data]) => {
                  const knownCategory = isWasteCategory(category) ? category : "metal";
                  return (
                    <article key={category} className="overflow-hidden rounded-[10px] border border-[var(--border-subtle)] bg-[var(--surface)]">
                      <div data-material={knownCategory} className={`material-pattern material-${knownCategory} flex min-h-24 items-end justify-between p-4 text-white`}>
                        <div>
                          <h3 className="font-semibold">{isWasteCategory(category) ? MATERIAL_LABELS[category] : category}</h3>
                        </div>
                        <span className="font-telemetry text-xl font-semibold">{data.scans.toLocaleString("vi-VN")}</span>
                      </div>
                      <dl className="grid grid-cols-2 divide-x divide-[var(--border-subtle)] border-t border-[var(--border-subtle)]">
                        <div className="p-3">
                          <dt className="text-[10px] uppercase tracking-wide text-[var(--text-muted)]">Khối lượng ước tính</dt>
                          <dd className="font-telemetry mt-1 text-sm font-semibold">{data.estimatedKg.toFixed(2)} kg</dd>
                        </div>
                        <div className="p-3">
                          <dt className="text-[10px] uppercase tracking-wide text-[var(--text-muted)]">CO₂ quy đổi</dt>
                          <dd className="font-telemetry mt-1 text-sm font-semibold">{data.co2KgSaved.toFixed(2)} kg</dd>
                        </div>
                      </dl>
                    </article>
                  );
                })}
              </div>
            </section>

            {summary.narrative && (
              <section className="mt-5 rounded-[14px] border border-[var(--border-subtle)] bg-[var(--surface)] p-5 sm:p-6">
                <h2 className="text-xl font-semibold">Tóm tắt từ dữ liệu quy đổi</h2>
                <p className="mt-3 max-w-4xl text-sm leading-7 text-[var(--text-muted)]">{summary.narrative}</p>
              </section>
            )}
          </>
        ) : null}

        <section className="mt-5 grid gap-4 lg:grid-cols-2">
          <Card padding="lg">
            <div className="flex items-center gap-3">
              <span className="grid h-10 w-10 place-items-center rounded-[8px] bg-[var(--primary-soft)] text-[var(--primary)]"><FlaskConical size={19} /></span>
              <div>
                <h2 className="text-lg font-semibold">Cách đọc số liệu</h2>
              </div>
            </div>
            <ul className="mt-4 space-y-3 text-sm leading-6 text-[var(--text-muted)]">
              <li>• Lượt phân tích là số sự kiện hệ thống ghi nhận trong phạm vi bộ lọc.</li>
              <li>• Các giá trị môi trường là phép nhân với hệ số mô hình tại thời điểm tạo báo cáo.</li>
              <li>• Không suy ra hành vi thu gom, tái chế thực tế hoặc tác động nhân quả từ một lượt quét.</li>
            </ul>
            <a href="/api/impact/sdg-report" target="_blank" rel="noreferrer" className="mt-5 inline-flex min-h-11 items-center justify-center gap-2 rounded-[10px] border border-[var(--border-strong)] bg-[var(--surface)] px-4 text-sm font-semibold text-[var(--text-secondary)] hover:border-[var(--graphite)] hover:text-[var(--graphite)]">
              <BookOpenCheck size={16} /> Tải dữ liệu báo cáo
            </a>
          </Card>
          <TrustPanel />
        </section>
      </div>
    </main>
  );
}

function Metric({
  icon: Icon,
  label,
  value,
  direct = false,
}: {
  icon: React.ComponentType<{ size?: number }>;
  label: string;
  value: string;
  direct?: boolean;
}) {
  return (
    <Card className="min-h-32">
      <div className="flex items-start justify-between gap-3">
        <span className="grid h-9 w-9 place-items-center rounded-[8px] bg-[var(--surface-muted)] text-[var(--primary)]"><Icon size={17} /></span>
        <StatusBadge tone={direct ? "success" : "warning"}>{direct ? "Ghi nhận" : "Ước tính"}</StatusBadge>
      </div>
      <p className="font-telemetry mt-5 text-2xl font-semibold text-[var(--graphite)]">{value}</p>
      <p className="mt-1 text-xs text-[var(--text-muted)]">{label}</p>
    </Card>
  );
}

export default GlobalImpactDashboard;
