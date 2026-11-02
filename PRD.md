# PRD — Kasab Val Manager
**Version:** 2.0  
**Owner:** Sandeep (builder) · **Primary User:** Papa (sole operator, Jari Kasab Val job-work business, Surat)

---

## 1. Problem

Papa runs a textile job-work business alone in Surat — receiving Kasab (metallic yarn) from parties, converting it to Val/Dori on a Ring Doubler machine, rewinding, dispatching, and collecting job-work payments based on net delivered weight. Historically, every step lived in **loose paper challans and mental memory**:

- No centralized record of outstanding party dues or pending empty Rola spools.
- Risk of catastrophic record loss if physical challans were misplaced or damaged.
- Inaccurate estimation of monthly profit and overhead expenses.
- Mental math fatigue from calculating tare weights (grams to kilograms) across multiple bags.

## 2. Goal

Provide Papa with an offline-first, intuitive digital operating system on his Android phone and laptop that replaces paper challans and mental bookkeeping:
1. **Accurate Math:** Automatic calculation of net weights, tare deductions, billing amounts, and running balances.
2. **Offline-First Resilience:** Instant operation on-site without waiting for mobile internet, syncing automatically to Supabase.
3. **Ironclad Data Protection:** Multi-layer backups via automated daily GitHub Actions database dumps, local snapshot rollback ("Oops" button), and JSON/CSV exports.
4. **Zero-Friction Ergonomics:** Tailored for sole-operator speed with 1-click entry, thumb-zone controls, OLED dark mode, and "Galti-Proof" safety rails.

## 3. Scope & Evolved Requirements

### In Scope (Delivered in Version 2.0)
- **Parties & Khata (Ledger):** Centralized party directory, running balance tracking (receivable vs. collected), Rola spool inventory, and market alias support.
- **Inward Receiving (Kasab):** Multi-bag batch challan entry, whole-number grams input, dynamic Rola tare deduction, Kasab color and twist logging.
- **Outward Dispatch (Val & Kali):** Dual workflows for Val finished goods (with Bungari tare deduction and billing rate computation) and Kali (empty spool returns).
- **AI Challan Scanner:** Mobile camera integration powered by Google Gemini vision (`@google/genai`) to parse paper challans into pre-filled drafts.
- **Financials & Expenses:** Payment collection logging, month-over-month (MoM) expense categorization with trend indicators, and real-time P&L reporting.
- **Challan Invoicing & Printing:** Formatted challan generation with isolated iframe printing and native PDF sharing.
- **Security & PIN Lock:** 4-digit App Lock PIN with idle timeout and biometric device authentication.
- **Three-Tier Deletion UX ("Galti-Proof"):** Swipe-to-Trash with 5-second Undo banner, Danger Zone with WAI-ARIA alertdialog, and 30-day Soft Delete Trash Bin.
- **Automated Disaster Recovery:** Nightly database dumps via GitHub Actions (`daily-backup.yml`) and instant local snapshot rollback.

