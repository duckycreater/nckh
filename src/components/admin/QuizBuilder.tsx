import React, { useState, useEffect } from "react";
import { Plus, Edit, Trash2, Save, X, Download, Upload, ListOrdered, Eye, EyeOff, GripVertical } from "lucide-react";
import { Button, Card, Badge, Input, TextArea, FieldLabel, ModalShell, ModalHeader, EmptyState, SectionHeading } from "../../lib/ui";
import { showToast } from "../../lib/toast";

export interface QuizQuestionUI {
  question_id: number;
  content: string;
  options: { key: "A" | "B" | "C" | "D"; text: string }[];
  correct_key: "A" | "B" | "C" | "D";
  points: number;
  category?: string;
  difficulty?: "easy" | "medium" | "hard";
  enabled: boolean;
  image_url?: string;
  order: number;
}

const token = () => localStorage.getItem("auth_token") || "";
const adminApiKey = (import.meta as any).env?.VITE_ADMIN_API_KEY || "";

const authHeaders = (): HeadersInit => ({
  "Content-Type": "application/json",
  Authorization: token() ? `Bearer ${token()}` : "",
  "x-admin-key": adminApiKey,
});

const EMPTY_QUESTION: Omit<QuizQuestionUI, "question_id"> = {
  content: "",
  options: [
    { key: "A", text: "" },
    { key: "B", text: "" },
    { key: "C", text: "" },
    { key: "D", text: "" },
  ],
  correct_key: "A",
  points: 10,
  category: "",
  difficulty: "medium",
  enabled: true,
  order: 0,
  image_url: "",
};

