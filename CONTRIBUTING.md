# Contributing to TDN-Waste-World

Cảm ơn bạn đã quan tâm đến việc đóng góp cho **TDN-Waste-World** — dataset mở phục vụ nghiên cứu khoa học toàn cầu về phân loại rác.

## Cách đóng góp đơn giản nhất (qua app BMO)

1. Mở ứng dụng **BMO Robot** trên web/app
2. Vào **Cài đặt** → tab **Quyền riêng tư & Dữ liệu**
3. Bật **"Đóng góp cho Khoa học Mở"**
4. Tiếp tục quét rác như bình thường — ảnh sẽ tự động được đưa vào pipeline

### Bạn đồng ý chia sẻ gì?
- Ảnh phân loại rác (đã xóa EXIF)
- Phân loại dự đoán + điểm tin cậy
- Điều kiện ánh sáng, mức che lấp (auto-detect)

### Bạn KHÔNG chia sẻ gì?
- Tên thật, email, số điện thoại
- Vị trí chính xác
- Bất kỳ thông tin nhận dạng cá nhân nào

## Đóng góp nâng cao (qua GitHub)

Nếu bạn là researcher muốn contribute trực tiếp:

```bash
git clone https://github.com/duckycreater/nckh
cd nckh
pip install -r scripts/requirements.txt  # osfclient, requests, python-dotenv
```

### Submit một batch ảnh

1. Chuẩn bị ảnh JPG 224×224, tổ chức theo folder category:
   ```
   my_batch/
   ├── plastic/
   ├── paper/
   ├── glass/
   ├── metal/
   ├── organic/
   └── hazard/
   ```
2. Tạo file `my_batch/manifest.csv`:
   ```csv
   filename,category,lighting,occlusion,notes
   img001.jpg,plastic,normal,none,
   img002.jpg,paper,bright,partial,vỏ hộp sữa
   ```
3. Submit PR hoặc liên hệ qua GitHub Issues.

## Quy trình review

Mọi ảnh trước khi vào dataset chính thức đều qua:

```
[1] AI auto-label (Gemini 2.5 Flash)
        ↓
[2] AI cross-check (Groq Llama-3.3-70B)
        ↓ disagreement hoặc confidence < 0.70
[3] Human curator review
        ↓ approve
[4] Released trong version tiếp theo của dataset
```

## Quyền thu hồi

Bạn có thể thu hồi đồng ý **bất kỳ lúc nào**:
- Qua app: **Cài đặt** → **Quyền riêng tư** → **Thu hồi**
- Qua email: gửi yêu cầu tới project maintainer

Sau khi thu hồi, ảnh của bạn sẽ bị ẩn khỏi các bản phát hành tương lai.

## Bản quyền

Bằng việc đóng góp, bạn đồng ý phát hành ảnh dưới **CC-BY-4.0** — cho phép mọi người sử dụng (kể cả thương mại) với điều kiện ghi công bạn.

## License cho code contributions

Code contributions to BMO Robot project: **MIT License**

## Liên hệ

- GitHub Issues: https://github.com/duckycreater/nckh/issues
- Email: [project email]

Cảm ơn bạn đã giúp thế giới xanh hơn! 🌍