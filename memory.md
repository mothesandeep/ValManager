# memory.md — Kasab Val Manager

**Purpose:** Living project state. Whoever (or whatever agent) picks this project up next reads this first. Update this file at the end of every work session — don't let it go stale.

---

## Current Status

- **Phase:** Phase 7 (Android Packaging & UX Hardening) complete; Phase 8 (Field Handoff & Observation Week in Surat) ready.
- **Verification & Test Suite:** 35 test files, 342 automated tests passing (`npm test --prefix app`), 0 TypeScript build errors (`npm run build --prefix app`).
- **Android APK:** Signed Android APK ready at root `./Kasab-Val-Manager.apk` (built via Capacitor 8).
- **Next action:** Deploy/install APK on Papa's Android phone in Surat for Phase 8 field observation.

---

## Project Summary

A digital operating system for Papa's Jari Kasab Val job-work business (Surat, Gujarat) — replacing loose paper challans and mental memory with an offline-first app tracking Parties, Inward Kasab receiving, Outward Val/Kali dispatches, Rola spool balances, Payments, Operating Expenses, and Reports, backed by Supabase PostgreSQL and automated GitHub Actions database backups.

---

## Key Decisions & Architecture

1. **Stack:** React 19 (`19.2.8`), Vite 8, TypeScript, Tailwind CSS v4, Supabase (PostgreSQL 15 + RLS), Capacitor 8 (Android), Dexie.js 4 (IndexedDB outbox), and Google GenAI SDK (`@google/genai`).
2. **Visual Design System:** Blue SaaS 2.0 (`Inter` typography, slate neutrals, `blue-600` primary, `green-700` positive, `red-700` due/alert) paired with true OLED Dark Mode (`#020617` canvas) and `tabular-nums` for all weights and currency numbers.
3. **Inward Receiving Workflow:** Common challan batch header with dynamic bag line items (`Bag 1`, `Bag 2`), whole-number grams input (e.g. `24500` g → `24.500 kg`), dynamic Rola spool tare deduction, Kasab color/twist tracking, and physical challan photo capture.
4. **Outward Dispatch Workflow:** Dual-mode workflow switching between **Val Delivery** (finished goods with Bungari cone tare deduction and billing rate computation) and **Kali** (empty Rola spool return tracking).
5. **Party Ledger (Khata):** Running balance computation (Total Billed − Total Received), running Rola spool inventory (Received − Returned), and configurable party-level tare overrides.
6. **AI Challan Scanner:** Mobile camera integration powered by Gemini Flash vision model to parse paper challans into pre-filled drafts with local offline persistence.
7. **Offline Outbox & Conflict Resolution:** Dexie.js mutation queue executing writes locally with zero network delay, auto-flushing upon reconnection with Last-Write-Wins (LWW) resolution based on `updated_at`.
8. **Three-Tier Deletion UX ("Galti-Proof"):**
   - *Tier 1:* Swipe-to-Trash on mobile list cards with haptic feedback and a 5-second `[Undo]` toast banner.
   - *Tier 2:* Danger Zone container in edit views with accessible WAI-ARIA `alertdialog` locking initial focus on Cancel.
   - *Tier 3:* In-app 30-day Soft Delete Trash Bin (`trashBinService.ts`) with category filters and 1-click domain restoration.
9. **Disaster Recovery & Backups:**
   - Nightly automated database dumps via GitHub Actions (`.github/workflows/daily-backup.yml`).
   - Local CLI administration scripts (`scripts/backup-db.mjs`, `scripts/restore-db.mjs`).
   - In-app "Oops" snapshot rollback in Settings.
10. **Application Security:** 4-digit App Lock PIN with idle timeout and biometric device authentication. Strict Supabase RLS policies preventing unauthorized data access.

---

## Resolved Architectural Decisions

1. **Authentication:** Implemented built-in 4-digit App Lock PIN (`AppLockContext`) with biometric unlock and inactivity timeout, securing the local device without requiring complex cloud multi-user infrastructure.
2. **Tare Defaults & Overrides:** Global defaults (125g Rola spool, 70g Bungri cone) configured in Settings, with custom per-party overrides stored in `parties.default_rola_weight_g` and `parties.default_bungari_weight_g`.
3. **Job-Work Pricing:** Default rates configured per party in `parties.default_rate`, automatically pre-filled on Outward dispatches with inline override support.
4. **Backup Redundancy:** Replaced initial Google Sheets webhook idea with automated nightly GitHub Actions database dumps, local JSON/SQL snapshot rollback scripts, and client-side soft delete retention.

---

## Session Log

| Date | Milestone / Event | Summary |
|---|---|---|
| 8 Sep 2026 | **Phases 1–3 & UI Revamp** | Connected Supabase, implemented all modules with real-time CRUD and balance calculations, verified build, and pushed to GitHub. |
| 8 Sep 2026 | **Receiving Grams Input Fix** | Updated Gross and Tare inputs to accept whole-number grams without manual decimal points with live `= X.XXX kg` preview. |
| 8 Sep 2026 | **Multi-Bag Inward Workflow** | Implemented batch challan header and dynamic Bori row list with auto-generated bag indices and batch totals. |
| 8 Sep 2026 | **Challan Grouping & Terminology** | Standardized UI terminology to "Bag" / "Bags", grouped tables visually by challan number with distinct borders. |
| 8 Sep 2026 | **Per-Bag Validation Guard** | Added mandatory Gross Weight and Rola Count validation with field blur tracking and save button protection. |
| 8 Sep 2026 | **Dispatch Val/Kali Workflow** | Implemented Val (finished goods billing) and Kali (empty rola return) modes with automatic Bungari deduction and live billing math. |
| 10 Sep 2026 | **Settings & Tare Overrides** | Added dedicated Settings module with global default weights and party-specific tare overrides. |
| 1 Nov 2026 | **System Testing & UX Hardening** | Completed 9 audit pillars: functional verification, offline sync collision handling, Android lifecycle, responsive layout, Supabase RLS security, daily backups, zero-friction flow, cross-device consistency, and data entry safeguards. Verified with 286 automated tests. |
| 1 Nov 2026 | **Web-Specific UX Checks (Milestone 10)** | Implemented desktop web ergonomics: `Ctrl+S`/`Cmd+S` save interception, `Esc` modal dismissal, accessible `:focus-visible` outlines, cursor indicators, and two-key shortcuts (`N+I`, `N+O`, `N+P`, `N+E`). 21 new tests added (307 total). |
| 1 Nov 2026 | **Android UX Checks (Milestone 11)** | Implemented one-handed thumb-zone layout, SpeedDial FAB, bottom navigation, and true OLED Dark Mode (`#020617` canvas). 11 new tests added (318 total). |
| 2 Nov 2026 | **Saved Data Deletion UX (Milestone 12)** | Built three deletion tiers: Swipe-to-Trash with 5s Undo banner, Danger Zone with WAI-ARIA alertdialog, and 30-day Soft Delete Trash Bin. 24 new tests added (342 total across 35 files). |
| 2 Nov 2026 | **Documentation Overhaul & Baseline Sync** | Updated all repository markdown documentation (`README.md`, `app/README.md`, `PRD.md`, `architecture.md`, `Phase.md`, `design.md`, `rules.md`, `agent.md`, `CONTRIBUTING.md`, templates) to reflect the complete production architecture, verified with 342 tests and clean build. |