export function QuizBuilder() {
  const [questions, setQuestions] = useState<QuizQuestionUI[]>([]);
  const [loading, setLoading] = useState(false);
  const [editing, setEditing] = useState<QuizQuestionUI | null>(null);
  const [showAdd, setShowAdd] = useState(false);
  const [showImport, setShowImport] = useState(false);
  const [importText, setImportText] = useState("");
  const [previewQ, setPreviewQ] = useState<QuizQuestionUI | null>(null);
  const [filterCategory, setFilterCategory] = useState<string>("");

  const load = async () => {
    setLoading(true);
    try {
      const res = await fetch("/api/admin/quiz/questions", { headers: authHeaders() });
      if (!res.ok) throw new Error(`HTTP ${res.status}`);
      const data = await res.json();
      const qs = (data.questions || []).map((q: any) => ({
        question_id: q.question_id ?? q.id,
        content: q.content,
        options: q.options || [],
        correct_key: q.correct_key,
        points: q.points ?? 10,
        category: q.category,
        difficulty: q.difficulty,
        enabled: q.enabled !== false,
        image_url: q.image_url,
        order: q.order ?? q.question_id ?? 0,
      }));
      setQuestions(qs.sort((a: QuizQuestionUI, b: QuizQuestionUI) => a.order - b.order));
    } catch (e) {
      showToast("Lỗi tải câu hỏi", (e as Error).message, "error");
    } finally {
      setLoading(false);
    }
  };

  useEffect(() => {
    load();
  }, []);

  const handleSave = async (q: QuizQuestionUI, isNew: boolean) => {
    try {
      const url = isNew
        ? "/api/admin/quiz/questions"
        : `/api/admin/quiz/questions/${q.question_id}`;
      const method = isNew ? "POST" : "PUT";
      const res = await fetch(url, {
        method,
        headers: authHeaders(),
        body: JSON.stringify(q),
      });
      if (!res.ok) {
        const err = await res.text();
        throw new Error(err);
      }
      showToast("Đã lưu", isNew ? "Câu hỏi mới đã được thêm" : "Câu hỏi đã được cập nhật", "success");
      setEditing(null);
      setShowAdd(false);
      load();
    } catch (e) {
      showToast("Lỗi lưu", (e as Error).message, "error");
    }
  };

  const handleDelete = async (id: number) => {
    if (!confirm(`Xóa câu hỏi #${id}? Hành động này không thể hoàn tác.`)) return;
    try {
      const res = await fetch(`/api/admin/quiz/questions/${id}`, {
        method: "DELETE",
        headers: authHeaders(),
      });
      if (!res.ok) throw new Error(await res.text());
      showToast("Đã xóa", `Câu hỏi #${id} đã được xóa`, "success");
      load();
    } catch (e) {
      showToast("Lỗi xóa", (e as Error).message, "error");
    }
  };

  const handleToggle = async (q: QuizQuestionUI) => {
    const updated = { ...q, enabled: !q.enabled };
    try {
      const res = await fetch(`/api/admin/quiz/questions/${q.question_id}`, {
        method: "PUT",
        headers: authHeaders(),
        body: JSON.stringify({ enabled: updated.enabled }),
      });
      if (!res.ok) throw new Error(await res.text());
      load();
    } catch (e) {
      showToast("Lỗi", (e as Error).message, "error");
    }
  };

  const handleExport = async () => {
    try {
      const res = await fetch("/api/admin/quiz/questions/export", { headers: authHeaders() });
      if (!res.ok) throw new Error(await res.text());
      const blob = await res.blob();
      const url = URL.createObjectURL(blob);
      const a = document.createElement("a");
      a.href = url;
      a.download = `quiz-questions-${Date.now()}.json`;
      a.click();
      URL.revokeObjectURL(url);
      showToast("Đã xuất", "File JSON đã được tải xuống", "success");
    } catch (e) {
      showToast("Lỗi xuất", (e as Error).message, "error");
    }
  };

  const handleImport = async () => {
    try {
      const parsed = JSON.parse(importText);
      const arr = Array.isArray(parsed) ? parsed : parsed.questions || [];
      if (arr.length === 0) throw new Error("Không tìm thấy câu hỏi hợp lệ");
      const res = await fetch("/api/admin/quiz/questions/import", {
        method: "POST",
        headers: authHeaders(),
        body: JSON.stringify({ questions: arr }),
      });
      if (!res.ok) throw new Error(await res.text());
      const data = await res.json();
      showToast("Đã nhập", `${data.imported} câu hỏi đã được thêm`, "success");
      setShowImport(false);
      setImportText("");
      load();
    } catch (e) {
      showToast("Lỗi nhập", (e as Error).message, "error");
    }
  };

  const handleReorder = async (id: number, direction: "up" | "down") => {
    const idx = questions.findIndex((q) => q.question_id === id);
    if (idx === -1) return;
    if (direction === "up" && idx === 0) return;
    if (direction === "down" && idx === questions.length - 1) return;
    const newIdx = direction === "up" ? idx - 1 : idx + 1;
    const newArr = [...questions];
    [newArr[idx], newArr[newIdx]] = [newArr[newIdx], newArr[idx]];
    setQuestions(newArr);
    try {
      const res = await fetch("/api/admin/quiz/questions/reorder", {
        method: "POST",
        headers: authHeaders(),
        body: JSON.stringify({ orderedIds: newArr.map((q) => q.question_id) }),
      });
      if (!res.ok) throw new Error(await res.text());
      showToast("Đã sắp xếp", "Thứ tự câu hỏi đã được cập nhật", "success");
    } catch (e) {
      showToast("Lỗi", (e as Error).message, "error");
    }
  };

  const categories = Array.from(
    new Set(questions.map((q) => q.category).filter(Boolean) as string[]),
  );
  const filtered = filterCategory
    ? questions.filter((q) => q.category === filterCategory)
    : questions;

  return (
    <div className="space-y-4">
      <Card className="rounded-[28px] p-6">
        <SectionHeading
          eyebrow="Quiz Manager"
          title="Quản lý câu hỏi minigame"
          subtitle="Tạo, sửa, xóa câu hỏi. Dữ liệu lưu trong Supabase và tự động đồng bộ lên Google Sheets."
        />
        <div className="mt-4 flex flex-wrap gap-2">
          <Button onClick={() => setShowAdd(true)}>
            <Plus className="h-4 w-4" /> Thêm câu hỏi
          </Button>
          <Button onClick={handleExport} variant="secondary">
            <Download className="h-4 w-4" /> Xuất JSON
          </Button>
          <Button onClick={() => setShowImport(true)} variant="ghost">
            <Upload className="h-4 w-4" /> Nhập JSON
          </Button>
          {categories.length > 0 && (
            <select
              value={filterCategory}
              onChange={(e) => setFilterCategory(e.target.value)}
              className="rounded-full border border-slate-200 bg-white px-3 py-2 text-sm"
            >
              <option value="">Tất cả danh mục</option>
              {categories.map((c) => (
                <option key={c} value={c}>
                  {c}
                </option>
              ))}
            </select>
          )}
          <span className="ml-auto text-sm text-slate-500 self-center">
            Tổng: <strong>{questions.length}</strong> câu hỏi • Đang bật:{" "}
            <strong>{questions.filter((q) => q.enabled).length}</strong>
          </span>
        </div>
      </Card>

      <Card className="rounded-[28px] p-4">
        {loading ? (
          <div className="p-8 text-center text-slate-500">Đang tải...</div>
        ) : filtered.length === 0 ? (
          <EmptyState
            title="Chưa có câu hỏi nào"
            subtitle="Bấm Thêm câu hỏi để tạo câu hỏi đầu tiên cho minigame."
          />
        ) : (
          <div className="space-y-2">
            {filtered.map((q, idx) => (
              <div
                key={q.question_id}
                className="flex items-start gap-3 rounded-2xl border border-slate-100 bg-white p-3 hover:bg-slate-50"
              >
                <div className="flex flex-col items-center gap-1 pt-1">
                  <button
                    onClick={() => handleReorder(q.question_id, "up")}
                    disabled={idx === 0}
                    className="rounded p-1 hover:bg-slate-200 disabled:opacity-30"
                    title="Lên"
                  >
                    ▲
                  </button>
                  <GripVertical className="h-4 w-4 text-slate-300" />
                  <button
                    onClick={() => handleReorder(q.question_id, "down")}
                    disabled={idx === filtered.length - 1}
                    className="rounded p-1 hover:bg-slate-200 disabled:opacity-30"
                    title="Xuống"
                  >
                    ▼
                  </button>
                </div>
                <div className="flex-1 min-w-0">
                  <div className="flex items-center gap-2 flex-wrap">
                    <Badge tone={q.enabled ? "success" : "default"}>
                      #{q.question_id}
                    </Badge>
                    {q.category && <Badge tone="accent">{q.category}</Badge>}
                    {q.difficulty && (
                      <Badge tone={q.difficulty === "hard" ? "warning" : "default"}>
                        {q.difficulty}
                      </Badge>
                    )}
                    <span className="text-sm text-slate-500">{q.points} điểm</span>
                  </div>
                  <p className="mt-2 font-medium text-slate-800">{q.content}</p>
                  <div className="mt-2 grid grid-cols-2 gap-1 text-sm">
                    {q.options.map((o) => (
                      <div
                        key={o.key}
                        className={
                          "rounded-lg px-2 py-1 " +
                          (o.key === q.correct_key
                            ? "bg-emerald-50 text-emerald-800 font-semibold"
                            : "bg-slate-50 text-slate-600")
                        }
                      >
                        {o.key}. {o.text}
                      </div>
                    ))}
                  </div>
                </div>
                <div className="flex flex-col gap-1">
                  <button
                    onClick={() => handleToggle(q)}
                    className="rounded p-1.5 hover:bg-slate-200"
                    title={q.enabled ? "Tắt" : "Bật"}
                  >
                    {q.enabled ? (
                      <Eye className="h-4 w-4 text-emerald-600" />
                    ) : (
                      <EyeOff className="h-4 w-4 text-slate-400" />
                    )}
                  </button>
                  <button
                    onClick={() => setPreviewQ(q)}
                    className="rounded p-1.5 hover:bg-slate-200"
                    title="Xem trước"
                  >
                    <Eye className="h-4 w-4 text-blue-600" />
                  </button>
                  <button
                    onClick={() => setEditing(q)}
                    className="rounded p-1.5 hover:bg-slate-200"
                    title="Sửa"
                  >
                    <Edit className="h-4 w-4 text-amber-600" />
                  </button>
                  <button
                    onClick={() => handleDelete(q.question_id)}
                    className="rounded p-1.5 hover:bg-red-100"
                    title="Xóa"
                  >
                    <Trash2 className="h-4 w-4 text-red-600" />
                  </button>
                </div>
              </div>
            ))}
          </div>
        )}
      </Card>

      {(editing || showAdd) && (
        <QuestionForm
          initial={editing || { ...EMPTY_QUESTION, question_id: 0 }}
          isNew={showAdd}
          onSave={handleSave}
          onCancel={() => {
            setEditing(null);
            setShowAdd(false);
          }}
        />
      )}

      {showImport && (
        <ModalShell onClose={() => setShowImport(false)}>
          <ModalHeader title="Nhập câu hỏi từ JSON" onClose={() => setShowImport(false)} />
          <div className="p-6 space-y-3">
            <p className="text-sm text-slate-500">
              Dán JSON mảng câu hỏi hoặc object có key <code>questions</code>. Câu hỏi sẽ được merge theo{" "}
              <code>question_id</code>.
            </p>
            <TextArea
              rows={10}
              value={importText}
              onChange={(e) => setImportText(e.target.value)}
              placeholder='[{"content":"...","options":[...],"correct_key":"A","points":10}]'
            />
            <div className="flex justify-end gap-2">
              <Button variant="ghost" onClick={() => setShowImport(false)}>
                <X className="h-4 w-4" /> Hủy
              </Button>
              <Button onClick={handleImport}>
                <Upload className="h-4 w-4" /> Nhập
              </Button>
            </div>
          </div>
        </ModalShell>
      )}

      {previewQ && (
        <ModalShell onClose={() => setPreviewQ(null)}>
          <ModalHeader title="Xem trước" onClose={() => setPreviewQ(null)} />
          <div className="p-6">
            <p className="font-semibold text-lg mb-4">{previewQ.content}</p>
            <div className="space-y-2">
              {previewQ.options.map((o) => (
                <div
                  key={o.key}
                  className={
                    "rounded-2xl border p-3 " +
                    (o.key === previewQ.correct_key
                      ? "border-emerald-200 bg-emerald-50"
                      : "border-slate-200")
                  }
                >
                  <span className="font-bold mr-2">{o.key}.</span>
                  {o.text}
                  {o.key === previewQ.correct_key && (
                    <span className="ml-2 text-xs text-emerald-600">(đáp án đúng)</span>
                  )}
                </div>
              ))}
            </div>
          </div>
        </ModalShell>
      )}
    </div>
  );
}

