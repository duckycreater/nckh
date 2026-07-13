# Hướng dẫn dành cho quản trị viên

> Ngôn ngữ: tiếng Việt · Phiên bản: v0.1 · Thời gian đọc: ~20 phút

Trang này dành cho **quản trị viên hệ thống** (thường là giáo viên
Tin học hoặc IT support của trường) đang vận hành BMO ở quy mô
nhiều lớp / nhiều trường.

## 1. Cài đặt lần đầu

Xem [`../DEPLOYMENT.md`](../DEPLOYMENT.md) — tóm tắt 5 bước:

```bash
git clone <repo>
cd bmo-robot
cp .env.example .env  # rồi điền key thật
npm install
npm run dev   # dev server
# hoặc
npm run build && npm start  # production
```

Biến môi trường quan trọng (`SECURITY.md` liệt kê đầy đủ):

| Biến | Bắt buộc | Ghi chú |
| ---- | -------- | ------- |
| `ADMIN_API_KEY` | ✓ | Đổi ngay sau khi clone. 32 byte hex. |
| `SUPABASE_URL` + `SUPABASE_SERVICE_ROLE_KEY` | tuỳ chọn | Cần cho nhiều-lớp |
| `GEMINI_API_KEY` | tuỳ chọn | Cho chế độ "cải thiện AI bằng Gemini" |
| `CORS_ORIGINS` | ✓ | Domain phân tách bằng dấu phẩy |
| `VITE_API_PROXY` | dev | Trỏ vào API server khi test trên điện thoại |

## 2. Bảng điều khiển quản trị (Admin Dashboard)

Đăng nhập với tài khoản có `ADMIN_API_KEY`:

```bash
curl -H "x-admin-key: $ADMIN_API_KEY" https://bmo/api/admin/stats
```

Giao diện web ở `/admin` (role admin) cho phép:

- **Cây sức khỏe hệ thống**: CPU, RAM, queue FL, latency.
- **Audit timeline**: ai đã làm gì trong 30 ngày gần nhất.
- **Federated training**: xem ai đang contribute, ai bị cắt vì
  gradient quá lớn.
- **Privacy Dashboard**: (ε, δ) budget per cohort, tổng số ảnh đã
  gom được tuần này.
- **Manage quiz, models, rewards, character cards**.

![Bảng điều khiển quản trị](../public/admin-dashboard.png)
*Hình 1: Dashboard quản trị.*

## 3. Quản lý câu đố (Quiz)

API:

- `POST /api/quiz/create` — tạo câu đố.
- `GET  /api/quiz/list` — liệt kê (paginated).
- `POST /api/quiz/sync-sheet` — đồng bộ Google Sheet.

Ngân hàng câu hỏi mặc định ở `server/quizDb.ts`. Để thêm câu hỏi:

```ts
import { addQuestion } from "./quizDb.js";
addQuestion({
  category: "plastic",
  difficulty: 2,
  prompt: "Chai nhựa có thể tái chế thành gì?",
  options: ["Ghế nhựa", "Thùng rác", "Cả hai", "Không tái chế được"],
  answerIndex: 2,
  locale: "vi",
});
```

## 4. Đồng bộ Google Sheets

Mỗi sự kiện (quét, quiz, đổi quà) được ghi vào Sheet để giáo viên /
phụ huynh xem lại mà không cần tài khoản BMO. Sheet ID cấu hình qua
`GOOGLE_SPREADSHEET_ID`. Format:

| ts                  | nick | event  | points | source |
| ------------------- | ---- | ------ | ------ | ------ |
| 2026-07-08T09:23Z   | lan  | scan   | 50     | offline → online |

Để cấp quyền cho Sheet: dùng service account
(`GOOGLE_SERVICE_ACCOUNT`) chia sẻ Sheet như "Editor".

## 5. Backup & phục hồi

Supabase tự động backup hàng đêm (Plan Free giữ 7 ngày). Bản backup
cục bộ:

```bash
pg_dump $DATABASE_URL > backup-$(date +%F).sql
```

Phục hồi:

```bash
psql $DATABASE_URL < backup-2026-07-08.sql
```

## 6. Bảo trì

- **Cập nhật mô hình**: xem `docs/adr/0001-on-device-first.md`. Mỗi
  release gắn SHA256 trong `modelRegistry.ts`. Cập nhật chỉ phát hành
  khi SHA256 đã verify thành công trên thiết bị của ≥ 10 học sinh.
- **Rotate secrets**: xem `SECURITY.md`.
- **Tăng giới hạn rate-limit**: chỉnh `RL_*` env vars (mặc định đã vừa
  đủ cho 200 user đồng thời).

## 7. Khi có sự cố

- **Mất model** (caches bị xóa): users tự động tải lại từ CDN.
- **DP budget vượt**: server gửi warning đến `/api/admin/stats`; BMO
  tự ngừng training và đợi admin phê duyệt reset budget.
- **Federated aggregator treo**: xem logs `/api/audit/feed` (SSE); kill
  & restart với `npm run restart:fl-server`.