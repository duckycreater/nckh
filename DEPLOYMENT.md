# Deployment & Testing Guide

**BMO Robot — CayGiaPha_NhanThuc "humanity breakthrough" version**
**Includes:** Edge AI, Federated Learning, Privacy, Family Mode, Public Waste AI dataset

---

## 1. Local development

### Prerequisites

- Node.js 20+ (`node --version`)
- npm 10+
- Python 3.10+ (chỉ cho microservices + release scripts)
- Git
- (Optional) Docker để chạy FL server + microservices
- (Optional) `osfclient` + `huggingface_hub` cho dataset releases

### 1.1. Clone & install

```bash
git clone https://github.com/duckycreater/nckh
cd nckh
npm install
```

Tạo file `.env` (xem `.env.example` nếu có):

```bash
# Required
SUPABASE_URL=https://your-project.supabase.co
SUPABASE_SERVICE_ROLE_KEY=eyJ...
GEMINI_API_KEY=AIza...
GROQ_API_KEY=gsk_...
ADMIN_API_KEY=choose-a-secure-random-string

# Optional (cho microservices)
VITE_FL_URL=http://localhost:8080
VITE_SNN_URL=http://localhost:8002
VITE_CAUSAL_URL=http://localhost:8001

# Optional (cho dataset contribution + release)
CLOUDINARY_CLOUD_NAME=...
CLOUDINARY_API_KEY=...
CLOUDINARY_API_SECRET=...
HF_TOKEN=hf_...
OSF_TOKEN=...
OSF_PROJECT_ID=...
```

### 1.2. Setup database

Mở Supabase SQL Editor → chạy tuần tự:

1. `supabase_schema.sql` (schema gốc)
2. `supabase/migrations/004_quiz_tables.sql`
3. `supabase/migrations/005_dataset_capture.sql` (Phase 1: dataset capture)
4. `supabase/migrations/006_family.sql` (Family Mode)

Hoặc từ CLI:

```bash
psql "$SUPABASE_DB_URL" -f supabase_schema.sql
psql "$SUPABASE_DB_URL" -f supabase/migrations/004_quiz_tables.sql
psql "$SUPABASE_DB_URL" -f supabase/migrations/005_dataset_capture.sql
psql "$SUPABASE_DB_URL" -f supabase/migrations/006_family.sql
```

### 1.3. Run dev server

```bash
npm run dev
# → Server: http://localhost:3000
# → Vite HMR: tự động
```

### 1.4. (Optional) Run microservices

Cần 4 terminal sessions:

```bash
# Terminal 1: Flask causal service
python causal-service/server.py

# Terminal 2: BindsNET SNN service
python snn-service/server.py

# Terminal 3: Flower FL server
python fl-server/server.py --rounds 100 --min-clients 2

# Terminal 4: Main app
npm run dev
```

---

## 2. Production build

### 2.1. Build

```bash
npm run build
# → dist/index.html + client assets
# → dist/server.cjs (Express server)
```

### 2.2. Run production

```bash
NODE_ENV=production node dist/server.cjs
# Listen on port 3000 (set PORT env to override)
```

---

## 3. Deployment options

### 3.1. Vercel / Netlify (frontend only)

```bash
# Vercel: just connect GitHub repo
# Build command: npm run build
# Output directory: dist
# ⚠️ Cần deploy server riêng (Render, Railway) vì Vercel không chạy Express cả ngày
```

### 3.2. Railway / Render (recommended — full stack)

```bash
# 1. Push code to GitHub
# 2. Connect GitHub repo on Railway/Render
# 3. Build command: npm run build
# 4. Start command: npm start (or `node dist/server.cjs`)
# 5. Add environment variables (see .env above)
# 6. Provision Postgres or use Supabase external
```

### 3.3. Docker

```dockerfile
# Dockerfile (tạo mới tại root)
FROM node:20-alpine
WORKDIR /app
COPY package*.json ./
RUN npm ci --omit=dev
COPY . .
RUN npm run build
EXPOSE 3000
CMD ["node", "dist/server.cjs"]
```

```bash
docker build -t bmo-robot:latest .
docker run -p 3000:3000 --env-file .env bmo-robot:latest
```

### 3.4. Self-hosted Raspberry Pi

