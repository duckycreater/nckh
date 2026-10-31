import React, { useCallback, useEffect, useState } from "react";
import { Check, GraduationCap, Loader2, PackageCheck, Plus, RotateCcw, X } from "lucide-react";
import type { SchoolClass } from "../../../shared/school";
import { currentSchoolYear } from "../../../shared/school";
import { getAuthHeaders } from "../../lib/auth";
import { Badge, Button, Card, EmptyState, FieldLabel, Input, SectionHeading } from "../../lib/ui";
import { showToast } from "../../lib/toast";

type RedemptionStatus = "pending" | "approved" | "fulfilled" | "cancelled";

interface RedemptionRecord {
  id: string;
  ownerNick: string;
  reward: { name: string; imageUrl?: string };
  recipient: { fullName: string; address: string };
  cost: number;
  status: RedemptionStatus;
  createdAt: number;
  refundedAt: number | null;
}

interface StudentProgress {
  accountId: string;
  nick: string;
  fullName: string | null;
  displayName: string;
  classId: string | null;
  profileComplete: boolean;
  profileVerificationStatus: "unverified" | "pending" | "verified" | "rejected" | "skipped";
  canEarnPoints: boolean;
  spendablePoints: number;
  lifetimeExperience: number;
  verifiedScans: number;
  disabled: boolean;
}

async function adminRequest<T>(path: string, init?: RequestInit): Promise<T> {
  const response = await fetch(path, {
    ...init,
    headers: {
      ...(init?.body ? { "Content-Type": "application/json" } : {}),
      ...getAuthHeaders(),
      ...init?.headers,
    },
  });
  const payload = (await response.json().catch(() => null)) as T & { error?: string };
  if (!response.ok) {
    throw new Error(payload?.error || "Không thể hoàn thành yêu cầu.");
  }
  return payload;
}

