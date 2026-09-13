import React from "react";
import { Badge, EmptyState } from "../../lib/ui";

const FIELD_LABELS: Readonly<Record<string, string>> = {
  accountId: "Mã tài khoản",
  account_id: "Mã tài khoản",
  userId: "Người dùng",
  user_id: "Người dùng",
  username: "Tên người dùng",
  nickname: "Biệt danh",
  profile: "Hồ sơ",
  totalUsers: "Tổng người dùng",
  total_users: "Tổng người dùng",
  totalEvents: "Tổng sự kiện",
  total_events: "Tổng sự kiện",
  totalInterventions: "Tổng can thiệp",
  total_interventions: "Tổng can thiệp",
  retention: "Tỷ lệ quay lại",
  retentionRate: "Tỷ lệ quay lại",
  retention_rate: "Tỷ lệ quay lại",
  personality: "Nhóm hành vi",
  personalityDistribution: "Phân bố nhóm hành vi",
  personality_distribution: "Phân bố nhóm hành vi",
  interventions: "Can thiệp",
  decay: "Suy giảm tương tác",
  createdAt: "Thời gian tạo",
  created_at: "Thời gian tạo",
  updatedAt: "Cập nhật lúc",
  updated_at: "Cập nhật lúc",
  status: "Trạng thái",
  score: "Điểm",
  count: "Số lượng",
};

function isRecord(value: unknown): value is Record<string, unknown> {
  return Boolean(value) && typeof value === "object" && !Array.isArray(value);
}

export function humanizeDataKey(key: string): string {
  if (FIELD_LABELS[key]) return FIELD_LABELS[key];
  const words = key
    .replace(/([a-z0-9])([A-Z])/g, "$1 $2")
    .replace(/[_-]+/g, " ")
    .trim();
  return words ? words.charAt(0).toUpperCase() + words.slice(1) : "Dữ liệu";
}

function formatDate(value: string): string | null {
  if (!/^\d{4}-\d{2}-\d{2}(?:T|$)/.test(value)) return null;
  const date = new Date(value);
  return Number.isNaN(date.getTime()) ? null : date.toLocaleString("vi-VN");
}

export function formatStructuredValue(value: unknown): string {
  if (value === null || value === undefined || value === "") return "Chưa có";
  if (typeof value === "boolean") return value ? "Có" : "Không";
  if (typeof value === "number") {
    return Number.isFinite(value)
      ? value.toLocaleString("vi-VN", { maximumFractionDigits: 3 })
      : "Không hợp lệ";
  }
  if (typeof value === "string") return formatDate(value) || value;
  if (Array.isArray(value)) return `${value.length.toLocaleString("vi-VN")} mục`;
  if (isRecord(value)) return `${Object.keys(value).length.toLocaleString("vi-VN")} trường`;
  return String(value);
}

export function summarizeStructuredData(value: unknown, limit = 3): string {
  if (!isRecord(value)) return formatStructuredValue(value);
  const entries = Object.entries(value).filter(([, item]) => item !== undefined);
  if (entries.length === 0) return "Không có chi tiết";
  const summary = entries
    .slice(0, limit)
    .map(([key, item]) => `${humanizeDataKey(key)}: ${formatStructuredValue(item)}`)
    .join(" · ");
  return entries.length > limit ? `${summary} · +${entries.length - limit} trường` : summary;
}

function PrimitiveValue({ value }: { value: unknown }) {
  if (typeof value === "boolean") {
    return <Badge tone={value ? "success" : "default"}>{value ? "Có" : "Không"}</Badge>;
  }
  return (
    <span className="break-words text-sm font-semibold text-slate-800">
      {formatStructuredValue(value)}
    </span>
  );
}

export function StructuredDataView({ data, depth = 0 }: { data: unknown; depth?: number }) {
  if (data === null || data === undefined) {
    return <EmptyState title="Chưa có dữ liệu" />;
  }

  if (Array.isArray(data)) {
    if (data.length === 0) return <EmptyState title="Chưa có dữ liệu" />;
    return (
      <div className="grid gap-2 sm:grid-cols-2">
        {data.slice(0, 50).map((item, index) => (
          <div key={index} className="rounded-xl border border-slate-200 bg-white p-3">
            <p className="mb-2 text-[10px] font-black uppercase tracking-wider text-slate-400">
              Mục {index + 1}
            </p>
            {isRecord(item) || Array.isArray(item) ? (
              <StructuredDataView data={item} depth={depth + 1} />
            ) : (
              <PrimitiveValue value={item} />
            )}
          </div>
        ))}
        {data.length > 50 && (
          <p className="col-span-full text-xs text-slate-500">
            Đang hiển thị 50/{data.length.toLocaleString("vi-VN")} mục.
          </p>
        )}
      </div>
    );
  }

  if (!isRecord(data)) return <PrimitiveValue value={data} />;
  const entries = Object.entries(data).filter(([, value]) => value !== undefined);
  if (entries.length === 0) return <EmptyState title="Chưa có dữ liệu" />;

  return (
    <dl className="grid gap-2 sm:grid-cols-2">
      {entries.map(([key, value]) => {
        const nested = isRecord(value) || Array.isArray(value);
        return (
          <div
            key={key}
            className={`${nested ? "sm:col-span-2" : ""} rounded-xl border border-slate-200 bg-slate-50/80 p-3`}
          >
            <dt className="text-[10px] font-black uppercase tracking-wider text-slate-500">
              {humanizeDataKey(key)}
            </dt>
            <dd className="mt-1">
              {nested && depth < 3 ? (
                <StructuredDataView data={value} depth={depth + 1} />
              ) : (
                <PrimitiveValue value={value} />
              )}
            </dd>
          </div>
        );
      })}
    </dl>
  );
}
