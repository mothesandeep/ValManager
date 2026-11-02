# ValManager — Web & Mobile Frontend Client

The frontend client for **Kasab Val Manager**, an offline-first ERP designed for sole-operator Kasab (metallic yarn) to Val/Dori job-work businesses.

---

## 🛠️ Tech Stack & Dependencies

- **Framework**: React 19 (`19.2.8`) with TypeScript (`~6.0.2`)
- **Bundler**: Vite 8 (`8.2.2`) with `@vitejs/plugin-react`
- **Styling**: Tailwind CSS v4 (`4.3.3`) via `@tailwindcss/vite`
- **Mobile Container**: Capacitor 8 (`@capacitor/android`, `@capacitor/camera`, `@capacitor/haptics`, `@capacitor/share`, `@capacitor/status-bar`)
- **Offline Storage**: Dexie.js 4 (`4.4.6`) wrapping browser IndexedDB
- **Backend Client**: Supabase JS (`2.116.0`)
- **AI Scanner**: Google GenAI SDK (`@google/genai` 2.30.0)
- **Animation**: Framer Motion 14 (`14.6.0`)
- **Icons**: Lucide React (`1.42.0`)
- **Validation**: Zod 4 (`4.6.7`)
- **Testing**: Vitest 4 (`4.1.11`)

---

## 🚀 Setup & Development

### 1. Install Dependencies
```bash
npm install
```

### 2. Configure Environment
Create a `.env.local` file from `.env.example`:
```bash
cp .env.example .env.local
```

Required environment variables:
```env
VITE_SUPABASE_URL=https://your-project.supabase.co
VITE_SUPABASE_ANON_KEY=your-anon-key
VITE_GEMINI_API_KEY=your-gemini-api-key # Optional for AI Challan Scanner
```

### 3. Run Development Server
```bash
npm run dev
```
Accessible at `http://localhost:5173`.

### 4. Build for Production
Runs TypeScript project references typecheck followed by Vite production bundling:
```bash
npm run build
```

---

## 🧪 Testing

The client includes an extensive automated test suite covering calculation logic, edge cases, sync collisions, keyboard ergonomics, touch targets, and security locks:

```bash
# Run all tests via Vitest
npm test

# Run tests in watch mode
npm run test -- --watch

# Fast code analysis via Oxlint
npm run lint
```
**Current Test Coverage**: 35 test files, 342 automated unit and integration tests passing.

---

## 📱 Android Compilation via Capacitor

The application compiles to a native Android APK using Capacitor 8:

```bash
# Sync web build artifacts to the Android native directory
npm run cap:sync

# Build debug APK (copied directly to root Kasab-Val-Manager.apk)
npm run build:apk

# Build release APK
npm run build:apk:release

# Clean Android build cache
npm run clean:android
```

---

## 📂 Source Code Structure

```
app/src/
├── app/                        # App shell, providers, and route definitions
├── components/
│   ├── common/                 # Reusable UI atoms (Buttons, Badges, KpiCard, PullToRefresh)
│   ├── feedback/               # ActionSheet, DestructiveConfirmDialog, DangerZone
│   ├── layout/                 # MobilePageHeader, BottomNavigation, SpeedDialFab
│   ├── preview/                # ChallanPrintModal and isolated iframe printer
│   ├── security/               # SecurityLockScreen and PIN keypad
│   └── sheets/                 # Responsive BottomSheetModal drawers
├── context/                    # AppLockContext, DataContext, MonthContext, ThemeContext, SyncContext
├── features/                   # Domain features
│   ├── billing/                # Challan billing and calculation
│   ├── dashboard/              # Executive KPI cards and 1-click entry
│   ├── expenses/               # MoM categorised expenses
│   ├── inward/                 # Receiving Kasab, bori line items, rola tare deduction
│   ├── outward/                # Dispatching Val / Kali, bungari cone tare, billing
│   ├── parties/                # Directory, party ledger (Khata), tare overrides
│   ├── reports/                # Period profit & loss, monthly summaries
│   ├── scanner/                # Gemini vision challan scanner with draft persistence
│   └── settings/               # System weight defaults, PIN lock, 30-day trash bin
├── hooks/                      # Global UI hooks (e.g. useIsModalOpen, useNetworkStatus)
├── lib/
│   ├── api/                    # Supabase API clients (dispatch, expenses, parties, receipts)
│   ├── offline/                # Dexie database outbox and LWW sync engine
│   └── validation/             # Zod validation schemas
├── services/                   # aiScanner, autoBackupService, appLockService, trashBinService
├── tests/                      # Automated Vitest test suites
└── utils/                      # Calculations, date formatting, print helpers, deep links, haptics
```

---

## 📋 Implementation Milestones

- [x] **Phase 0 — Project Setup**: React 19, Tailwind CSS v4, Supabase configuration, PWA manifest.
- [x] **Phase 1 — Parties & Inward Receiving**: Multi-bag batch entry, grams-first input, dynamic spool tare.
- [x] **Phase 2 — Outward Dispatch**: Val and Kali workflows, Bungari tare deduction, billing amounts.
- [x] **Phase 3 — Ledger, Payments & Expenses**: Party Khata, Rola spool inventory, MoM expense tracking.
- [x] **Phase 4 — Dashboard & Reports**: P&L metrics, party profitability, top dues.
- [x] **Phase 5 — Offline Outbox & LWW Sync**: Dexie.js IndexedDB queue, optimistic updates, conflict resolution.
- [x] **Phase 6 — Backups & Disaster Recovery**: Nightly GitHub Actions backup, local snapshot scripts.
- [x] **Phase 7 — Android Packaging & UX Hardening**: Capacitor 8 APK, haptics, OLED dark mode, 3-tier deletion UX.
- [ ] **Phase 8 — Field Handoff & Observation**: On-site validation with Papa in Surat, Gujarat.
