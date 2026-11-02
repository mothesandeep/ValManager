# Phase Plan & Delivery Milestones — Kasab Val Manager
**Version:** 2.0  
**Status:** Phases 0–7 Complete; Phase 8 (Field Observation) Ready

---

### Phase 0 — Project Setup & Baseline Infrastructure ✅
**Goal:** Establish a robust, deployable foundation with relational database and mobile packaging skeletons.
- [x] Configure Supabase project with PostgreSQL schema and Row-Level Security (RLS).
- [x] Set up React 19 + Vite 8 + TypeScript + Tailwind CSS v4 environment.
- [x] Configure Capacitor 8 for Android compilation.
- [x] Configure PWA manifest and service worker precaching.
- **Exit criteria:** Blank shell installable to Android home screen; Supabase tables connected and reachable. (PASSED)

---

### Phase 1 — Parties & Inward Receiving ✅
**Goal:** Replace paper Kasab receiving challans with automated multi-bag tare calculation.
- [x] Build Party Directory with name, phone, address, and market aliases.
- [x] Implement multi-bag batch receiving modal with automatic numbering (`Bag 1`, `Bag 2`).
- [x] Enable whole-number grams input (e.g. `24500` g → `24.500 kg`) without decimal point friction.
- [x] Dynamic Rola spool tare deduction with per-party configuration overrides.
- [x] Support physical challan camera capture and photo attachments.
- **Exit criteria:** Adding multi-bag receiving entries computes exact net Kasab weights and persists across device reboots. (PASSED)

---

### Phase 2 — Outward Dispatch (Val & Kali) ✅
**Goal:** Track finished goods delivery and spool return workflows with automated billing.
- [x] Dual-mode dispatch form: **Val Delivery** (finished goods) and **Kali** (empty Rola spools).
- [x] Automatic Bungari cone tare deduction (70g default or party override) from bore gross weight.
- [x] Dynamic job-work billing calculation (`Net Val Weight × Rate/kg`).
- [x] Challan-based table grouping with subheaders, totals, and per-bag edit/delete actions.
- **Exit criteria:** Dispatch entries compute net Val weight, total billing amount, and deduct spool counts accurately. (PASSED)

---

### Phase 3 — Party Khata, Payments & Operating Expenses ✅
**Goal:** Replace mental memory and loose notebooks with real-time financial ledgers.
- [x] Build Party Khata modal displaying detailed transaction ledger and net balance due.
- [x] Rola spool balance tracking (received vs. returned per party).
- [x] Payment collection logging (Cash, Bank Transfer, UPI, Cheque) with auto-balance adjustment.
- [x] Operating expense tracking across standard categories (Rent, Power, Maintenance, Oil, Transport).
- [x] Month-over-month (MoM) expense trend comparisons with percentage indicators.
- **Exit criteria:** Party cards show real-time Rola spool balances and financial receivables matching actual transactions. (PASSED)

---

### Phase 4 — Executive Dashboard & Reports ✅
**Goal:** Deliver instant operational insight without manual calculator work.
- [x] High-level KPI cards: Kasab Received, Val Dispatched, Gross Revenue, Net Profit.
- [x] Comprehensive Reports page with monthly filtering and custom date range pickers.
- [x] Party-wise profitability breakdown and top outstanding debtors.
- [x] Clean tabular export (JSON and CSV) for offline auditing.
- **Exit criteria:** Monthly aggregates in Reports match paper ledger spot-checks. (PASSED)

---

### Phase 5 — Offline-First Outbox & Conflict Resolution ✅
**Goal:** Enable 100% functionality without internet connectivity.
- [x] Integrate Dexie.js 4 (IndexedDB) as client-side mutation outbox.
- [x] Implement optimistic UI updates — writes commit locally in milliseconds with zero loading spinners.
- [x] Background sync manager that detects network reconnection and flushes pending mutations to Supabase.
- [x] Last-Write-Wins (LWW) timestamp conflict resolution (`updated_at`).
- [x] Real-time header sync indicator displaying network status and pending queue counts.
- **Exit criteria:** Disabling Wi-Fi/cellular allows uninterrupted record creation, editing, and deletion; changes sync seamlessly upon reconnection. (PASSED)

---

### Phase 6 — Automated Disaster Recovery & Backups ✅
**Goal:** Guarantee complete data survival outside of live cloud databases.
- [x] Automated nightly database backup workflow via GitHub Actions (`.github/workflows/daily-backup.yml`).
- [x] Standalone Node.js backup and restoration scripts (`scripts/backup-db.mjs`, `scripts/restore-db.mjs`).
- [x] In-app emergency snapshot rollback ("Oops" button) in Settings to undo accidental mass edits.
- [x] In-app 30-day Soft Delete Trash Bin (`trashBinService.ts`) preventing accidental permanent loss.
- **Exit criteria:** Daily backup dumps populate encrypted snapshots; restoration script successfully rebuilds state from snapshot. (PASSED)

---

### Phase 7 — Android Packaging, UX Hardening & 342 Tests ✅
**Goal:** Deliver a production-grade native Android app with robust ergonomics and zero defects.
- [x] Capacitor 8 Android compilation generating standalone APK binary (`Kasab-Val-Manager.apk`).
- [x] Native hardware integration: camera scanning, haptic feedback, status bar styling, and back-button handling.
- [x] Blue SaaS 2.0 visual system with true OLED Dark Mode (`#020617` canvas).
- [x] Thumb-zone mobile layout: SpeedDial FAB, bottom navigation, and sticky bottom drawers.
- [x] Desktop keyboard productivity: Command Palette (`Cmd+K`), shortcuts (`N+I`, `N+O`, `N+P`, `N+E`), `Ctrl+S` save interception.
- [x] Three-tier deletion UX: Swipe-to-Trash with 5-second Undo, Danger Zone with WAI-ARIA alertdialog, 30-day Trash Bin.
- [x] Built 35 Vitest test files with 342 tests passing across all edge cases and UI flows.
- **Exit criteria:** Signed APK compiles with zero errors; all 342 tests pass; flawless mobile and desktop operation. (PASSED)

---

### Phase 8 — Field Handoff & Observation Week in Surat (Current Phase) ⏳
**Goal:** Validate real-world adoption and solo-operator reliability with Papa in Surat, Gujarat.
1. Install `Kasab-Val-Manager.apk` on Papa's Android device.
2. Run parallel tracking for 7 business days alongside paper challans.
3. Daily 5-minute spot check comparing app totals against physical challans.
4. Verify offline queue synchronization after returns from low-connectivity factory visits.
5. Confirm Papa completes Inward and Outward entries solo without hesitation.
- **Exit criteria:** 7 consecutive days of 100% accurate entries, zero data discrepancies, and Papa's confidence operating solo.
