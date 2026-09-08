# Architecture — Kasab Val Manager
**Version:** 1.0

---

## 1. Stack Overview

| Layer | Choice | Why |
|---|---|---|
| Frontend | React (Vite) + Tailwind, installed as a PWA | Fast, matches your existing React comfort, installable on Papa's phone home screen without app-store friction |
| Mobile packaging | Capacitor wrapping the same React app → Android APK | Same pattern you're already using for CalistheniX — one codebase, two distribution forms |
| Primary database | Supabase (Postgres + Auth + Realtime) | Managed, no self-hosting, direct client access with row-level security, realtime sync if needed later — same direction you're already moving CalistheniX toward |
| Backup store | Google Sheets (via Google Sheets API v4) | Human-readable, opens in Excel, survives independently of the app/DB — exactly what Papa needs as a safety net |
| Backup trigger | Supabase Edge Function (Deno) triggered on DB write via Postgres trigger/webhook | Keeps backup logic server-side and automatic — Papa never has to "remember to back up" |
| Auth | Supabase Auth, single PIN-based login (or none, if Papa's phone is not shared — see PRD open question) | Business has one operator; auth exists mainly to protect the Supabase project, not to gate multiple users |
| Hosting | Vercel or Netlify (frontend) + Supabase (backend) | Free tier covers this scale easily |

## 2. System Diagram

```
┌─────────────────────────┐
│   React PWA (phone)     │
│  ┌────────────────────┐ │
│  │ Local cache/queue   │ │   ← writes land here FIRST (offline-safe)
│  │ (IndexedDB)          │ │
│  └─────────┬────────────┘ │
└────────────┼───────────────┘
             │ sync when online
             ▼
   ┌───────────────────┐
   │   Supabase (DB)    │  ← source of truth
   │  Postgres tables   │
   └─────────┬──────────┘
             │ on INSERT/UPDATE (DB trigger → webhook)
             ▼
   ┌───────────────────────────┐
   │  Supabase Edge Function    │
   │  "sync-to-sheets"           │
   └─────────┬───────────────────┘
             │ Google Sheets API v4 (service account)
             ▼
   ┌───────────────────────────┐
   │   Google Sheet             │
   │  One tab per table          │  ← human-readable backup
   │  (Parties, Receiving, ...)  │
   └───────────────────────────┘
```

## 3. Data Flow (a single entry, end to end)

1. Papa fills the "New Receipt" form → app writes to local IndexedDB immediately, form closes instantly (no spinner wait).
2. If online: app pushes the row to Supabase (`receipts` table) in the background.
3. If offline: row stays queued; a small "X unsynced" indicator shows; syncs automatically on reconnect.
4. Once the row lands in Supabase, a Postgres trigger fires a webhook to the `sync-to-sheets` Edge Function.
5. The Edge Function appends/updates the matching row in the `Receiving` tab of the Google Sheet, keyed by the record's UUID (so re-syncs **update** the existing row instead of duplicating it).
6. If the Sheets API call fails (rate limit, network), the function retries with backoff and logs the failure to a `sync_failures` table — so backup gaps are visible, not silent.

## 4. Database Schema (Supabase / Postgres)

```sql
-- parties
id            uuid primary key default gen_random_uuid()
name          text not null
phone         text
address       text
notes         text
created_at    timestamptz default now()

-- receipts (raw material receiving)
id            uuid primary key default gen_random_uuid()
party_id      uuid references parties(id)
date          date not null
color         text            -- Gold / Silver / Pelmet / Water / Antique
gross_weight  numeric not null
tare_weight   numeric default 0
net_weight    numeric generated always as (gross_weight - tare_weight) stored
challan_no    text
rola_count    int default 0
created_at    timestamptz default now()

-- production_orders
id            uuid primary key default gen_random_uuid()
receipt_id    uuid references receipts(id)
cord_count    int              -- 4/8/10/12/14/18
twist_type    text             -- 'S' or 'Z'
waste         numeric default 0
status        text default 'Pending'   -- Pending / In Progress / Done
created_at    timestamptz default now()

-- dispatches
id                uuid primary key default gen_random_uuid()
party_id          uuid references parties(id)
date              date not null
bungari_count     int default 0
bore_gross_weight numeric not null
net_val_weight    numeric        -- computed at write time: bore_gross_weight - (bungari_count * 0.07)
rate_per_kg       numeric
amount            numeric        -- computed if rate_per_kg present, else manual
created_at        timestamptz default now()

-- rola_returns
id            uuid primary key default gen_random_uuid()
party_id      uuid references parties(id)
date          date not null
rola_count    int not null
created_at    timestamptz default now()

-- payments
id            uuid primary key default gen_random_uuid()
party_id      uuid references parties(id)
date          date not null
amount        numeric not null
note          text
created_at    timestamptz default now()

-- expenses
id            uuid primary key default gen_random_uuid()
date          date not null
category      text not null    -- Rent / Electricity / Transport / ... / Other
amount        numeric not null
note          text
created_at    timestamptz default now()

-- sync_failures (backup health)
id            uuid primary key default gen_random_uuid()
table_name    text
record_id     uuid
error         text
attempted_at  timestamptz default now()
```

All derived numbers Papa sees (party balance, Rola pending, monthly profit) are **computed in the frontend from these raw tables** — nothing is double-stored, so the Sheet and the app can never disagree about a stored total, only about which raw rows have synced yet.

## 5. Google Sheets Backup — Design Details

- **One Google Sheet, one tab per table** (`Parties`, `Receiving`, `Production`, `Dispatch`, `RolaReturns`, `Payments`, `Expenses`) — mirrors the schema 1:1, so recovery means "open the Sheet, you have the raw data."
- **Service account** (Google Cloud) with edit access to the Sheet — no personal Google login required, no OAuth token to babysit.
- **Upsert by UUID**: first column in every tab is the record's `id`. Sync function looks up the row by ID; updates it if found, appends if not. This makes the sync **idempotent** — safe to retry without creating duplicate rows.
- **Trigger, not schedule**: sync fires on every write (near-real-time), not on a nightly batch — so backup lag is seconds, not a day's worth of lost work in the worst case.
- **Fallback schedule**: in addition, a daily scheduled Edge Function does a full reconciliation pass (compare row counts per table between Supabase and the Sheet) and re-pushes anything missing — covers the case where a webhook silently failed.
- **Read-only for Papa**: the Sheet is a safety net, not a second place to edit data — editing only happens in the app, to avoid the two sources drifting apart.

## 6. Offline Handling

- IndexedDB (via a small wrapper, e.g. Dexie.js) holds an outbox of unsynced writes.
- A visible, unobtrusive sync-status indicator (e.g. "All synced" / "3 pending") sits in the header — Papa doesn't need to understand sync, just see a checkmark.
- Conflict handling is not a concern in v1: single user, single device at a time, so last-write-wins is safe.

## 7. Security Notes

- Supabase Row-Level Security scoped to a single business/user ID — even though it's one user, this prevents the anon key (embedded in the frontend) from being usable to read/write arbitrary data if leaked.
- Google service account key lives only in the Supabase Edge Function's environment secrets — never shipped to the frontend bundle.

## 8. What Changes From the Current Prototype

The artifact you're using today (`kasab-val-manager.jsx`) uses the chat environment's own `window.storage` — that only works inside a Claude conversation and isn't installable on Papa's phone. This architecture describes the **real, standalone app** version: same screens and calculations, but backed by Supabase instead of `window.storage`, and with the Google Sheets backup layer added. The UI/UX and design system (see `design.md`) carry over unchanged.
