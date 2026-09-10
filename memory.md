# memory.md — Kasab Val Manager

**Purpose:** living project state. Whoever (or whatever agent) picks this project up next reads this first. Update this file at the end of every work session — don't let it go stale.

---

## Current Status

**Phase:** Not started — documentation complete (PRD, architecture, design, Phase plan, agent/rules/memory files), no code written yet.
**Next action:** Resolve the open questions below, then begin Phase 0 (Project Setup) per `Phase.md`.

## Project Summary

A digital operating system for Papa's Jari Kasab Val job-work business (Surat) — replacing challans + memory with an app that tracks Parties, Receiving, Production, Dispatch, Rola balances, Payments, Expenses, and Reports, with automatic Google Sheets backup so data survives even if the app's data is lost.

There is an existing **working prototype**: `kasab-val-manager.jsx`, built as a Claude artifact using `window.storage` for persistence. It validates the UI/UX, calculations, and module structure. It is **not** the real app — it only runs inside a Claude conversation and has no Google Sheets backup. The real build (per `architecture.md`) swaps `window.storage` for Supabase + adds the Sheets sync layer, keeping the same design.

## Decisions Made So Far

- Stack: React (Vite) + Tailwind + Supabase (Postgres) + Capacitor (Android packaging) + Google Sheets API backup via Supabase Edge Function. (See `architecture.md` for why.)
- Language: English only for v1.
- Platform: responsive — both mobile (Papa's primary device) and desktop (Sandeep's review use).
- Design system: brass/steel palette, Space Grotesk + Inter typography, bottom-tab nav on mobile / sidebar on desktop — carried over unchanged from the validated prototype. (See `design.md`.)
- Google Sheets backup is **one-way** (app → Sheet), upserted by record UUID, triggered on every write plus a daily reconciliation pass. The Sheet is read-only for Papa — editing only happens in the app.
- Bungari tare weight defaulted to 0.07kg per piece, per the original business brief.

## Open Questions (blocking Phase 0 in part)

1. **Auth:** does Papa want a PIN/login, or should the app just open with no gate? (Depends on whether his phone is shared with anyone else.)
2. **Bungari weight:** is 0.07kg fixed for every party, or does it vary — should it become a per-party or per-dispatch editable field instead of a hardcoded constant?
3. **Rate per kg:** does Papa charge the same rate to every party/color, or does it vary by party — should "rate" live on the Party profile as a default, rather than being re-entered per dispatch?

Resolve these with Papa/Sandeep before or during Phase 0 — they affect the schema (`architecture.md` §4) if answered differently than currently assumed.

## Ideas for Later (explicitly not v1 — see PRD §3)

## Session Log

