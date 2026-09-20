# Phase Plan — Kasab Val Manager
**Version:** 1.0

Build in phases, each with a clear exit criteria — don't start a phase until the previous one is actually working, not just written. This mirrors the phased approach already used for CalistheniX.

---

### Phase 0 — Project Setup
**Goal:** empty but real, deployable skeleton.
- Set up Supabase project; create all tables from `architecture.md` §4.
- Set up React (Vite) project, Tailwind, Capacitor config (Android target added but not built yet).
- Deploy an empty shell to Vercel/Netlify — confirm it loads on Papa's actual phone browser.
- **Exit criteria:** blank app installable to home screen on Papa's phone; Supabase tables exist and are reachable from the deployed frontend.

### Phase 1 — Parties + Receiving (the first real workflow)
**Goal:** Papa can add a party and log one Kasab receiving entry, and it survives a phone restart.
- Build Parties module (add/edit/delete, card view with placeholder stats).
- Build Receiving module (form + table, live net weight calculation).
- Wire both to Supabase directly (no offline queue yet — add that in Phase 5).
- **Exit criteria:** you add a test party and a test receipt on Papa's phone, close the app fully, reopen it, and the data is still there.

### Phase 2 — Production + Dispatch
**Goal:** the full physical workflow (receive → produce → dispatch) is trackable end to end.
- Build Production module, linked to a Receiving entry.
- Build Dispatch module, with Bungari-tare auto-calculation and optional rate-based amount.
- **Exit criteria:** one full cycle — a receipt, a production order against it, a dispatch — can be entered and reviewed without leaving the app.

### Phase 3 — Rola, Payments, Expenses
**Goal:** the money and inventory side is tracked, not just production.
- Build Rola return logging + per-party pending balance.
- Build Payments logging, auto-deriving receivable from Dispatch amounts.
- Build Expenses logging by category.
- **Exit criteria:** party cards show correct, real-time Rola-pending and balance-due numbers driven off actual entered data.

### Phase 4 — Dashboard + Reports
**Goal:** the "so what" layer — numbers Papa actually checks daily/monthly.
- Build Dashboard KPI cards + recent activity.
- Build Reports: monthly aggregates, party-wise profitability, highest pending payments.
- **Exit criteria:** you can hand the phone to Papa, he opens Reports, and the monthly numbers match what he'd expect from that period's challans (spot-check against real paper records).

### Phase 5: Complete Offline Capability (COMPLETE)
*   **Goal**: Full read/write capability when offline, background syncing when online.
*   **Implementation**:
    *   **Local Queue**: Integrate **Dexie.js** (IndexedDB wrapper) to store mutations (Create, Update, Delete) locally when offline.
    *   **Sync Logic**: Implement a background sync function that pushes queued mutations to Supabase when the `online` event fires.
    *   **Optimistic UI**: Update API helper functions to return locally merged data (Server Data + Pending Mutations) so the UI reflects changes immediately.
    *   **Conflict Resolution**: Use simple "last-write-wins" or timestamp-based merging for simplicity in this phase.
    *   **UI Indicators**: Add a small indicator (e.g., a cloud icon) in the header showing sync status (Online, Offline, Syncing, Pending Items).

### Phase 6 — Google Sheets Backup
**Goal:** the actual reason this phase list exists — every entry is safe outside the app too.
- Create the Google Sheet with one tab per table, matching schema column order.
- Set up the Google Cloud service account + Sheets API access.
- Build the `sync-to-sheets` Supabase Edge Function (upsert by UUID, per `architecture.md` §5).
- Wire the Postgres trigger/webhook so every insert/update fires the sync.
- Build the daily reconciliation pass as a fallback.
- **Exit criteria:** add an entry in the app, open the Google Sheet within a minute, confirm the row appears with matching data; edit that entry in the app, confirm the Sheet row updates (not duplicates).

### Phase 7 — Android Packaging + Polish
**Goal:** it feels like "Papa's app," not a website he has to remember a URL for.
- Capacitor build → signed Android APK (or Play Store internal testing track, if you want auto-updates without manual APK reinstalls).
- Final pass on tap-target sizes, empty states, and error copy against `design.md` §5–6, tested in direct sunlight if possible (real outdoor-use condition).
- **Exit criteria:** app icon sits on Papa's home screen; he can complete a receiving entry and a dispatch entry without you standing next to him.

### Phase 8 — Handoff & Observation Week
**Goal:** confirm it actually replaces the paper/memory workflow, per PRD §8 success criteria.
- Papa uses the app for real transactions for one week, paper challans continue in parallel as a safety net.
- Sandeep reviews entries daily against paper challans — catch any UX friction points or miscalculations early.
- Fix anything Papa struggles with before removing the paper safety net.
- **Exit criteria:** a full week of real entries, zero data loss, Papa comfortable doing Receiving + Dispatch entries solo.

---

## Guardrail

At every phase boundary, re-check `PRD.md` §3 (Non-Goals). If a phase starts growing to include something on that list, stop and cut it — ship the phase as scoped, add a note for a possible v2 instead.
