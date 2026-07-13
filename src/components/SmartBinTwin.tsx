import React, { useEffect, useMemo, useState } from "react";
import { motion } from "framer-motion";
import { TrendingUp, Truck, BarChart2, AlertTriangle } from "lucide-react";
import { useTranslation } from "react-i18next";

export interface SmartBinTwinProps {
  emulatorUrl?: string;
  refreshSeconds?: number;
}

interface KpiData {
  binsOnline: number;
  totalKg: number;
  co2KgSaved: number;
  binsOffline: number;
  binsByKind: Record<string, number>;
}

interface ForecastBucket {
  hour: number;
  predictedKg: number;
  weekday: number;
}

interface BinRow {
  deviceId: string;
  location: string;
  totalKg: number;
  isOnline: boolean;
  kind: string;
}

interface RouteRow {
  vehicleId: string;
  binIds: string[];
  loadKg: number;
  driveMinutes: number;
}

interface SchoolFootprint {
  schoolId: string;
  totalKg: number;
  co2Kg: number;
}

interface TwinPayload {
  kpis: KpiData;
  forecast: ForecastBucket[];
  routes: RouteRow[];
  bins: BinRow[];
  schoolFootprint: SchoolFootprint[];
}

const DEFAULTS: TwinPayload = {
  kpis: {
    binsOnline: 0,
    totalKg: 0,
    co2KgSaved: 0,
    binsOffline: 0,
    binsByKind: {},
  },
  forecast: [],
  routes: [],
  bins: [],
  schoolFootprint: [],
};

const ACCENT = {
  plastic: "#3b82f6",
  paper: "#a16207",
  glass: "#0ea5e9",
  metal: "#64748b",
  organic: "#16a34a",
  hazard: "#dc2626",
};

export const SmartBinTwin: React.FC<SmartBinTwinProps> = ({
  emulatorUrl = "/api/twin",
  refreshSeconds = 30,
}) => {
  const [data, setData] = useState<TwinPayload>(DEFAULTS);
  const [loading, setLoading] = useState(true);
  const [lastUpdated, setLastUpdated] = useState<Date | null>(null);

  useEffect(() => {
    let cancelled = false;
    const fetchOnce = async () => {
      try {
        const r = await fetch(emulatorUrl);
        if (!r.ok) throw new Error(`Twin fetch failed: ${r.status}`);
        const json = (await r.json()) as TwinPayload;
        if (!cancelled) {
          setData(json);
          setLastUpdated(new Date());
        }
      } catch {
        // Even on failure, we leave the previous state; downstream UI doesn't crash.
      } finally {
        if (!cancelled) setLoading(false);
      }
    };
    fetchOnce();
    const id = setInterval(fetchOnce, refreshSeconds * 1000);
    return () => {
      cancelled = true;
      clearInterval(id);
    };
  }, [emulatorUrl, refreshSeconds]);

  const sortedForecast = useMemo(
    () => [...data.forecast].sort((a, b) => a.hour - b.hour),
    [data.forecast]
  );

  return (
    <div className="w-full space-y-4 rounded-3xl border border-slate-200 bg-white p-6 shadow-sm dark:border-slate-700 dark:bg-slate-900">
      <header className="flex items-center justify-between">
        <div>
          <h2 className="text-xl font-semibold tracking-tight text-slate-900 dark:text-white">
            Smart Bin Digital Twin
          </h2>
          <p className="text-xs text-slate-500 dark:text-slate-400">
            {lastUpdated ? `Last refresh ${lastUpdated.toLocaleTimeString()}` : "Connecting..."}
            {loading ? " · loading" : ""}
          </p>
        </div>
        <span className="rounded-full bg-emerald-100 px-3 py-1 text-xs font-mono text-emerald-700">
          Live
        </span>
      </header>

      <KpiStrip kpis={data.kpis} />

      <div className="grid gap-4 lg:grid-cols-2">
        <DemandForecast forecast={sortedForecast} />
        <SchoolFootprintPanel footprint={data.schoolFootprint} />
      </div>

      <CollectionRoute routes={data.routes} />
      <BinTable bins={data.bins} />
    </div>
  );
};

// ─── KPI strip ───────────────────────────────────────────────────────────

const KpiStrip: React.FC<{ kpis: KpiData }> = ({ kpis }) => {
  const { t } = useTranslation();
  const tiles = [
    { icon: <TrendingUp className="h-5 w-5" />, label: t("smartBin.kpis.binsOnline"), value: kpis.binsOnline, accent: "#0ea5e9" },
    { icon: <AlertTriangle className="h-5 w-5" />, label: t("smartBin.kpis.offline"), value: kpis.binsOffline, accent: "#dc2626" },
    { icon: <BarChart2 className="h-5 w-5" />, label: t("smartBin.kpis.totalKg"), value: kpis.totalKg.toFixed(1), accent: "#16a34a" },
    { icon: <Truck className="h-5 w-5" />, label: t("smartBin.kpis.co2KgSaved"), value: kpis.co2KgSaved.toFixed(2), accent: "#a16207" },
  ];
  return (
    <div className="grid grid-cols-2 gap-3 md:grid-cols-4">
      {tiles.map((t) => (
        <div
          key={t.label}
          className="flex items-center gap-3 rounded-2xl border border-slate-200 bg-slate-50 p-3 dark:border-slate-700 dark:bg-slate-800"
        >
          <div className="rounded-full bg-white p-2 shadow-sm dark:bg-slate-900" style={{ color: t.accent }}>
            {t.icon}
          </div>
          <div>
            <p className="text-xs text-slate-500 dark:text-slate-400">{t.label}</p>
            <p className="text-lg font-bold text-slate-900 dark:text-white">{t.value}</p>
          </div>
        </div>
      ))}
    </div>
  );
};