| Date | What happened |
|---|---|
| — | PRD, architecture, design, Phase plan, agent.md, rules.md, memory.md written. Prototype (`kasab-val-manager.jsx`) already existed and validated the UI/module structure before these docs were written. |
| 8 Sep 2026 | **Phases 1–3 & UI Revamp:** Connected Supabase, implemented all 9 modules with real-time CRUD and balance calculations, updated UI to match reference design tokens, verified build, and pushed repository to GitHub (`mothesandeep/Kasab-Val-Manager`). |
| 8 Sep 2026 | **Receiving Weight Grams Input Fix:** Updated Receiving form Gross Weight and Tare Weight fields to accept whole-number grams without manual decimal points (e.g. `23535` → `23.535 kg`, `12500` → `12.500 kg`, `750` → `0.750 kg`). Implemented live `= X.XXX kg` badges, `grossGrams - tareGrams` Net Weight computation, `tare >= gross` validation, and full edit-flow compatibility (`kgToGrams`) with existing records. |
| 8 Sep 2026 | **Multi-Bori Receiving Workflow Redesign:** Redesigned Receiving module to match Papa's real-world workflow. Common batch header (Party, Date, optional Kasab Color displaying `—` when empty, batch Challan No). Dynamic Bori row list with auto-generated bori indices, whole-number grams Gross Weight input, Rola Count input, Per-Rola Weight input (default 200g, persisted & prefilled via `localStorage`), real-time calculated Tare (`rola * perRola`) and Net (`gross - tare`) weights, live Batch Summary totals, and single `insertReceipts` batch save. Backward-compatible with existing schema & individual record edit (restoring original derived per-rola weight `tare * 1000 / rola`) and delete. Validated with unit test script and Playwright browser check. |
| 8 Sep 2026 | **Receiving UI Refinement & Challan-Based Grouping:** Refined Receiving page UI: (1) Removed duplicate top "+ Add Bori" control, standardizing on a single "+ Add Another Bag" button at the bottom of the list. (2) Standardized all UI terminology to English "Bag" / "Bags" / "Total Bags". (3) Grouped Receiving table visually by Challan Number (`groupReceiptsByChallan`) while keeping individual bag-level rows with independent edit/delete actions and auto-numbered `Bag 1`, `Bag 2` sequence per challan. (4) Applied alternating visual treatment per Challan Group (not individual rows) with subtle group background tints and distinct 2px group borders. (5) Ensured unselected Kasab Color displays as `—` (never `"None"` or `"N/A"`). Verified via unit tests and browser DOM inspection. |
| 8 Sep 2026 | **Strict Per-Bag Validation & Save Protection:** Implemented robust per-bag validation: (1) Mandatory Gross Weight (> 0) and Rola Count (>= 0) for every active bag. (2) Field blur/touch state tracking (`markTouched`) so errors appear naturally after interaction without premature flashing. (3) Inline red borders and error messages below invalid fields. (4) Subtle per-bag header status badges (`✓ Complete` vs `⚠ Incomplete`). (5) Save button (`Save Entry` / `Save All Entries (N Bags)`) disabled with helper notice whenever any bag is incomplete or invalid; removing invalid bags dynamically re-enables save. (6) Zero silent drops of incomplete bags. Verified all 6 edge cases via test suite and Playwright browser inspection. |
| 8 Sep 2026 | **Dispatch Multi-Bag Redesign & Val/Kali Workflow:** Redesigned Dispatch module mirroring Receiving's multi-bag architecture: (1) Added top Dispatch Type selector dynamically switching between Val (finished goods billing) and Kali (empty rola dispatch). (2) For Val: grams-first Bore Gross input, sanitized Bungari count, persistent 70g default Bungari weight per piece, live Bungari tare calculation (`count * 70g`), automatic Net Val weight (`gross - bungari tare`), and live billing amount (`Net Val * Rate`). (3) For Kali: Gross Weight and Rola count inputs with zero Bungari deduction and zero payment/amount calculations. (4) Single "+ Add Another Bag" button, per-bag `Complete` vs `Incomplete` badges, and save protection. (5) Challan-based table grouping with alternating group backgrounds, group subheaders, and sequential `Bag 1`, `Bag 2` numbering. (6) Supabase migration added `dispatch_type`, `challan_no`, `bungari_weight_g`, and `rola_count` with safe defaults, ensuring 100% backward compatibility with existing records, payments, and reports. Verified via `test_dispatch_logic.mjs` and Playwright browser inspection. |
| 10 Sep 2026 | **Settings Module & Party-Wise Weight Configuration:** Implemented a dedicated Settings module (`/settings`) and party-specific weight preferences: (1) Global default weights for Rola (200g spool tare) and Bungri (70g cone tare) with instant persistence. (2) Party-wise weight configuration table with live search, custom overrides, and one-click reset to global defaults. (3) Supabase migration added `default_rola_weight_g` and `default_bungari_weight_g` to `parties` table. (4) Smart auto-prefill in Receiving (party rola weight) and Dispatch (party bungri weight) upon party selection with status indicators. (5) Party Add/Edit form and party cards display configured weights. (6) Fully verified with unit test suite (`test_settings_logic.mjs`) and clean production build (`npm run build`). |
