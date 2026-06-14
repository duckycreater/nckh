import React, { useState, useEffect } from "react";
import { Save, RefreshCw, Clock, Settings as SettingsIcon, Calendar } from "lucide-react";
import { Button, Card, Badge, Input, FieldLabel, SectionHeading, TextArea } from "../../lib/ui";
import { showToast } from "../../lib/toast";

const token = () => localStorage.getItem("auth_token") || "";
const adminApiKey = (import.meta as any).env?.VITE_ADMIN_API_KEY || "";

const authHeaders = (): HeadersInit => ({
  "Content-Type": "application/json",
  Authorization: token() ? `Bearer ${token()}` : "",
  "x-admin-key": adminApiKey,
});

// Convert Date to DD/MM/YYYY HH:mm:ss
function toSheetDate(d: Date | null): string {
  if (!d) return "";
  const dd = String(d.getDate()).padStart(2, "0");
  const mm = String(d.getMonth() + 1).padStart(2, "0");
  const yy = d.getFullYear();
  const h = String(d.getHours()).padStart(2, "0");
  const m = String(d.getMinutes()).padStart(2, "0");
  const s = String(d.getSeconds()).padStart(2, "0");
  return `${dd}/${mm}/${yy} ${h}:${m}:${s}`;
}

function fromSheetDate(s: string): Date | null {
  if (!s) return null;
  const parts = s.split(" ");
  if (parts.length !== 2) return null;
  const [datePart, timePart] = parts;
  const [d, m, y] = datePart.split("/").map(Number);
  const [hr, min, sec] = timePart.split(":").map(Number);
  if (!d || !m || !y) return null;
  return new Date(y, m - 1, d, hr || 0, min || 0, sec || 0);
}

// Convert Date to datetime-local string
function toLocalInput(d: Date | null): string {
  if (!d) return "";
  const pad = (n: number) => String(n).padStart(2, "0");
  return `${d.getFullYear()}-${pad(d.getMonth() + 1)}-${pad(d.getDate())}T${pad(d.getHours())}:${pad(d.getMinutes())}`;
}

function fromLocalInput(s: string): Date | null {
  if (!s) return null;
  return new Date(s);
}

interface ConfigState {
  ThoiGianBatDau: string;
  ThoiGianKetThuc: string;
  ThoiGianCauHoi: number;
  SoCauHoiToiDa: number;
  DiemThuong: number;
  PhanThuongCombo: number;
  MoTa: string;
}

const DEFAULT_CONFIG: ConfigState = {
  ThoiGianBatDau: "",
  ThoiGianKetThuc: "",
  ThoiGianCauHoi: 120,
  SoCauHoiToiDa: 5,
  DiemThuong: 50,
  PhanThuongCombo: 5,
  MoTa: "Chào mừng bạn đến với minigame kiến thức môi trường!",
};