### Explicit Non-Goals (Preserved for Future Releases)
- Multi-tenant multi-organization logins (the app remains focused on Papa's single business unit).
- GST / E-Way bill generation (job-work operations in this segment operate on delivery challans).
- Automated SMS/WhatsApp marketing bulk messages to parties.
- Barcode / QR label printing hardware integrations.

---

## 4. User Personas

| User | Role | Primary Device | Technical Comfort | Key Needs |
|---|---|---|---|---|
| **Papa** | Sole Operator | Android Phone (Capacitor APK) | Low | Large tap targets (≥44px), grams-first inputs without decimal points, instant offline responsiveness, thumb-zone controls, OLED dark mode. |
| **Sandeep** | Builder / Auditor | Laptop / Desktop Web | High | Comprehensive P&L reports, automated database backups, test suite coverage (342 Vitest tests), desktop shortcuts (`Cmd+K`, `N+I`, etc.). |

---

## 5. Core User Stories & Workflows

### Parties & Ledger (Khata)
- As Papa, I can register a party once with their primary name, market aliases, phone, address, and default tare preferences (Rola and Bungri weights).
- As Papa, I can open a party's Khata modal to inspect their complete transaction ledger: all receipts, dispatches, payments, and spool balances.

### Inward Receiving (Kasab)
- As Papa, when receiving a shipment of Kasab, I enter the party, date, challan number, and add line items for each bag (`Bag 1`, `Bag 2`).
- As Papa, I enter gross weight in whole grams (e.g. `24500` g) and rola count; the app automatically deducts the party's spool tare and displays exact net kilograms (`23.250 kg`).
- As Papa, I can snap a photo of the party's physical delivery challan or scan it using the AI Scanner to auto-fill the form.

### Outward Dispatch (Val Delivery & Kali Returns)
- As Papa, when delivering finished Val, I select "Val" mode, enter bore gross weight, and specify the Bungari cone count. The app automatically subtracts cone tare (70g each) and computes net Val weight.
- As Papa, if a rate per kg is specified, the app calculates the total billing amount instantly.
- As Papa, when returning empty spools to a party, I select "Kali" mode to log spool counts without triggering billing deductions.

### Expenses & Financial Reporting
- As Papa, I can log operational expenses (Rent, Electricity, Maintenance, Oil, Transport, Consumables) in seconds.
- As Sandeep or Papa, I can view monthly P&L cards: Gross Billed, Total Expenses, and Net Operating Margin with MoM percentage changes.

### Disaster Recovery & Safe Deletion
- As Papa, if I accidentally delete a record on my phone, I can tap "Undo" on the 5-second banner to restore it immediately, or visit the Trash Bin within 30 days.
- As Sandeep, I know that all records are backed up automatically to GitHub every night and can be rolled back in one click using the "Oops" snapshot button.

---

## 6. Functional Specifications Matrix

| Module | Key Fields | Auto-Calculations | Safeguards & Validations |
|---|---|---|---|
| **Parties** | Name, Aliases, Phone, Address, Default Rola/Bungri Tare | Net outstanding balance, Pending Rola spool count | Unique name validation, deletion prevention if linked records exist |
| **Inward** | Party, Date, Challan No, Kasab Color, Twist, Bags (Gross g, Rola pcs) | Net Kasab kg per bag, Total Batch Gross/Net kg, Spool inventory increment | Duplicate challan warnings, mandatory gross > tare, blur validation |
| **Outward** | Party, Date, Challan No, Mode (Val/Kali), Bags (Bore Gross g, Bungari pcs), Rate/kg | Net Val kg, Bungari tare deduction, Total Billing Amount, Spool inventory decrement | Mode-specific field validation, positive rate check |
| **Payments** | Party, Date, Amount, Payment Method, Reference/Note | Party Khata balance decrement | Positive amount requirement, instant ledger update |
| **Expenses** | Date, Category, Amount, Note | Monthly expense category totals, MoM difference percentage | Category selection validation |
| **Reports** | Month Selector, Custom Date Range | Total Received Kasab, Total Dispatched Val, Revenue, Expenses, Net Profit | Historical monthly comparison |
| **Settings** | Global Rola Tare (125g), Bungri Tare (70g), Security PIN, Theme | Real-time tare prefill updates across forms | PIN confirmation, password-less biometric prompt |

---

## 7. Non-Functional Requirements

- **Offline-First:** All mutations commit to local IndexedDB (Dexie.js) instantly. The app never blocks UI interactions on network requests.
- **Zero-Friction Speed:** Core operational flows complete in under 5 taps. Number inputs use `inputMode="numeric"` to pop the native numeric keyboard.
- **Accurate Columnar Math:** All weights, balances, and currency figures utilize `Inter tabular-nums` to guarantee vertical decimal alignment.
- **High-Contrast Dark Mode:** Full OLED Dark Mode (`#020617` background) with pre-render FOUC prevention for dim workshop environments.
- **Touch Ergonomics:** All touch targets meet or exceed Android 44×44dp guidelines. Primary creation actions reside in the thumb zone (SpeedDial FAB).

---

## 8. Resolved Architecture & Business Decisions

| Question / Area | Initial PRD Hypothesis | Resolved Final Implementation |
|---|---|---|
| **App Authentication** | Unresolved (No gate vs PIN) | **Resolved:** Built-in 4-digit App Lock PIN with biometric unlock and configurable auto-lock timeout. |
| **Tare Weights** | Fixed 70g Bungari / 200g Rola | **Resolved:** Configurable global defaults (70g Bungri, 125g Rola) with custom overrides configurable per party. |
| **Rate per Kg** | Hardcoded per dispatch | **Resolved:** Party profiles store default job-work rates, automatically prefilled on Outward dispatches with inline override support. |
| **Challan Photos** | Excluded | **Resolved:** Direct camera capture with image compression and Supabase storage bucket integration. |
| **Backup Storage** | Google Sheets v4 via Edge Function | **Resolved:** Upgraded to automated GitHub Actions daily PostgreSQL backups, local snapshot rollback, and JSON/CSV exports. |
