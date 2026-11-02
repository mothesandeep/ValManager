# Kasab Val Manager (ValManager)

<div align="center">
  <h3>Professional, Offline-First Job-Work ERP for Metallic Yarn (Kasab) to Val/Dori Production</h3>
  <p>Tailored for sole-operator textile job-work units in Surat, Gujarat.</p>

  [![Vitest](https://img.shields.io/badge/Vitest-342%20Tests%20Passing-brightgreen.svg)](app)
  [![Vite](https://img.shields.io/badge/Vite-8.2-646CFF.svg)](https://vitejs.dev/)
  [![React](https://img.shields.io/badge/React-19.2-61DAFB.svg)](https://react.dev/)
  [![Capacitor](https://img.shields.io/badge/Capacitor-8.5%20(Android)-119EFF.svg)](https://capacitorjs.com/)
  [![Tailwind CSS](https://img.shields.io/badge/Tailwind-v4.3-38B2AC.svg)](https://tailwindcss.com/)
  [![Supabase](https://img.shields.io/badge/Supabase-PostgreSQL%20%2B%20RLS-3ECF8E.svg)](https://supabase.com/)
</div>

---

## 📖 Overview

**Kasab Val Manager** is an offline-first business management application and mobile ERP designed specifically for Kasab (metallic yarn) to Val/Dori ring doubler job-work operators. Built to replace loose paper challans, mental math, and lost records, it provides instant clarity over raw materials, finished dispatches, running party ledger balances (Khata), empty spool (Rola) returns, operating expenses, and monthly profitability.

Available as both a responsive web application and an installable native Android APK (`Kasab-Val-Manager.apk`).

---

## ✨ Key Features & Capabilities

### 1. Inward (Raw Material Receiving)
- **Multi-Bag / Multi-Bori Batch Entry:** Record multiple bags under a single party challan with automatic sequential numbering (`Bag 1`, `Bag 2`).
- **Grams-First Input:** Fast whole-number grams entry (e.g. `23535` g automatically formats to `23.535 kg`) without awkward decimal keys.
- **Dynamic Tare Deduction:** Configurable Rola spool tare weight (global 125g default, overridable per-party or per-bag) with automatic Net Kasab calculation.
- **Kasab Color & Twist Tracking:** Support for Gold, Silver, Pelmet, Water, Antique colors and S / Z twist types.
- **Photo Attachments:** Capture or attach physical challan photos using the camera or gallery, with offline draft recovery.

### 2. Outward (Finished Goods Dispatch & Spool Returns)
- **Val Delivery & Kali Returns:** Dedicated modes for finished Val dispatch (with billing) and Kali (empty Rola spool return).
- **Automated Bungri Tare:** Automatic deduction of Bungri cone weight (70g default or custom per-party) from gross bore weight.
- **Live Billing Calculation:** Dynamic computation of billing totals based on negotiated per-kg rates (`Net Val Weight × Rate/kg`).
- **Batch Challan Grouping:** Visual grouping by challan number with subheaders, totals, and per-bag edit/delete actions.

### 3. Party Khata & Ledger
- **Live Financial Balances:** Real-time tracking of total billed, total payments received, and net outstanding dues per party.
- **Rola Spool Inventory:** Real-time running balance of spools received vs. returned to prevent spool loss.
- **Party Weight Overrides:** Set default Rola (spool) and Bungri (cone) tare weights per party.
- **Search & Aliases:** Search parties by primary business name or common market aliases.

### 4. Financials & Operating Expenses
- **Payment Collection:** Log partial or full payments, cash/bank transfers, reference notes, and date of settlement.
- **Month-over-Month (MoM) Expenses:** Categorized tracking (Rent, Electricity, Machine Maintenance, Transport, Oil, Consumables, Wages) with mom-over-month trend comparison badges.
- **Profit & Loss Analytics:** Real-time net operating margin calculation (`Gross Revenue - Total Operating Expenses`).

### 5. AI Challan Scanner (Powered by Gemini)
- Snap a picture of a handwritten or printed paper challan.
- Powered by `@google/genai` (Gemini Flash) with client-side image compression.
- Automatically extracts Party Name, Challan Number, Date, Gross Weight, Rola Count, and line items into a pre-filled draft.

### 6. Offline-First Architecture
- **Dexie.js (IndexedDB) Outbox:** Full read and write capabilities with zero network connection. Writes land in local storage instantly with zero UI freezing.
- **Last-Write-Wins (LWW) Sync:** Resilient synchronization with Supabase PostgreSQL upon internet reconnection using high-resolution `updated_at` timestamps.
- **Sync Status Indicator:** Real-time header pill showing network state and unsynced mutation count.

### 7. Three-Tier Saved Data Deletion UX ("Galti-Proof")
- **Tier 1 (Swipe-to-Trash with Undo Banner):** Fluid swipe gestures on mobile with haptic feedback, instant visual deletion, and a 5-second floating `[Undo]` toast.
- **Tier 2 (The Danger Zone & WAI-ARIA Alertdialog):** Visually isolated danger container in edit views with explicit confirmation dialogs (`DestructiveConfirmDialog`) locking initial focus on Cancel.
- **Tier 3 (30-Day Soft Delete Trash Bin):** Deleted records are moved to an in-app Trash Bin with 30-day retention, category filters, and 1-click restore before hard purge.

### 8. Security & Data Protection
- **App Lock PIN:** 4-digit security PIN protection with biometric/device authentication support and configurable idle timeouts.
- **Strict Row-Level Security (RLS):** Supabase PostgreSQL policies restrict all reads and writes. Zero service-role keys exposed in client bundles.
- **Automated Backups:** Daily automated database backups via GitHub Actions (`.github/workflows/daily-backup.yml`) plus local snapshot backup/restore scripts (`scripts/backup-db.mjs`, `scripts/restore-db.mjs`).

### 9. Mobile & Desktop Ergonomics
- **Blue SaaS 2.0 Design System:** Clean slate neutrals, accessible blue accents, `Inter` typography with `tabular-nums` alignment, and OLED Dark Mode (`#020617` canvas).
- **Thumb-Zone Layout:** SpeedDial floating action button (FAB) reachable with one hand, bottom navigation, and sticky bottom action sheets.
- **Desktop Productivity:** Global Command Palette (`Cmd+K` / `Ctrl+K`), quick shortcuts (`N+I` for Inward, `N+O` for Outward, `N+P` for Payment, `N+E` for Expense), `Ctrl+S` quick save interception, and `Esc` dismissal.

---

## 🛠️ Tech Stack

| Layer | Technology | Details |
|---|---|---|
| **Frontend Framework** | React 19 + TypeScript | High performance, strict type safety |
| **Bundler & Build Tool** | Vite 8 + Rolldown | Lightning-fast HMR and optimized production chunks |
| **Styling** | Tailwind CSS v4 | Zero-runtime CSS with modern color tokens and dark mode |
| **Mobile Packaging** | Capacitor 8 (Android) | Native camera, haptics, status bar, and share intent receiver |
| **Local Database & Offline**| Dexie 4 (IndexedDB) | Client-side reactive outbox with optimistic UI updates |
| **Cloud Backend** | Supabase (PostgreSQL 15) | Relational database with strict RLS policies |
| **AI Vision Scanner** | Google GenAI SDK (`@google/genai`) | Gemini Flash vision parser for paper challans |
| **Animation & Gestures** | Framer Motion 14 | Fluid swipe-to-delete gestures and bottom sheets |
| **Icons** | Lucide React | Clean, consistent vector iconography |
| **Testing** | Vitest 4 | 35 test files, 342 automated unit and integration tests |
| **Linter** | Oxlint | Fast Rust-based linter |

---

## 📁 Repository Structure

```
Kasab-Val-Manager/
├── .github/
│   ├── workflows/daily-backup.yml    # Automated nightly database backup
│   ├── ISSUE_TEMPLATE/               # Bug report and feature request templates
│   └── PULL_REQUEST_TEMPLATE.md      # Pull request checklist
├── app/                              # Frontend web & Capacitor application
│   ├── android/                      # Native Android project configuration
│   ├── public/                       # Static assets, SVG icons, and web manifest
│   ├── src/
│   │   ├── app/                      # App router and top-level providers
│   │   ├── components/
│   │   │   ├── common/               # Shared atoms (Badge, Button, KpiCard, PullToRefresh)
│   │   │   ├── feedback/             # ActionSheet, DestructiveConfirmDialog, DangerZone
│   │   │   ├── layout/               # AppShell, BottomNavigation, SpeedDialFab, PageHeader
│   │   │   ├── preview/              # ChallanPrintModal, isolated iframe printer
│   │   │   ├── security/             # SecurityLockScreen, PinKeypad
│   │   │   └── sheets/               # BottomSheetModal, responsive drawers
│   │   ├── context/                  # AppLock, DataContext, MonthContext, ThemeContext, SyncContext
│   │   ├── features/                 # Modular domain slices
│   │   │   ├── billing/              # Billing calculation and challan invoice generation
│   │   │   ├── dashboard/            # KPI metrics, quick actions, zero-friction entry
│   │   │   ├── inward/               # Receiving bags, dynamic tare, bori calculations
│   │   │   ├── outward/              # Dispatching Val/Kali, bungari deduction, billing
│   │   │   ├── parties/              # Directory, Khata ledger modal, tare overrides
│   │   │   ├── reports/              # Monthly analytics, P&L, party profitability
│   │   │   ├── scanner/              # AI camera scanner, draft storage, crop/preview
│   │   │   └── settings/             # System tare preferences, trash bin, backup tools
│   │   ├── lib/
│   │   │   ├── api/                  # Supabase query clients (dispatch, receipts, parties, etc.)
│   │   │   ├── offline/              # Dexie database, outbox queue, sync collision engine
│   │   │   └── validation/           # Zod schema definitions and input validation
│   │   ├── services/                 # AI scanner service, auto-backup, app lock, trash bin
│   │   ├── tests/                    # Vitest suites (342 tests across 35 files)
│   │   └── utils/                    # Calculations, date, formatters, camera, haptics, deep links
│   ├── supabase/
│   │   └── migrations/               # PostgreSQL schema, RLS policies, triggers, storage
│   ├── package.json                  # App dependencies and scripts
│   └── vite.config.ts                # Vite 8 configuration with PWA and Tailwind plugins
├── backups/                          # Encrypted local database snapshot storage
├── scripts/
│   ├── backup-db.mjs                 # Node.js automated database backup utility
│   └── restore-db.mjs                # Node.js snapshot restoration and rollback utility
├── Kasab-Val-Manager.apk             # Compiled Android debug APK binary
├── architecture.md                   # System architecture and technical specifications
├── design.md                         # Blue SaaS 2.0 design tokens and UX standards
├── memory.md                         # Active project trajectory and audit milestones
├── Phase.md                          # Phase roadmaps and exit criteria verification
├── rules.md                          # Engineering standards and development conventions
├── PRD.md                            # Product Requirements Document (Version 2.0)
└── package.json                      # Workspace root scripts
```

---

## 🚀 Quick Start Guide

### Prerequisites
- **Node.js**: v18.0.0 or later (v20+ recommended)
- **npm**: v9 or later
- **Android Studio / JDK 17+** (only required if building the native Android APK)

### 1. Installation
Clone the repository and install root and app dependencies:

```bash
git clone https://github.com/mothesandeep/Kasab-Val-Manager.git
cd Kasab-Val-Manager
npm install --prefix app
```

### 2. Environment Configuration
Create a `.env.local` file inside the `app/` directory:

```bash
cp app/.env.example app/.env.local
```

Fill in your configuration keys:
```env
# Supabase Configuration
VITE_SUPABASE_URL=https://your-project.supabase.co
VITE_SUPABASE_ANON_KEY=your-anon-key

# Optional: Google Gemini API (for AI Challan Scanner)
VITE_GEMINI_API_KEY=your-gemini-api-key
```

### 3. Database Migration
Apply the PostgreSQL migrations located in `app/supabase/migrations/` using the Supabase CLI or SQL Editor:
- `20261022000001_complete_schema.sql` (Base schema, tables, views, RLS)
- `20261023000001_challan_images_storage.sql` (Challan photo storage bucket)
- `20261023000002_add_party_aliases.sql` (Party aliases index)
- `20261101000001_add_updated_at_and_lww.sql` (Last-Write-Wins timestamps)
- `20261101000002_enforce_strict_api_protection.sql` (Hardened RLS policies)

### 4. Development Server
Start the local Vite development server:

```bash
npm run dev --prefix app
```
The app will be available at `http://localhost:5173`.

---

## 🧪 Testing & Verification

The test suite runs with Vitest and covers calculation edge cases, offline sync collision handling, web shortcuts, Android UX checks, and security locks:

```bash
# Run all 342 automated tests
npm test --prefix app

# Run tests with coverage
npm test --prefix app -- --coverage

# Typecheck and production bundle build
npm run build --prefix app
```

---

## 📱 Android APK Compilation

The application is wrapped with Capacitor 8 for Android:

```bash
# Sync web build to Android project
npm run cap:sync --prefix app

# Build debug APK (outputs to ./Kasab-Val-Manager.apk)
npm run build:apk --prefix app

# Build release APK
npm run build:apk:release --prefix app
```

---

## 💾 Disaster Recovery & Backups

### Automated Backups
- GitHub Actions workflow (`daily-backup.yml`) automatically exports and commits database snapshots nightly.

### Manual CLI Backup & Restore
```bash
# Create an immediate database dump
npm run backup:db

# Restore database from a saved snapshot
npm run restore:db
```

### In-App Snapshots
The Settings page includes a one-click **"Oops" Snapshot Rollback** allowing the operator to revert unexpected data modifications instantly from local cache.

---

## 📄 License

This project is licensed under the MIT License - see the [LICENSE](LICENSE) file for details.