```bash
# Build trên máy dev có đủ RAM
npm run build

# Copy dist/ + node_modules + package.json sang Pi
scp -r dist node_modules package.json pi@raspberrypi.local:/home/pi/bmo/

# Trên Pi:
cd /home/pi/bmo && node dist/server.cjs
```

Lưu ý Pi cần:
- Node 20 ARM64 binary (cài qua `nvm`)
- 2GB RAM trống (cho ONNX inference)
- Swap file 1GB nếu chỉ có 1GB RAM

### 3.5. Hugging Face Spaces (cho dataset / demo)

```bash
# Tạo Space mới (Streamlit hoặc Gradio)
# Mount dist/ + dataset card
# Cho phép community truy cập
```

---

## 4. Testing checklist

### 4.1. Functional tests

- [ ] **Auth**: Đăng ký → đăng nhập → đăng xuất
- [ ] **Vision scan**: Chụp ảnh → Gemini trả classification → lưu DB
- [ ] **Local ONNX**: Force model = onnx_waste_v1 → verify inference <500ms
- [ ] **Edge AI**: Click "edge" → verify WebGPU fallback
- [ ] **Quiz**: Làm bài → submit → lưu vào `quiz_attempts`
- [ ] **Reward**: Điểm earned → spend → balance updates
- [ ] **Gacha**: Roll → animation → card added
- [ ] **Streak**: Login liên tiếp → streak cập nhật
- [ ] **Leaderboard**: Hiển thị top 100
- [ ] **Family Mode**: Tạo family → mã mời → join → carbon stats
- [ ] **Dataset contribute**: Bật consent → scan → verify image + metadata saved
- [ ] **Privacy dashboard**: View audit log
- [ ] **Voice**: Nói vào mic → STT → reply
- [ ] **Federated** (nếu FL server running): verify round aggregation

### 4.2. Research data integrity

- [ ] **Behavioral events**: Mỗi action đều ghi `behavioral_events`
- [ ] **No PII in logs**: Grep CSV exports — chỉ có user_id, không có name/email
- [ ] **Survival analysis**: Run `replication/survival_analysis.py` không crash
- [ ] **Shapley decomposition**: Chạy `replication/shapley_decomposition.py`

### 4.3. Performance

- [ ] **Vision latency**: Median <2s cho Gemini path
- [ ] **ONNX latency**: Median <500ms Chrome desktop
- [ ] **DB queries**: <100ms cho leaderboard
- [ ] **Bundle size**: Main chunk <500KB gzipped (đã OK: 452KB)

### 4.4. Privacy / Security

- [ ] **Auth tokens**: TTL 7 days, không log raw token
- [ ] **Dataset contribution**: Bật consent → only consented scans released
- [ ] **Withdraw consent**: Verify all user's scans marked private
- [ ] **Differential privacy**: ε ≤ 1.0 mặc định trong federated updates
- [ ] **Admin routes**: require `x-admin-key` hoặc role check
- [ ] **Rate limiting**: `/api/scan-garbage` có timeout 30s
- [ ] **CSP headers**: Vite config inject
- [ ] **HTTPS only** in production (set `cookie.secure` flag)

### 4.5. Browser compatibility

| Browser | Status | Notes |
|---|---|---|
| Chrome 120+ | ✅ Full | WebGPU + WASM-SIMD đầy đủ |
| Edge 120+ | ✅ Full | Same as Chrome |
| Firefox 121+ | ⚠️ Partial | WebGPU behind flag |
| Safari 17+ | ⚠️ WASM only | No WebGPU; use TF.js fallback |
| Mobile Safari | ⚠️ Limited | Recommend app shell |

---

## 5. Monitoring & maintenance

### 5.1. Health check endpoint

```
GET /api/admin/system/health
Header: x-admin-key: <ADMIN_API_KEY>
→ Returns DB status, AI provider status, etc.
```

### 5.2. Logs

- App logs: stdout/stderr → ship to CloudWatch / Datadog / Grafana Loki
- DB queries: Supabase dashboard (hoặc enable pg_stat_statements)
- AI calls: Custom log trong `ai_scan_metrics`, gemini_usage trong `behavioral_events`

### 5.3. Backup

- Supabase: auto backup hàng ngày (free tier: 7 days retention)
- Cloudinary: redundant storage across regions
- TCN-Waste-World dataset: persistent trên OSF + Hugging Face (cả 2 chỗ)

### 5.4. Scheduled jobs

