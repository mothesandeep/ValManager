# Design System — Kasab Val Manager (Blue SaaS 2.0)
**Version:** 2.0 (Blue SaaS Redesign)  
**Updated:** November 2026

Design principle: **Professional, clutter-free, offline-first SaaS experience.** The interface uses a crisp blue SaaS design language with clear visual hierarchy, robust 44px tap targets, predictable status semantics, and high legibility across mobile (Android Capacitor) and desktop web.

---

## 1. Design Tokens

### Color Palette

| Token | Hex | Tailwind Equivalent | Use |
|---|---|---|---|
| **Primary** | `#2563EB` | `blue-600` | Primary action buttons, active tab indicators, key interactive controls |
| **Primary Hover** | `#1D4ED8` | `blue-700` | Hover state for primary buttons |
| **Primary Tint** | `#EFF6FF` | `blue-50` | Active navigation background, subtle selection tint |
| **Primary Ring** | `#93C5FD` | `blue-300` | Input focus rings, focus-visible indicators |
| **Background (Light)** | `#F8FAFC` | `slate-50` | Global page canvas backdrop |
| **Surface (Light)** | `#FFFFFF` | `white` | Cards, modals, drawers, data table surfaces |
| **Border (Light)** | `#E2E8F0` | `slate-200` | 1px dividers, card borders, table separators |
| **Text Primary** | `#0F172A` | `slate-900` | Headings, primary text, key metrics |
| **Text Secondary** | `#475569` | `slate-600` | Secondary labels, descriptions, subheadings |
| **Text Muted** | `#64748B` | `slate-500` | Captions, placeholders, disabled states |
| **Positive** | `#15803D` | `green-700` | Paid, cleared balances, completed production |
| **Positive Bg** | `#F0FDF4` | `green-50` | Background tint for positive status pills |
| **Due / Alert** | `#B91C1C` | `red-700` | Balance due, pending Rola spools, destructive actions |
| **Due Bg** | `#FEF2F2` | `red-50` | Background tint for due/alert status pills |
| **Warning** | `#B45309` | `amber-700` | Pending sync, draft states, warnings |
| **Warning Bg** | `#FFFBEB` | `amber-50` | Background tint for warning status pills |

*Note: Legacy brass, paper, and steel tokens have been replaced with these modern slate/blue tokens.*

---

### OLED Dark Mode Palette

Designed for battery savings and high contrast in low-light factory workshop conditions:

| Token | Hex | Tailwind Equivalent | Use |
|---|---|---|---|
| **Background (Dark)** | `#020617` | `slate-950` | Deep OLED black canvas backdrop |
| **Surface (Dark)** | `#0F172A` | `slate-900` | Dark card, modal, and drawer surfaces |
| **Border (Dark)** | `#1E293B` | `slate-800` | Dark border separators and dividers |
| **Text Primary (Dark)** | `#F8FAFC` | `slate-50` | High-contrast dark mode headings and text |
| **Text Secondary (Dark)**| `#94A3B8` | `slate-400` | Secondary descriptions and field labels |
| **Text Muted (Dark)** | `#64748B` | `slate-500` | Muted dark mode metadata and placeholders |

- **FOUC Prevention:** Pre-render inline script checks theme preference in `localStorage` and system media query before initial paint.
- **System Synchronization:** Native Android status bar and navigation bar automatically switch to `#000000` via Capacitor StatusBar API.

---

### Typography

- **Font Family:** `Inter` across all headings, body text, buttons, and form inputs.
- **Tabular Numbers:** Every weight, currency amount, balance, piece count, and date enforces `tabular-nums` (`font-variant-numeric: tabular-nums`) to maintain strict vertical alignment across columns.
- **Font Weights:**
  - `400` (Regular): Body copy, table cells, form inputs.
  - `500` (Medium): Secondary labels, navigation items, buttons.
  - `600` (Semibold): Card headings, modal titles, status pills.
  - `700` (Bold): Executive KPI metrics and financial summaries.

---

## 2. Component Specifications

- **Border Radii:**
  - Interactive Controls (Buttons, Inputs, Selects): `rounded-lg` (`8px`).
  - Cards & Containers (KPI Cards, Tables, Modals): `rounded-xl` (`12px`).
  - Badges & Status Pills: `rounded-full` (`9999px`).
- **Touch Target Floor:**
  - Minimum touch target dimension of **44px × 44px** on all clickable controls, buttons, and list items.