function QuestionForm({
  initial,
  isNew,
  onSave,
  onCancel,
}: {
  initial: QuizQuestionUI;
  isNew: boolean;
  onSave: (q: QuizQuestionUI, isNew: boolean) => void;
  onCancel: () => void;
}) {
  const [q, setQ] = useState<QuizQuestionUI>(initial);

  const updateOption = (idx: number, text: string) => {
    const newOpts = [...q.options];
    newOpts[idx] = { ...newOpts[idx], text };
    setQ({ ...q, options: newOpts });
  };

  const handleSubmit = () => {
    if (!q.content.trim()) {
      showToast("Lỗi", "Vui lòng nhập nội dung câu hỏi", "error");
      return;
    }
    if (q.options.some((o) => !o.text.trim())) {
      showToast("Lỗi", "Vui lòng nhập đầy đủ 4 đáp án", "error");
      return;
    }
    onSave(q, isNew);
  };

  return (
    <ModalShell onClose={onCancel}>
      <ModalHeader
        title={isNew ? "Thêm câu hỏi mới" : `Sửa câu hỏi #${q.question_id}`}
        onClose={onCancel}
      />
      <div className="p-6 space-y-4 max-h-[80vh] overflow-y-auto">
        <div>
          <FieldLabel>Nội dung câu hỏi</FieldLabel>
          <TextArea
            rows={3}
            value={q.content}
            onChange={(e) => setQ({ ...q, content: e.target.value })}
            placeholder="Câu hỏi của bạn..."
          />
        </div>

        <div className="grid grid-cols-2 gap-3">
          <div>
            <FieldLabel>Điểm</FieldLabel>
            <Input
              type="number"
              value={q.points}
              onChange={(e) => setQ({ ...q, points: Number(e.target.value) || 10 })}
            />
          </div>
          <div>
            <FieldLabel>Đáp án đúng</FieldLabel>
            <select
              value={q.correct_key}
              onChange={(e) => setQ({ ...q, correct_key: e.target.value as "A" | "B" | "C" | "D" })}
              className="w-full rounded-xl border border-slate-200 bg-white px-3 py-2 text-sm"
            >
              {q.options.map((o) => (
                <option key={o.key} value={o.key}>
                  {o.key}. {o.text || "(trống)"}
                </option>
              ))}
            </select>
          </div>
          <div>
            <FieldLabel>Danh mục</FieldLabel>
            <Input
              value={q.category || ""}
              onChange={(e) => setQ({ ...q, category: e.target.value })}
              placeholder="VD: Môi trường, Tái chế..."
            />
          </div>
          <div>
            <FieldLabel>Độ khó</FieldLabel>
            <select
              value={q.difficulty || "medium"}
              onChange={(e) => setQ({ ...q, difficulty: e.target.value as any })}
              className="w-full rounded-xl border border-slate-200 bg-white px-3 py-2 text-sm"
            >
              <option value="easy">Dễ</option>
              <option value="medium">Trung bình</option>
              <option value="hard">Khó</option>
            </select>
          </div>
        </div>

        <div>
          <FieldLabel>4 đáp án</FieldLabel>
          <div className="space-y-2">
            {q.options.map((o, idx) => (
              <div key={o.key} className="flex items-center gap-2">
                <span className="font-bold w-6 text-center">{o.key}</span>
                <Input
                  value={o.text}
                  onChange={(e) => updateOption(idx, e.target.value)}
                  placeholder={`Đáp án ${o.key}`}
                />
              </div>
            ))}
          </div>
        </div>

        <div>
          <FieldLabel>URL hình ảnh (tùy chọn)</FieldLabel>
          <Input
            value={q.image_url || ""}
            onChange={(e) => setQ({ ...q, image_url: e.target.value })}
            placeholder="https://..."
          />
        </div>

        <label className="flex items-center gap-2">
          <input
            type="checkbox"
            checked={q.enabled}
            onChange={(e) => setQ({ ...q, enabled: e.target.checked })}
          />
          <span className="text-sm">Kích hoạt (cho học sinh thấy)</span>
        </label>

        <div className="flex justify-end gap-2 pt-2 border-t">
          <Button variant="ghost" onClick={onCancel}>
            <X className="h-4 w-4" /> Hủy
          </Button>
          <Button onClick={handleSubmit}>
            <Save className="h-4 w-4" /> {isNew ? "Tạo" : "Lưu"}
          </Button>
        </div>
      </div>
    </ModalShell>
  );
}
