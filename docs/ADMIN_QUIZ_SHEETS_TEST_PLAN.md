# Manual Test Plan: Admin Quiz Builder + Google Sheets 3-Way Sync

This document walks an admin through the test cases for the new admin features shipped under the plan `admin_quiz_builder_&_sheets_3-way_sync`. Run it whenever the related code changes, or before each production release.

## Test environment

| Item             | Value                                                                                      |
| ---------------- | ------------------------------------------------------------------------------------------ |
| App URL          | `http://localhost:5173` (dev) / production domain                                         |
| Admin account    | Account with `role: "admin"` in Firestore                                                 |
| Env vars         | `VITE_ADMIN_API_KEY`, `GOOGLE_SPREADSHEET_ID`, Firebase + Supabase credentials             |
| Spreadsheet tabs | `Users`, `QuizQuestions`, `QuizConfig`, `Rewards`, `BehavioralEvents`, `SyncLog` (new)     |

---

## 1. Admin authentication

| #   | Test case                                                       | Expected                                                                              | Pass? |
| --- | --------------------------------------------------------------- | ------------------------------------------------------------------------------------- | ----- |
| 1.1 | Open `/admin` route with non-admin account                      | Login form / 403 message                                                              | ☐     |
| 1.2 | Open `/admin` with admin account                                | Dashboard renders with 8 tabs (Overview, Rewards, Users, Experiments, Quiz, Sheets, Research, System) | ☐     |
| 1.3 | Token expired                                                   | API calls return 401, dashboard shows a re-login banner                               | ☐     |

---

## 2. Quiz Manager tab (QuizBuilder + QuizConfigPanel)

### 2.1 List + filter

1. Click **Quiz** tab.
2. Expect: list of all quiz questions (enabled + disabled).
3. Toggle category dropdown — expect list to filter by category.
4. Click **Xem trước** on a question — modal shows the question + 4 options + correct answer.

### 2.2 Create a new question

1. Click **Thêm câu hỏi**.
2. Fill in: content, options A–D, correct key, points, difficulty.
3. Click **Lưu câu hỏi**.
4. Expect: toast "Đã lưu" + new row appears in list.
5. Reload page — question still present.
6. Open Supabase `quiz_questions` table — new row exists.
7. **Run sheets sync** — new row appears in `QuizQuestions` sheet.

### 2.3 Edit a question

1. Click edit icon on a question.
2. Change correct key from `A` → `B` and points 10 → 20.
3. Save.
4. Verify in Supabase + Sheets after sync.
5. Run minigame in the player app — modified question shows up.

### 2.4 Disable a question

1. Toggle `enabled` switch off.
2. Run minigame — disabled question must NOT appear in the list served by `getExamQuestions`.
3. Re-enable — must reappear.

### 2.5 Reorder

1. Drag (or use Up/Down) on at least 2 questions.
2. Save reorder.
3. Verify `order` column updates in Supabase.
4. Re-sync to Sheets — `order` column reflects new positions.

### 2.6 Import / Export

1. Click **Xuất JSON** — file downloads with current question set.
2. Click **Nhập JSON**, paste the file's content.
3. Expect: `Imported N questions` toast.
4. Click **Xuất CSV** — file downloads.
5. Click **Nhập CSV**, paste CSV content.
6. Expect: similar toast, no duplicate IDs.

### 2.7 Delete

1. Click trash icon on a question.
2. Confirm dialog.
3. Expect: question removed from Supabase, list, and (after sync) Sheets.

### 2.8 Quiz configuration

1. Scroll to **Cấu hình Quiz** sub-panel.
2. Set `ThoiGianCauHoi = 90` seconds, `SoCauHoiToiDa = 15`.
3. Save.
4. Reload — values persist.
5. Open Supabase `quiz_config` table — `ThoiGianCauHoi` and `SoCauHoiToiDa` rows present with the new values.
6. Sync to Sheets — `QuizConfig` sheet reflects values.

---

## 3. Sheets Sync tab (SheetsSyncPanel)

### 3.1 Health check