// ─── Demand forecast ─────────────────────────────────────────────────────

const DemandForecast: React.FC<{ forecast: ForecastBucket[] }> = ({ forecast }) => {
  const { t } = useTranslation();
  const max = Math.max(1, ...forecast.map((b) => b.predictedKg));
  return (
    <div className="rounded-2xl border border-slate-200 bg-white p-4 dark:border-slate-700 dark:bg-slate-800">
      <p className="text-sm font-semibold text-slate-700 dark:text-slate-200">{t("smartBin.forecast")}</p>
      <div className="mt-3 flex h-32 items-end gap-1">
        {forecast.map((bucket, i) => (
          <div key={i} className="flex-1 rounded-t-sm" style={{ backgroundColor: ACCENT.plastic, height: `${(bucket.predictedKg / max) * 100}%` }} title={`${bucket.hour}:00 — ${bucket.predictedKg.toFixed(2)} kg`} />
        ))}
      </div>
      <div className="mt-2 flex justify-between text-[10px] text-slate-500">
        <span>{t("smartBin.hourLabels.0")}</span><span>{t("smartBin.hourLabels.6")}</span><span>{t("smartBin.hourLabels.12")}</span><span>{t("smartBin.hourLabels.18")}</span><span>{t("smartBin.hourLabels.24")}</span>
      </div>
    </div>
  );
};

// ─── School footprint ───────────────────────────────────────────────────

const SchoolFootprintPanel: React.FC<{ footprint: SchoolFootprint[] }> = ({ footprint }) => {
  const max = Math.max(1, ...footprint.map((f) => f.totalKg));
  return (
    <div className="rounded-2xl border border-slate-200 bg-white p-4 dark:border-slate-700 dark:bg-slate-800">
      <p className="text-sm font-semibold text-slate-700 dark:text-slate-200">Per-school footprint</p>
      <div className="mt-3 space-y-2">
        {footprint.map((s) => (
          <div key={s.schoolId} className="flex items-center gap-3">
            <span className="w-24 text-xs font-mono text-slate-500">{s.schoolId}</span>
            <div className="h-3 flex-1 overflow-hidden rounded-full bg-slate-100 dark:bg-slate-700">
              <motion.div
                className="h-full bg-emerald-500"
                animate={{ width: `${(s.totalKg / max) * 100}%` }}
                transition={{ duration: 0.6, ease: "easeOut" }}
              />
            </div>
            <span className="w-16 text-right text-xs font-mono text-slate-700 dark:text-slate-300">
              {s.totalKg.toFixed(1)} kg
            </span>
          </div>
        ))}
      </div>
    </div>
  );
};

// ─── Collection route ───────────────────────────────────────────────────

const CollectionRoute: React.FC<{ routes: RouteRow[] }> = ({ routes }) => {
  return (
    <div className="rounded-2xl border border-slate-200 bg-white p-4 dark:border-slate-700 dark:bg-slate-800">
      <p className="text-sm font-semibold text-slate-700 dark:text-slate-200">Optimised Collection Routes</p>
      <div className="mt-3 grid gap-3 sm:grid-cols-2 lg:grid-cols-3">
        {routes.map((r) => (
          <div key={r.vehicleId} className="rounded-xl bg-slate-50 p-3 dark:bg-slate-900">
            <p className="text-xs font-semibold uppercase tracking-widest text-cyan-700">{r.vehicleId}</p>
            <p className="mt-1 text-sm font-bold text-slate-900 dark:text-white">
              {r.loadKg.toFixed(1)} kg · {r.driveMinutes.toFixed(0)} min
            </p>
            <p className="mt-1 line-clamp-2 text-[10px] font-mono text-slate-500">
              {r.binIds.slice(0, 6).join(", ")}{r.binIds.length > 6 ? ` +${r.binIds.length - 6} more` : ""}
            </p>
          </div>
        ))}
      </div>
    </div>
  );
};

// ─── Bin table ──────────────────────────────────────────────────────────

const BinTable: React.FC<{ bins: BinRow[] }> = ({ bins }) => {
  const sorted = useMemo(() => [...bins].sort((a, b) => b.totalKg - a.totalKg).slice(0, 12), [bins]);
  return (
    <div className="rounded-2xl border border-slate-200 bg-white p-4 dark:border-slate-700 dark:bg-slate-800">
      <p className="text-sm font-semibold text-slate-700 dark:text-slate-200">Top bins by load</p>
      <div className="mt-3 overflow-x-auto">
        <table className="w-full text-xs">
          <thead className="text-left text-[10px] uppercase text-slate-500">
            <tr>
              <th className="py-1">Device</th>
              <th>Kind</th>
              <th>Online</th>
              <th className="text-right">Total kg (last hour)</th>
            </tr>
          </thead>
          <tbody>
            {sorted.map((b) => (
              <tr key={b.deviceId} className="border-t border-slate-100 dark:border-slate-700">
                <td className="py-1 font-mono">{b.deviceId}</td>
                <td>{b.kind}</td>
                <td>
                  <span className={`inline-block h-2 w-2 rounded-full ${b.isOnline ? "bg-emerald-500" : "bg-red-500"}`} />
                </td>
                <td className="text-right font-mono">{b.totalKg.toFixed(2)}</td>
              </tr>
            ))}
          </tbody>
        </table>
      </div>
    </div>
  );
};

export default SmartBinTwin;