export function OperationsPanel() {
  const [classes, setClasses] = useState<SchoolClass[]>([]);
  const [students, setStudents] = useState<StudentProgress[]>([]);
  const [redemptions, setRedemptions] = useState<RedemptionRecord[]>([]);
  const [classFilter, setClassFilter] = useState("");
  const [loading, setLoading] = useState(true);
  const [busyId, setBusyId] = useState<string | null>(null);
  const [error, setError] = useState<string | null>(null);
  const [newClass, setNewClass] = useState({
    id: "",
    name: "",
    grade: 10,
    schoolYear: currentSchoolYear(),
  });

  const load = useCallback(async () => {
    setLoading(true);
    setError(null);
    try {
      const suffix = classFilter ? "?classId=" + encodeURIComponent(classFilter) : "";
      const [progressPayload, redemptionPayload] = await Promise.all([
        adminRequest<{ classes: SchoolClass[]; students: StudentProgress[] }>(
          "/api/admin/class-progress" + suffix,
        ),
        adminRequest<{ redemptions: RedemptionRecord[] }>("/api/admin/redemptions"),
      ]);
      setClasses(progressPayload.classes);
      setStudents(progressPayload.students);
      setRedemptions(redemptionPayload.redemptions);
    } catch (cause) {
      setError(cause instanceof Error ? cause.message : "Không tải được dữ liệu vận hành.");
    } finally {
      setLoading(false);
    }
  }, [classFilter]);

  useEffect(() => {
    void load();
  }, [load]);

  const saveClass = async (schoolClass: SchoolClass) => {
    setBusyId("class:" + schoolClass.id);
    try {
      await adminRequest("/api/admin/classes/" + encodeURIComponent(schoolClass.id), {
        method: "PUT",
        body: JSON.stringify(schoolClass),
      });
      showToast("Đã lưu lớp", schoolClass.name, "success");
      await load();
    } catch (cause) {
      showToast("Không thể lưu lớp", (cause as Error).message, "error");
    } finally {
      setBusyId(null);
    }
  };

  const createClass = async (event: React.FormEvent) => {
    event.preventDefault();
    const candidate: SchoolClass = {
      ...newClass,
      id: newClass.id.trim().toLowerCase(),
      name: newClass.name.trim(),
      active: true,
      sortOrder: newClass.grade * 100 + classes.length,
    };
    await saveClass(candidate);
    setNewClass((current) => ({ ...current, id: "", name: "" }));
  };

  const updateRedemption = async (id: string, status: RedemptionStatus) => {
    setBusyId("redemption:" + id);
    try {
      await adminRequest("/api/admin/redemptions/" + encodeURIComponent(id) + "/status", {
        method: "PATCH",
        body: JSON.stringify({ status }),
      });
      showToast(
        "Đã cập nhật đơn",
        "Trạng thái mới đã được lưu và thông báo cho học sinh.",
        "success",
      );
      await load();
    } catch (cause) {
      showToast("Không thể cập nhật đơn", (cause as Error).message, "error");
    } finally {
      setBusyId(null);
    }
  };

  const updateProfileVerification = async (
    student: StudentProgress,
    status: "verified" | "rejected",
  ) => {
    setBusyId("profile:" + student.accountId);
    try {
      const result = await adminRequest<{
        status: "verified" | "rejected";
        canEarnPoints: boolean;
      }>(
        "/api/admin/users/" + encodeURIComponent(student.accountId) + "/profile-verification",
        {
          method: "PATCH",
          body: JSON.stringify({
            status,
            reason: status === "rejected" ? "Thông tin họ tên hoặc lớp chưa khớp." : undefined,
          }),
        },
      );
      setStudents((current) =>
        current.map((candidate) =>
          candidate.accountId === student.accountId
            ? {
                ...candidate,
                profileVerificationStatus: result.status,
                canEarnPoints: result.canEarnPoints,
              }
            : candidate,
        ),
      );
      showToast(
        status === "verified" ? "Đã xác minh hồ sơ" : "Đã yêu cầu chỉnh sửa",
        student.fullName || student.displayName,
        "success",
      );
    } catch (cause) {
      showToast("Không thể cập nhật hồ sơ", (cause as Error).message, "error");
    } finally {
      setBusyId(null);
    }
  };

  if (loading && classes.length === 0 && redemptions.length === 0) {
    return (
      <Card className="flex min-h-64 items-center justify-center p-6">
        <Loader2 className="animate-spin text-emerald-700" />
      </Card>
    );
  }

  return (
    <div className="space-y-4">
      {error && (
        <Card className="border-red-200 bg-red-50 p-4 text-sm text-red-800">
          <p>{error}</p>
          <Button variant="ghost" size="sm" className="mt-3" onClick={() => void load()}>
            <RotateCcw size={14} /> Thử lại
          </Button>
        </Card>
      )}

      <Card className="p-5 sm:p-6">
        <SectionHeading
          title="Danh mục lớp"
          subtitle="Học sinh chỉ có thể chọn các lớp đang hoạt động trong danh mục này."
          action={<GraduationCap className="text-emerald-700" size={20} />}
        />
        <form onSubmit={createClass} className="mt-5 grid gap-3 md:grid-cols-5">
          <div>
            <FieldLabel htmlFor="class-id">Mã lớp</FieldLabel>
            <Input
              id="class-id"
              required
              pattern="[a-zA-Z0-9-]{3,40}"
              value={newClass.id}
              onChange={(event) =>
                setNewClass((current) => ({ ...current, id: event.target.value }))
              }
              placeholder="2026-10a4"
            />
          </div>
          <div>
            <FieldLabel htmlFor="class-name">Tên lớp</FieldLabel>
            <Input
              id="class-name"
              required
              value={newClass.name}
              onChange={(event) =>
                setNewClass((current) => ({ ...current, name: event.target.value }))
              }
              placeholder="10A4"
            />
          </div>
          <div>
            <FieldLabel htmlFor="class-grade">Khối</FieldLabel>
            <Input
              id="class-grade"
              type="number"
              min={1}
              max={12}
              required
              value={newClass.grade}
              onChange={(event) =>
                setNewClass((current) => ({ ...current, grade: Number(event.target.value) }))
              }
            />
          </div>
          <div>
            <FieldLabel htmlFor="school-year">Năm học</FieldLabel>
            <Input
              id="school-year"
              required
              pattern="\d{4}-\d{4}"
              value={newClass.schoolYear}
              onChange={(event) =>
                setNewClass((current) => ({ ...current, schoolYear: event.target.value }))
              }
            />
          </div>
          <Button type="submit" className="self-end" disabled={Boolean(busyId)}>
            <Plus size={15} /> Thêm lớp
          </Button>
        </form>
        <div className="mt-5 grid gap-2 sm:grid-cols-2 lg:grid-cols-3">
          {classes.map((schoolClass) => (
            <div
              key={schoolClass.id}
              className="flex min-h-16 items-center justify-between gap-3 rounded-[10px] border border-slate-200 p-3"
            >
              <div>
                <p className="font-semibold text-slate-950">{schoolClass.name}</p>
                <p className="mt-1 font-mono text-xs text-slate-500">
                  {schoolClass.id} · {schoolClass.schoolYear}
                </p>
              </div>
              <Button
                variant="ghost"
                size="sm"
                disabled={busyId === "class:" + schoolClass.id}
                onClick={() => void saveClass({ ...schoolClass, active: !schoolClass.active })}
              >
                {schoolClass.active ? <Check size={14} /> : <X size={14} />}
                {schoolClass.active ? "Đang mở" : "Đã đóng"}
              </Button>
            </div>
          ))}
        </div>
      </Card>

      <Card className="p-5 sm:p-6">
        <SectionHeading
          title="Tiến bộ theo lớp"
          subtitle="Chỉ hiển thị hoạt động được máy chủ xác nhận; số dư và kinh nghiệm được tách riêng."
          action={
            <select
              value={classFilter}
              onChange={(event) => setClassFilter(event.target.value)}
              className="min-h-11 rounded-[8px] border border-slate-200 bg-white px-3 text-sm"
              aria-label="Lọc học sinh theo lớp"
            >
              <option value="">Tất cả lớp</option>
              {classes.map((schoolClass) => (
                <option key={schoolClass.id} value={schoolClass.id}>
                  {schoolClass.name}
                </option>
              ))}
            </select>
          }
        />
        {students.length === 0 ? (
          <EmptyState
            title="Chưa có học sinh phù hợp"
            subtitle="Thử chọn lớp khác hoặc kiểm tra hồ sơ học sinh."
          />
        ) : (
          <div className="mt-5 overflow-x-auto">
            <table className="w-full min-w-[900px] text-left text-sm">
              <thead className="border-b border-slate-200 text-xs text-slate-500">
                <tr>
                  <th className="px-3 py-3 font-semibold">Học sinh</th>
                  <th className="px-3 py-3 font-semibold">Lớp</th>
                  <th className="px-3 py-3 font-semibold">Scan xác thực</th>
                  <th className="px-3 py-3 font-semibold">Kinh nghiệm</th>
                  <th className="px-3 py-3 font-semibold">Điểm tiêu được</th>
                  <th className="px-3 py-3 font-semibold">Hồ sơ</th>
                  <th className="px-3 py-3 font-semibold">Xác minh</th>
                </tr>
              </thead>
              <tbody className="divide-y divide-slate-100">
                {students.map((student) => (
                  <tr key={student.accountId}>
                    <td className="px-3 py-3">
                      <p className="font-semibold text-slate-950">
                        {student.fullName || student.displayName}
                      </p>
                      <p className="mt-1 text-xs text-slate-500">@{student.nick}</p>
                    </td>
                    <td className="px-3 py-3">
                      {classes.find((item) => item.id === student.classId)?.name || "Chưa chọn"}
                    </td>
                    <td className="px-3 py-3 font-mono">{student.verifiedScans}</td>
                    <td className="px-3 py-3 font-mono">{student.lifetimeExperience}</td>
                    <td className="px-3 py-3 font-mono">{student.spendablePoints}</td>
                    <td className="px-3 py-3">
                      <Badge tone={student.profileComplete ? "success" : "warning"}>
                        {student.profileComplete ? "Đầy đủ" : "Cần bổ sung"}
                      </Badge>
                    </td>
                    <td className="px-3 py-3">
                      <div className="flex flex-wrap items-center gap-2">
                        <Badge
                          tone={
                            student.profileVerificationStatus === "verified"
                              ? "success"
                              : student.profileVerificationStatus === "rejected"
                                ? "warning"
                                : "default"
                          }
                        >
                          {
                            {
                              verified: "Đã xác minh",
                              pending: "Chờ duyệt",
                              rejected: "Cần sửa",
                              skipped: "Đã bỏ qua",
                              unverified: "Chưa gửi",
                            }[student.profileVerificationStatus]
                          }
                        </Badge>
                        {student.profileComplete &&
                          student.profileVerificationStatus !== "verified" && (
                            <>
                              <Button
                                size="sm"
                                disabled={busyId === "profile:" + student.accountId}
                                onClick={() => void updateProfileVerification(student, "verified")}
                              >
                                <Check size={14} /> Duyệt
                              </Button>
                              <Button
                                size="sm"
                                variant="ghost"
                                disabled={busyId === "profile:" + student.accountId}
                                onClick={() => void updateProfileVerification(student, "rejected")}
                              >
                                <X size={14} /> Từ chối
                              </Button>
                            </>
                          )}
                      </div>
                    </td>
                  </tr>
                ))}
              </tbody>
            </table>
          </div>
        )}
      </Card>

      <Card className="p-5 sm:p-6">
        <SectionHeading
          title="Đơn đổi quà"
          subtitle="Duyệt, hoàn tất hoặc hủy đơn. Đơn bị hủy được hoàn điểm đúng một lần."
          action={<PackageCheck className="text-emerald-700" size={20} />}
        />
        {redemptions.length === 0 ? (
          <EmptyState
            title="Chưa có đơn đổi quà"
            subtitle="Các yêu cầu mới sẽ xuất hiện tại đây."
          />
        ) : (
          <div className="mt-5 space-y-3">
            {redemptions.map((redemption) => (
              <div
                key={redemption.id}
                className="grid gap-3 rounded-[10px] border border-slate-200 p-4 lg:grid-cols-[1fr_auto]"
              >
                <div className="min-w-0">
                  <div className="flex flex-wrap items-center gap-2">
                    <p className="font-semibold text-slate-950">{redemption.reward.name}</p>
                    <Badge
                      tone={
                        redemption.status === "fulfilled"
                          ? "success"
                          : redemption.status === "cancelled"
                            ? "warning"
                            : "default"
                      }
                    >
                      {redemption.status}
                    </Badge>
                  </div>
                  <p className="mt-2 text-sm text-slate-600">
                    {redemption.recipient.fullName} · {redemption.recipient.address}
                  </p>
                  <p className="mt-1 text-xs text-slate-500">
                    @{redemption.ownerNick} · {redemption.cost} điểm ·{" "}
                    {new Date(redemption.createdAt).toLocaleString("vi-VN")}
                  </p>
                </div>
                <div className="flex flex-wrap items-center gap-2">
                  {redemption.status === "pending" && (
                    <Button
                      size="sm"
                      disabled={busyId === "redemption:" + redemption.id}
                      onClick={() => void updateRedemption(redemption.id, "approved")}
                    >
                      Duyệt
                    </Button>
                  )}
                  {redemption.status === "approved" && (
                    <Button
                      size="sm"
                      disabled={busyId === "redemption:" + redemption.id}
                      onClick={() => void updateRedemption(redemption.id, "fulfilled")}
                    >
                      Hoàn tất
                    </Button>
                  )}
                  {(redemption.status === "pending" || redemption.status === "approved") && (
                    <Button
                      variant="danger"
                      size="sm"
                      disabled={busyId === "redemption:" + redemption.id}
                      onClick={() => void updateRedemption(redemption.id, "cancelled")}
                    >
                      Hủy và hoàn điểm
                    </Button>
                  )}
                </div>
              </div>
            ))}
          </div>
        )}
      </Card>
    </div>
  );
}