1. Click **Sheets** tab.
2. Expect three status rows: Firestore, Supabase, Google Sheets — all green ("Đã kết nối").

### 3.2 Full sync (2-way)

1. Edit a question in the **QuizQuestions** sheet directly (e.g. change `points` of row 1 from 10 → 99).
2. Back in app, click **Full Sync**.
3. Wait for `Đồng bộ thành công!` toast.
4. Reload app — quiz list shows `points = 99`.

### 3.3 Push to Sheets (1-way DB → Sheets)

1. In QuizBuilder, create a new question.
2. Click **Đẩy lên Sheets** in Sheets panel.
3. Open spreadsheet — new row appears in `QuizQuestions`.

### 3.4 Pull from Sheets (1-way Sheets → DB)

1. In spreadsheet, add a new row to `Rewards` (a fresh reward).
2. Back in app, click **Kéo từ Sheets**.
3. Open `/rewards` route — new reward visible.

### 3.5 Sync history

1. Run sync 3+ times.
2. Scroll to **Lịch sử đồng bộ** section.
3. Expect: each run appears with timestamp, status (success/failed), duration, rows written.

### 3.6 Conflict log

1. Manually edit a question in Sheets AND save the same question in the app within 5 seconds.
2. Trigger sync.
3. Expect: a row appears in **Xung đột** indicating which side won (use `updated_at`).
4. `updated_at` newer wins.

### 3.7 Auto-sync (15 min)

1. Note the current `lastSync` timestamp in the panel.
2. Wait 15 minutes (or temporarily set `AUTO_SYNC_INTERVAL_MS` to 60s in dev).
3. Reload panel — `lastSync` should update automatically.
4. Check server logs for `[AutoSync] ... Full sync completed`.

---

## 4. Research tab (ResearchPanel)

### 4.1 Overview

1. Click **Research** tab → **Overview** sub-tab.
2. Expect: total users, total events, avg session length, personality distribution chart.
3. Click **Xuất CSV** — file downloads with current overview data.

### 4.2 Retention

1. Click **Retention** sub-tab.
2. Expect: D1, D7, D30 retention numbers.
3. Export CSV.

### 4.3 Interventions

1. Click **Interventions** sub-tab.
2. Expect: list of recent interventions (timestamp, user, type, effectiveness).
3. If empty, click **Kích hoạt can thiệp** on a user with low engagement — new intervention appears.

### 4.4 Personality comparison

1. Click **Tính cách** sub-tab.
2. Expect: chart of personality clusters (e.g. completionist, socializer, achiever) and their engagement scores.

### 4.5 User lookup + decay

1. Enter a UID in the lookup box.
2. Click **Kích hoạt phát hiện decay**.
3. Expect: response contains engagement score + decay risk level.
4. Verify in Supabase `novelty_decay_log` table.

---

## 5. System tab (SystemPanel)

### 5.1 System health

1. Click **System** tab.
2. Expect: uptime (HH:MM:SS), memory usage, DB connection statuses.
3. Click **Kiểm tra kết nối** — refreshes statuses.

### 5.2 Audit log

1. Perform some admin actions in another tab (e.g. create + delete a quiz question).
2. Reload audit log.
3. Expect: rows for each action with `action`, `byUser`, `atTime`, `details`.

### 5.3 Cache management

1. Click **Xóa cache**.
2. Expect: toast + next quiz fetch hits DB (verify in server log: `[Cache] cleared`).

### 5.4 Backup / restore

1. Click **Sao lưu data.json** — file `data.backup.json` downloads (or copy saved on server).
2. Click **Khôi phục** — confirm dialog — `data.json` replaced with backup.
3. Verify in app that users state matches the backup.

### 5.5 Server logs

1. Scroll to **Server logs (100 dòng cuối)**.
2. Expect: a tail of recent `[AutoSync]`, `[Admin]`, `[Cache]` entries.

---

## 6. Cross-tab integration