| Job | Interval | File |
|---|---|---|
| Google Sheets sync | 15 min | `server.ts:2846-2926` |
| Social PageRank | 1 hour | `server.ts:2847-2849` |
| Weekly reflections | Sun 20:00 | `server.ts:2852-2867` |
| FL aggregation | every 6 hours (nếu ≥10 clients) | `fl-server/server.py` |

---

## 6. Dataset release workflow

### 6.1. One-time setup

```bash
pip install osfclient huggingface_hub python-dotenv requests
export OSF_TOKEN=...
export HF_TOKEN=...
export OSF_PROJECT_ID=...  # Tạo project tại osf.io, copy GUID
```

### 6.2. Preview release (no upload)

```bash
python scripts/release_dataset.py --version v2.0 --dry-run
# → Build artifacts in dataset_release/v2.0/
# → Manually inspect manifest.csv + README.md
```

### 6.3. Release to OSF

```bash
python scripts/release_dataset.py --version v2.0
# → Tự động upload lên OSF, generate DOI link
```

### 6.4. Mirror to Hugging Face

```bash
python scripts/push_to_huggingface.py --dataset-id duckcreater/tcn-waste-world
# → Upload README + manifest + images (nếu không --dry-run)
```

### 6.5. Update DB

```sql
UPDATE ai_scan_metrics SET dataset_release_status = 'released'
WHERE dataset_release_status = 'curated' AND consent_to_release = TRUE;

INSERT INTO dataset_releases (version, doi, osf_project_id, total_images, released_at)
VALUES ('v2.0', '10.17605/OSF.IO/XXXXX', '...', 5234, NOW());
```

---

## 7. Federated learning operations

### 7.1. Start FL server

```bash
python fl-server/server.py \
  --rounds 50 \
  --min-clients 5 \
  --dp-epsilon 1.0 \
  --dp-delta 1e-5 \
  --address 0.0.0.0:8080
```

### 7.2. Client connection

Browser sẽ auto-poll `http://<FL_URL>/health` mỗi 60s.
Nếu nhận `200 OK` → submit update với clip norm 1.0.

### 7.3. Inspect round history

```bash
cat fl-server/round_history.json
# hoặc
psql ... -c "SELECT * FROM federated_rounds ORDER BY round_number DESC LIMIT 10;"
```

### 7.4. Roll back model

```bash
# Each round writes a snapshot to fl-server/snapshots/round_{N}.pt
# To roll back, run:
python fl-server/replay.py --from-round 42 --to-round 50
```

---

## 8. Production deployment (full checklist)

- [ ] Domain + DNS setup
- [ ] HTTPS certificate (Let's Encrypt / Cloudflare)
- [ ] Rate limiting (Cloudflare hoặc nginx)
- [ ] Error tracking (Sentry hoặc tương đương)
- [ ] Uptime monitoring (UptimeRobot / Cronitor)
- [ ] Backup verification (test restore từ Supabase snapshot)
- [ ] Environment variables audit (no secrets in Git)
- [ ] Privacy policy / ToS published
- [ ] DPIA (Data Protection Impact Assessment) — School context in Vietnam
- [ ] Parental consent flow verified (COPPA / GDPR-K)
- [ ] Dataset release policy: opt-in only, withdrawal respected
- [ ] License headers in source code: existing MIT, dataset CC-BY-4.0

---

## 9. Troubleshooting

| Issue | Check | Fix |
|---|---|---|
| `AI_TIMEOUT` on Gemini | network/VPN | Use ONNX local model |
| `exec_sql error: 401` | supabase key | rotate SUPABASE_SERVICE_ROLE_KEY |
| ONNX model not found | `public/models/` | copy from `training/` after training |
| Bundle size warning | check imports | dynamic import `onnxruntime-web` |
| FL server unreachable | firewall | open port 8080 |
| HF upload thất bại | HF_TOKEN invalid | regenerate tại settings/tokens |
| OSF upload thất bại | rate limit | retry with exponential backoff |
| Family invite code not working | case sensitivity | codes are always uppercase |

---

## 10. Support & escalation

- **Critical** (prod down, security incident): page on-call
- **High** (data loss, auth bypass): fix within 24h
- **Medium** (feature broken, perf regression): fix within 1 week
- **Low** (cosmetic, docs): backlog

Liên hệ: GitHub Issues → https://github.com/duckycreater/nckh/issues
