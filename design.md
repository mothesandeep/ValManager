# Design — Kasab Val Manager
**Version:** 1.0

Design principle for this app: **Papa should never have to think about the interface, only the transaction in front of him.** Every choice below optimizes for a low-technical-comfort, single-purpose, mostly-mobile user — not for visual flair.

---

## 1. Design Tokens

### Color — grounded in the subject: metallic Jari thread + steel machinery

| Token | Hex | Use |
|---|---|---|
| Paper (background) | `#FAF7F0` | App background — warm, easy on eyes in daylight/outdoor use |
| Ink (text) | `#241F19` | Primary text |
| Ink Soft (secondary text) | `#6B6357` | Labels, captions, muted text |
| Brass (primary accent) | `#A6752B` | Primary buttons, active nav, links — references the Gold/Antique Kasab itself |
| Brass Dark | `#8A5F1F` | Borders/hover on brass elements |
| Steel (secondary) | `#5B6472` | Neutral accents — references the Ring Doubler machine |
| Positive (money in / cleared) | `#3F6B52` | Payments received, balances cleared |
| Positive Bg | `#EAF1EC` | Positive status background |
| Due (money owed / pending) | `#A6432F` | Balance due, pending Rola |
| Due Bg | `#F7EAE6` | Due status background |
| Card | `#FFFFFF` | Cards, forms, table surfaces |
| Border | `#E3D9C4` | Dividers, card borders |

No decorative gradients, no drop shadows beyond a 1px border — flat, ledger-like surfaces that stay legible in direct sunlight on a phone screen.

### Typography

| Role | Typeface | Notes |
|---|---|---|
| Headings / section titles | Space Grotesk (500–700) | Slightly mechanical, technical character — fits the machinery/production subject |
| Body, forms, tables | Inter (400–600) | Highly legible at small sizes, standard for dense data |
| Numbers (weights, money, counts) | Inter, `tabular-nums` | Digits align in columns — critical for scanning a weight or balance table quickly |

No serif, no display font — this is a working tool, not a brochure.

## 2. Navigation

- **Mobile (Papa's primary device):** bottom tab bar, 5–9 icon+label tabs, always visible, one thumb-reachable tap to switch sections.
- **Desktop/tablet (Sandeep's review use):** left sidebar, same tabs, labels always visible (no icon-only collapse — reduces ambiguity for infrequent desktop use).
- Tabs, in priority order Papa will actually use them: **Dashboard → Parties → Receiving → Production → Dispatch → Rola → Payments → Expenses → Reports.** This mirrors the real order of the physical job-work flow, so the nav order teaches the workflow.

## 3. Screen Patterns

### Dashboard
First thing Papa sees. 5 KPI cards (Parties, Production active, Rola pending, Balance due, Expenses this month) — no chart clutter, just the numbers that answer "how's the business today." Two recent-activity tables (Receiving, Dispatch) below, each with a "View all" link into the full module.

### Entry forms (Receiving, Production, Dispatch, Rola return, Payment, Expense)
- Every form opens inline (not a separate page/modal) directly above the list it feeds — Papa sees the form and the history in the same view, no lost context.
- **Dropdowns over free text** wherever the value is from a known set (party, color, cord count, twist type, status, expense category) — Papa selects, doesn't type, which avoids typos that would break party-matching or reporting.
- Any field the app can calculate (net weight, net Val weight, balances) is shown **live as Papa types**, in a highlighted read-only box — he sees the answer before he even submits, building trust in the number.
- Required fields marked with `*`; forms won't submit without them, with the fewest possible required fields (only what's truly needed to make the entry useful).

### Tables
- Flat, bordered rows (not cards) for dense data — a ledger feel, sortable by most-recent-first by default (Papa wants "what did I just do," not alphabetical).
- Edit (pencil) and delete (trash, with inline confirm — tap once to arm, tap check to confirm) icons at the row end, always visible, no hidden hover-only actions (touch devices have no hover).

### Party cards
Every party shows Rola pending and balance due right on the card — the two numbers Papa actually needs to decide "should I call this party." No need to open a detail screen for the headline numbers.

### Status colors (used consistently everywhere)
- Brass = neutral/primary action
- Green (Positive) = money received, balance clear, production done
- Red (Due) = balance owed, Rola pending, production not done

Same three colors mean the same thing on every screen — Papa learns the color language once.

## 4. Sync Status (new for the real app, vs. the prototype)

A small, always-visible indicator in the header: a checkmark + "All synced" when everything has reached Supabase + the Google Sheet, or a count ("3 pending") when offline/syncing. Tapping it shows nothing more than that count — no technical detail, no jargon. This is the one new piece of UI the real app needs beyond the prototype, to make the backup guarantee visible without requiring Papa to trust an invisible process.

## 5. Empty & Error States

- Empty state copy tells Papa exactly what to do next in plain words: *"No parties yet. Add the first party to start tracking their work."* — never a bare "No data."
- Error states never blame Papa or apologize; they state what happened and what to do: *"Could not save last change — check your connection and try again."*
- A failed Google Sheets sync never blocks Papa's work — it queues silently and retries; only the sync-status indicator reflects it.

## 6. Accessibility & Usability Floor

- Minimum tap target 40×40px on all interactive elements (buttons, row actions) — designed for a mid-range Android phone, possibly used with dry/rough hands after machine work.
- Color is never the only signal — status also uses text labels ("Done", "Pending due"), so the app remains usable if a screen looks washed out in sunlight.
- All forms keyboard/tab-navigable for the rare desktop review session.
- No animation beyond simple state transitions (form open/close) — nothing that delays Papa getting back to work.

## 7. What Carries Over From the Prototype

The chat-based prototype (`kasab-val-manager.jsx`) already implements this exact token system, navigation pattern, and component set inside the artifact environment. Rebuilding as the real app (see `architecture.md`) is a **backend swap, not a redesign** — the visual system and interaction patterns are considered validated and should be carried forward as-is into the Supabase-backed version.