export function QuizConfigPanel() {
  const [config, setConfig] = useState<ConfigState>(DEFAULT_CONFIG);
  const [loading, setLoading] = useState(false);
  const [saving, setSaving] = useState(false);

  const load = async () => {
    setLoading(true);
    try {
      const res = await fetch("/api/admin/quiz/config", { headers: authHeaders() });
      if (!res.ok) throw new Error(`HTTP ${res.status}`);
      const data = await res.json();
      setConfig({
        ThoiGianBatDau: data.ThoiGianBatDau || "",
        ThoiGianKetThuc: data.ThoiGianKetThuc || "",
        ThoiGianCauHoi: Number(data.ThoiGianCauHoi) || 120,
        SoCauHoiToiDa: Number(data.SoCauHoiToiDa) || 5,
        DiemThuong: Number(data.DiemThuong) || 50,
        PhanThuongCombo: Number(data.PhanThuongCombo) || 5,
        MoTa: data.MoTa || DEFAULT_CONFIG.MoTa,
      });
    } catch (e) {
      showToast("Lỗi tải cấu hình", (e as Error).message, "error");
    } finally {
      setLoading(false);
    }
  };

  useEffect(() => {
    load();
  }, []);

  const save = async () => {
    setSaving(true);
    try {
      const payload = {
        ThoiGianBatDau: config.ThoiGianBatDau || null,
        ThoiGianKetThuc: config.ThoiGianKetThuc || null,
        ThoiGianCauHoi: Number(config.ThoiGianCauHoi),
        SoCauHoiToiDa: Number(config.SoCauHoiToiDa),
        DiemThuong: Number(config.DiemThuong),
        PhanThuongCombo: Number(config.PhanThuongCombo),
        MoTa: config.MoTa,
      };
      const res = await fetch("/api/admin/quiz/config", {
        method: "PUT",
        headers: authHeaders(),
        body: JSON.stringify(payload),
      });
      if (!res.ok) throw new Error(await res.text());
      showToast("Đã lưu", "Cấu hình minigame đã được cập nhật", "success");
    } catch (e) {
      showToast("Lỗi lưu", (e as Error).message, "error");
    } finally {
      setSaving(false);
    }
  };

  const startDate = fromSheetDate(config.ThoiGianBatDau);
  const endDate = fromSheetDate(config.ThoiGianKetThuc);

  return (
    <Card className="rounded-[28px] p-6">
      <SectionHeading
        eyebrow="Quiz Config"
        title="Cấu hình minigame"
        subtitle="Điều khiển thời gian mở/đóng, thời lượng, điểm thưởng và mô tả minigame."
        action={
          <Button onClick={load} variant="ghost" loading={loading}>
            <RefreshCw className="h-4 w-4" /> Tải lại
          </Button>
        }
      />

      <div className="mt-6 grid gap-4 sm:grid-cols-2">
        <div className="space-y-2">
          <FieldLabel>
            <Calendar className="h-4 w-4 inline mr-1" />
            Thời gian bắt đầu
          </FieldLabel>
          <Input
            type="datetime-local"
            value={toLocalInput(startDate)}
            onChange={(e) => {
              const d = fromLocalInput(e.target.value);
              setConfig({ ...config, ThoiGianBatDau: toSheetDate(d) });
            }}
          />
          {startDate && (
            <p className="text-xs text-slate-500">Sheet: {config.ThoiGianBatDau}</p>
          )}
        </div>

        <div className="space-y-2">
          <FieldLabel>
            <Calendar className="h-4 w-4 inline mr-1" />
            Thời gian kết thúc
          </FieldLabel>
          <Input
            type="datetime-local"
            value={toLocalInput(endDate)}
            onChange={(e) => {
              const d = fromLocalInput(e.target.value);
              setConfig({ ...config, ThoiGianKetThuc: toSheetDate(d) });
            }}
          />
          {endDate && (
            <p className="text-xs text-slate-500">Sheet: {config.ThoiGianKetThuc}</p>
          )}
        </div>

        <div className="space-y-2">
          <FieldLabel>
            <Clock className="h-4 w-4 inline mr-1" />
            Thời gian mỗi câu (giây)
          </FieldLabel>
          <Input
            type="number"
            min={10}
            max={600}
            value={config.ThoiGianCauHoi}
            onChange={(e) => setConfig({ ...config, ThoiGianCauHoi: Number(e.target.value) || 120 })}
          />
        </div>

        <div className="space-y-2">
          <FieldLabel>Số câu hỏi tối đa mỗi lượt</FieldLabel>
          <Input
            type="number"
            min={1}
            max={50}
            value={config.SoCauHoiToiDa}
            onChange={(e) => setConfig({ ...config, SoCauHoiToiDa: Number(e.target.value) || 5 })}
          />
        </div>

        <div className="space-y-2">
          <FieldLabel>Điểm thưởng tối đa</FieldLabel>
          <Input
            type="number"
            min={0}
            value={config.DiemThuong}
            onChange={(e) => setConfig({ ...config, DiemThuong: Number(e.target.value) || 0 })}
          />
        </div>

        <div className="space-y-2">
          <FieldLabel>Điểm combo (mỗi câu đúng liên tiếp)</FieldLabel>
          <Input
            type="number"
            min={0}
            value={config.PhanThuongCombo}
            onChange={(e) => setConfig({ ...config, PhanThuongCombo: Number(e.target.value) || 0 })}
          />
        </div>
      </div>

      <div className="mt-4 space-y-2">
        <FieldLabel>Mô tả hiển thị cho học sinh</FieldLabel>
        <TextArea
          rows={3}
          value={config.MoTa}
          onChange={(e) => setConfig({ ...config, MoTa: e.target.value })}
        />
      </div>

      <div className="mt-6 flex items-center gap-3">
        <Button onClick={save} loading={saving}>
          <Save className="h-4 w-4" /> Lưu cấu hình
        </Button>
        {startDate && endDate && (
          <Badge tone={Date.now() >= startDate.getTime() && Date.now() <= endDate.getTime() ? "success" : "warning"}>
            {Date.now() >= startDate.getTime() && Date.now() <= endDate.getTime()
              ? "Đang mở"
              : Date.now() < startDate.getTime()
                ? "Chưa mở"
                : "Đã đóng"}
          </Badge>
        )}
      </div>
    </Card>
  );
}