| #   | Test case                                                                                       | Expected                                                                                              | Pass? |
| --- | ----------------------------------------------------------------------------------------------- | ----------------------------------------------------------------------------------------------------- | ----- |
| 6.1 | Edit a quiz question → open Sheets tab → click Full Sync → open Quiz tab                        | Edit is preserved (not overwritten by older DB version because `updated_at` is newer)                 | ☐     |
| 6.2 | Disable a question in app → wait 15 min auto-sync → check Sheets                                | Disabled question still shows `enabled = FALSE` in the sheet                                          | ☐     |
| 6.3 | Create user in app (registration) → wait 15 min auto-sync → check `Users` sheet                  | New user row appears with all fields                                                                  | ☐     |
| 6.4 | Admin B edits a question while Admin A is editing the same one — both save                       | Last save wins; conflict row recorded in Sheets panel                                                  | ☐     |
| 6.5 | Open admin dashboard on phone (responsive view)                                                 | Tabs collapse / scroll horizontally; no layout breaks                                                  | ☐     |

---

## 7. Edge cases & resilience

| #   | Scenario                                                                  | Expected                                                                                                            |
| --- | ------------------------------------------------------------------------- | ------------------------------------------------------------------------------------------------------------------- |
| 7.1 | Stop internet for 5 seconds during sync                                  | Sync fails gracefully; error logged in SyncLog; auto-sync retries next cycle                                       |
| 7.2 | Spreadsheet ID is invalid (typo)                                          | `Health check` shows red for Sheets; auto-sync skips that run and logs an error                                    |
| 7.3 | Quota exceeded (Google Sheets API 60 req/min/user)                       | Sync pauses; error surfaces in panel; exponential back-off in code (3 attempts)                                      |
| 7.4 | Server restart during sync                                                | Next auto-sync cycle picks up cleanly; partial writes are overwritten on next full sync                            |
| 7.5 | Supabase down, Firestore up                                               | `Supabase: Mất kết nối`; Sheets sync still pushes Firestore users; quiz list falls back to defaults                  |
| 7.6 | Concurrent edits on the same row (admin + Sheets)                        | Conflict resolution: row with newer `updated_at` wins; older row goes to conflict log                                |
| 7.7 | Quiz JSON import with duplicate IDs                                       | Import rejects duplicates and reports which ones were skipped                                                       |
| 7.8 | Quiz JSON import with malformed rows                                      | Import aborts with descriptive error; nothing is partially written                                                  |

---

## 8. Performance sanity

| #   | Test                                                                                   | Pass threshold                                              |
| --- | -------------------------------------------------------------------------------------- | ----------------------------------------------------------- |
| 8.1 | Load Quiz tab with 100 questions                                                       | First render < 500ms                                        |
| 8.2 | Full sync with 1,000 users + 100 questions + 50 rewards                                | Completes < 30s                                             |
| 8.3 | Auto-sync while app is being used                                                      | No noticeable UI jank; background fetch only                |
| 8.4 | Admin opens 8 tabs in sequence quickly                                                 | No memory leak (heap stays under 250MB)                     |

---

## 9. Security & authorization

| #   | Test                                                                       | Expected                                                                                       |
| --- | -------------------------------------------------------------------------- | ---------------------------------------------------------------------------------------------- |
| 9.1 | Non-admin user calls `GET /api/admin/quiz/questions` directly             | 401 / 403 response                                                                             |
| 9.2 | User without `VITE_ADMIN_API_KEY` makes admin call                        | 401 response; UI shows re-auth banner                                                          |
| 9.3 | Audit log records every quiz CRUD action with admin UID                   | Yes — visible in System tab                                                                    |
| 9.4 | CSV import of 10,000 rows                                                  | Rate limit kicks in (5 req/sec default); remaining rows queued                                |

---

## 10. Sign-off checklist

- [ ] All 2.x quiz tests pass.
- [ ] All 3.x sheets tests pass (auto-sync verified, conflicts logged).
- [ ] All 4.x research tests pass.
- [ ] All 5.x system tests pass.
- [ ] 6.x integration tests pass.
- [ ] 7.x edge cases handled.
- [ ] 8.x performance thresholds met.
- [ ] 9.x security checks pass.

Notes / known issues:

- _Add any caveats observed during testing here._
