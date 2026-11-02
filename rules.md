# rules.md — Kasab Val Manager

**Purpose:** Concrete coding standards and architectural invariants for this codebase. Every contributor and AI agent must adhere to these rules.

---

## 1. Technology Stack Invariants

- **Frontend:** React 19 + Vite 8 + TypeScript + Tailwind CSS v4. No external UI component suites (no MUI, Chakra, AntD, or shadcn copy-paste libraries) — all UI atoms follow the custom Blue SaaS 2.0 design tokens.
- **State Management:** React hooks and context (`DataContext`, `MonthContext`, `AppLockContext`, `SyncContext`). No Redux or heavy client state libraries.
- **Local Persistence & Offline:** Dexie.js 4 (IndexedDB) acts as the local offline mutation queue and fast cache. Server mutations write to Dexie first with optimistic UI updates.
- **Cloud Backend:** Supabase PostgreSQL 15 with Row-Level Security (RLS).
- **Mobile Container:** Capacitor 8 for Android. Do not introduce Flutter or React Native.
- **Icons:** `lucide-react` exclusively for iconography consistency.

---

## 2. Directory & Modular Feature Structure

Code is organized by domain feature slices rather than technical layers:

```
app/src/
├── app/                  # Application Shell, Router, Top-level providers
├── components/
│   ├── common/           # Shared atoms (Badge, Button, KpiCard, PullToRefresh)
│   ├── feedback/         # ActionSheet, DestructiveConfirmDialog, DangerZone
│   ├── layout/           # AppShell, BottomNavigation, SpeedDialFab, PageHeader
│   ├── preview/          # ChallanPrintModal, iframe printing utility
│   ├── security/         # SecurityLockScreen, PinKeypad
│   └── sheets/           # BottomSheetModal drawers
├── context/              # Global state contexts (AppLock, Data, Month, Theme, Sync)
├── features/             # Feature domain modules
│   ├── billing/          # Invoicing and delivery challans
│   ├── dashboard/        # Executive overview and 1-tap entry
│   ├── expenses/         # MoM categorized operating expenses
│   ├── inward/           # Kasab raw material receiving, multi-bag batching
│   ├── outward/          # Val delivery & Kali spool returns, billing math
│   ├── parties/          # Directory, Party Khata ledger, tare preferences
│   ├── reports/          # Monthly summaries, P&L, debtors
│   ├── scanner/          # Gemini vision challan camera parser
│   └── settings/         # System tare defaults, app lock, trash bin
├── lib/
│   ├── api/              # Supabase query functions (dispatch, receipts, parties, etc.)
│   ├── offline/          # Dexie database schema and LWW sync engine
│   └── validation/       # Zod schemas for all forms and models
├── services/             # Domain services (aiScanner, autoBackup, appLock, trashBin)
├── tests/                # Automated Vitest test suites
└── utils/                # Pure mathematical calculations, formatters, haptics, deep links
```

---

## 3. Pure Mathematical Calculations

All business logic and tare calculations must remain **pure, side-effect-free functions** located in `src/utils/calculations.ts` or feature-specific calculation utilities with comprehensive test coverage:

1. **Net Kasab Receiving Weight:**
   $$\text{Net Weight (kg)} = \text{Gross (kg)} - \left(\frac{\text{Rola Count} \times \text{Per-Rola Grams}}{1000}\right)$$
2. **Net Val Delivery Weight:**
   $$\text{Net Val (kg)} = \text{Bore Gross (kg)} - \left(\frac{\text{Bungari Count} \times \text{Bungari Tare Grams}}{1000}\right)$$
3. **Dispatch Billing Total:**
   $$\text{Amount (₹)} = \text{round}(\text{Net Val Weight (kg)} \times \text{Rate per kg})$$
4. **Party Khata Financial Balance:**
   $$\text{Balance Due (₹)} = \sum \text{Dispatch Amounts} - \sum \text{Payments Received}$$
5. **Rola Spool Inventory Balance:**
   $$\text{Pending Spools} = \sum \text{Received Rola} - \sum \text{Returned Rola}$$

---

## 4. Offline Queue & Last-Write-Wins (LWW)

1. **Local-First Execution:** Every mutation (create, edit, delete) is written directly to IndexedDB via Dexie before firing any network requests.
2. **Optimistic Rendering:** The UI reflects updates immediately without awaiting network confirmation or displaying blocking spinners.
3. **Idempotent Synchronization:** Sync mutations carry client-generated UUIDs and ISO 8601 `updated_at` timestamps. Supabase uses Last-Write-Wins to prevent outdated mutations from overwriting newer changes.
4. **Never Block Papa:** Network disconnection or intermittent factory connectivity must never prevent the user from completing an entry.

---

## 5. Security & Sensitive Information

1. **Credential Exposure:** Never commit Supabase service-role keys or database administrative passwords. Client bundles must only contain the public `anon` key.
2. **Row-Level Security:** Every table in PostgreSQL must have RLS enabled with explicit restrictive policies.
3. **App Lock Enclave:** The 4-digit security PIN is hashed client-side. Failed entry attempts enforce progressive timeouts.
4. **Anonymized Logs:** Never emit customer names, telephone numbers, or financial amounts to third-party loggers or telemetry tools.

---

## 6. Three-Tier Deletion Guidelines ("Galti-Proof")

Deleting records must strictly employ one of the three established patterns:
1. **Tier 1 (Mobile Swipe):** For fast mobile list row deletion, use `SwipeableRow.tsx` with haptic feedback, a red background, and a 5-second `[Undo]` toast banner.
2. **Tier 2 (Modal / Danger Zone):** For form edit views, place deletion in an isolated `DangerZone.tsx` container and trigger `DestructiveConfirmDialog.tsx` with initial focus locked to `Cancel`.
3. **Tier 3 (Trash Bin Retention):** Incurred deletions must pass through `trashBinService.ts` with full payload preservation and 30-day recovery retention.

---

## 7. Accessibility, Styling & Ergonomics

1. **Touch Target Dimensions:** All interactive buttons, chips, table action icons, and form triggers must satisfy minimum dimensions of **44px × 44px**.
2. **Tabular Numerics:** All currency figures, weights, counts, and dates must use `tabular-nums` (`font-variant-numeric: tabular-nums`) for column alignment.
3. **Numeric Keyboards:** Numeric inputs must specify `inputMode="numeric"` or `type="text" inputMode="decimal"` to display the numeric keypad immediately on mobile devices.
4. **Focus Outlines:** Desktop navigation must feature accessible focus outlines (`focus-visible:ring-2 focus-visible:ring-blue-500`).
5. **Dark Mode Integrity:** Dark mode must use pure OLED black (`#020617` canvas, `#0F172A` cards) with pre-render FOUC prevention.