- **Focus States:**
  - Accessible outline with high visibility: `focus-visible:ring-2 focus-visible:ring-blue-500 focus-visible:ring-offset-2`.
- **Status Pills:**
  - Semantic pill format (`px-2.5 py-0.5 rounded-full text-xs font-semibold`) pairing explicit text with color (e.g. `✓ Synced`, `⚠ 3 Pending`, `Due`).

---

## 3. Navigation System

### Desktop (Collapsible Sidebar)
- Expandable left navigation rail displaying clear icons and text labels.
- **Active Navigation Item:** `bg-blue-50 text-blue-600 dark:bg-blue-950/60 dark:text-blue-400 font-semibold`.
- **Hover Navigation Item:** `hover:bg-slate-100 dark:hover:bg-slate-800/60 transition-colors`.

### Mobile (Thumb-Zone Navigation)
- Fixed bottom navigation bar with 4 primary operational routes + 1 "More" drawer trigger:
  1. **Dashboard** (`/`)
  2. **Inward** (`/receiving`)
  3. **Outward** (`/dispatch`)
  4. **Payments** (`/payments`)
  5. **More** (Opens responsive sheet for Parties, Expenses, Reports, and Settings).
- **SpeedDial Floating Action Button (FAB):**
  - Positioned at `bottom-20 right-4` within comfortable one-handed thumb reach.
  - Contextually provides 1-tap direct creation for the active route.

---

## 4. Desktop & Keyboard Ergonomics

- **Command Palette:** Global modal invoked via `Cmd+K` or `Ctrl+K` for instant fuzzy navigation to any module, action, or settings tab.
- **Two-Key Quick Sequences:** Fast keyboard shortcuts with typing input guards:
  - `N + I` → New Inward Receipt
  - `N + O` → New Outward Dispatch
  - `N + P` → Record Payment
  - `N + E` → Log Expense
- **Global Save Interception:** `Ctrl+S` / `Cmd+S` intercepts browser Save-As dialogs to validate and submit the active open form or drawer.
- **Escape Key Dismissal:** `Esc` cleanly closes modals, drawers, and floating menus without submitting changes.

---

## 5. Three-Tier Saved Data Deletion UX ("Galti-Proof")

To prevent accidental data loss while working in harsh workshop environments, deletion follows three distinct, complementary UX patterns:

```
┌────────────────────────────────────────────────────────────────────────┐
│ Pattern 1: Swipe-to-Trash with Undo Banner (Mobile List Rows)          │
│ - Fluid Framer Motion swipe gesture with -50px haptic resistance       │
│ - Auto-delete trigger threshold at -160px with warning red backdrop    │
│ - Instant visual disappearance + 5-second floating [Undo] toast        │
└───────────────────────────────────┬────────────────────────────────────┘
                                    │ Record deleted
                                    ▼
┌────────────────────────────────────────────────────────────────────────┐
│ Pattern 2: The Danger Zone & Alertdialog (Detailed Form Edits)         │
│ - Visually isolated red-bordered container at the bottom of edit view   │
│ - Explicit named entity label (e.g. Delete "Challan #104 - Vikas")     │
│ - WAI-ARIA alertdialog with initial focus locked to neutral Cancel     │
└───────────────────────────────────┬────────────────────────────────────┘
                                    │ Confirmed deletion
                                    ▼
┌────────────────────────────────────────────────────────────────────────┐
│ Pattern 3: Soft Delete / 30-Day Trash Bin (System Recovery)            │
│ - Preserves full entity payload with timestamp in trashBinService      │
│ - 30-day retention cutoff before permanent purge                      │
│ - In-app Trash Bin modal in Settings with 1-click domain restoration   │
└────────────────────────────────────────────────────────────────────────┘
```

---

## 6. Status Semantics Floor

Colors convey consistent meaning throughout the application:
- **Green (`#15803D` / `#F0FDF4`):** Completed orders, cleared Khata balances, payments received, all records synced.
- **Red (`#B91C1C` / `#FEF2F2`):** Outstanding balances owed, pending Rola returns, destructive actions, offline error states.
- **Blue (`#2563EB` / `#EFF6FF`):** Primary interactive CTAs, active selections, navigation highlights.
- **Amber (`#B45309` / `#FFFBEB`):** Unsynced offline outbox mutations, draft challenger scans, non-blocking warnings.
