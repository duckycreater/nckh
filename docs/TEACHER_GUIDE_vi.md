# Hướng dẫn dành cho giáo viên

> Ngôn ngữ: tiếng Việt · Phiên bản: v0.1 · Thời gian đọc: ~15 phút

BMO hỗ trợ giáo viên tổ chức lớp học, theo dõi tiến bộ học sinh và
chạy **Chế độ Gia đình** (BMO khuyến khích cả gia đình phân loại
rác).

## 1. Đăng nhập giáo viên

1. Đăng ký tài khoản với vai trò **Giáo viên** tại
   [bmo.example.app](https://bmo.example.app).
2. Vào **Trang quản lý lớp** ở thanh bên trái.

## 2. Tạo lớp

1. **Tạo lớp** → nhập tên lớp (ví dụ: `4A1`) và khối (`4`).
2. Hệ thống cấp **mã mời 6 ký tự** (ví dụ: `K7P2QF`).
3. Chia sẻ mã này cho học sinh (in ra giấy hoặc đọc trong lớp).

![Trang quản lý lớp](../public/teacher-class.png)
*Hình 1: Trang quản lý lớp.*

## 3. Theo dõi học sinh

- **Bảng tiến bộ**: ai đã quét hôm nay, tuần này.
- **Bảng xếp hạng**: top 10 học sinh tích cực nhất (ẩn nếu phụ huynh
  yêu cầu).
- **Báo cáo tuần**: email PDF tự động gửi thứ Hai.

## 4. Chế độ Gia đình

Khi bật ở cài đặt lớp, **mỗi học sinh** có thể mời phụ huynh tham
gia. Phụ huynh dùng cùng 1 thiết bị — không cần tải app riêng.

| Tính năng                        | Học sinh | Phụ huynh |
| -------------------------------- | -------- | --------- |
| Quét rác cá nhân                 | ✓        | ✓         |
| Bảng xếp hạng gia đình          | ✓        | ✓         |
| Câu đố tuần (BMO gửi thứ Hai)    | ✓        | ✓         |
| Đổi quà "do phụ huynh duyệt"    | —        | ✓         |

## 5. Câu đố tuần (Quiz)

1. Vào **Câu đố** → **Tạo quiz tuần mới**.
2. Chọn 5-10 câu hỏi từ ngân hàng (`server/quizDb.ts`).
3. Hoặc viết câu hỏi riêng (Markdown hỗ trợ ảnh, công thức LaTeX).
4. Hẹn giờ phát: thứ Hai 7:00 hoặc bấm "Phát ngay".

Học sinh nhận **20-100 Lõi Năng Lượng** tuỳ độ khó. Báo cáo điểm
được tự động ghi vào `privacy_audit_log`.

## 6. Đồng bộ Google Sheets (tuỳ chọn)

Cấu hình `GOOGLE_SPREADSHEET_ID` trong `.env`. Mỗi lần có sự kiện
(quét, đổi quà, hoàn thành quiz), BMO tự động ghi 1 dòng mới vào
Google Sheet của lớp.

## 7. Câu hỏi thường gặp

**Q. Tôi muốn xóa dữ liệu một học sinh chuyển trường?**
A. Trang lớp → bấm vào học sinh → "Xóa tài khoản". Mọi dữ liệu
trong `users`, `research_events`, `privacy_audit_log` được xóa trong
24 giờ (kể cả trong Supabase backups).

**Q. Sao BMO chạy chậm trên Chromebook cũ?**
A. BMO tự phát hiện và bật "Lite Mode" (model 2 MB thay vì 6 MB) trên
máy có RAM < 2 GB. Có thể ép buộc bằng cách vào
`Settings → AI → Force Lite`.