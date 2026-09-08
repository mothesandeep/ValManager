-- ============================================================
-- Kasab Val Manager — Initial Schema
-- Version: 1.0 (Phase 0)
-- Run this in the Supabase SQL Editor for your project.
-- ============================================================

-- ── Parties ─────────────────────────────────────────────────
create table if not exists parties (
  id          uuid primary key default gen_random_uuid(),
  name        text not null,
  phone       text,
  address     text,
  notes       text,
  created_at  timestamptz default now()
);

-- ── Receipts (raw material receiving) ───────────────────────
create table if not exists receipts (
  id            uuid primary key default gen_random_uuid(),
  party_id      uuid references parties(id) on delete restrict,
  date          date not null,
  color         text,              -- Gold / Silver / Pelmet / Water / Antique
  gross_weight  numeric not null,
  tare_weight   numeric default 0,
  net_weight    numeric generated always as (gross_weight - tare_weight) stored,
  challan_no    text,
  rola_count    int default 0,
  created_at    timestamptz default now()
);

-- ── Production Orders ────────────────────────────────────────
create table if not exists production_orders (
  id          uuid primary key default gen_random_uuid(),
  receipt_id  uuid references receipts(id) on delete restrict,
  cord_count  int,               -- 4 / 8 / 10 / 12 / 14 / 18
  twist_type  text,              -- 'S' or 'Z'
  waste       numeric default 0,
  status      text default 'Pending',  -- Pending / In Progress / Done
  created_at  timestamptz default now()
);

-- ── Dispatches ───────────────────────────────────────────────
-- net_val_weight is computed at write time in the app:
--   bore_gross_weight - (bungari_count * 0.07)
-- Stored explicitly (not a generated column) so the Sheet backup
-- has the actual value without needing the formula.
create table if not exists dispatches (
  id                uuid primary key default gen_random_uuid(),
  party_id          uuid references parties(id) on delete restrict,
  date              date not null,
  bungari_count     int default 0,
  bore_gross_weight numeric not null,
  net_val_weight    numeric,          -- app-computed before insert
  rate_per_kg       numeric,          -- optional
  amount            numeric,          -- app-computed if rate_per_kg present
  created_at        timestamptz default now()
);

-- ── Rola Returns ─────────────────────────────────────────────
create table if not exists rola_returns (
  id          uuid primary key default gen_random_uuid(),
  party_id    uuid references parties(id) on delete restrict,
  date        date not null,
  rola_count  int not null,
  created_at  timestamptz default now()
);

-- ── Payments ─────────────────────────────────────────────────
create table if not exists payments (
  id          uuid primary key default gen_random_uuid(),
  party_id    uuid references parties(id) on delete restrict,
  date        date not null,
  amount      numeric not null,
  note        text,
  created_at  timestamptz default now()
);

-- ── Expenses ─────────────────────────────────────────────────
create table if not exists expenses (
  id          uuid primary key default gen_random_uuid(),
  date        date not null,
  category    text not null,   -- Rent / Electricity / Transport / Machine Oil / Repairs / Consumables / Other
  amount      numeric not null,
  note        text,
  created_at  timestamptz default now()
);

-- ── Sync Failures (Google Sheets backup health) ──────────────
create table if not exists sync_failures (
  id            uuid primary key default gen_random_uuid(),
  table_name    text,
  record_id     uuid,
  error         text,
  attempted_at  timestamptz default now()
);

-- ============================================================
-- Row-Level Security
-- v1: single operator, no multi-user auth yet.
-- Enabling RLS with an open anon policy prevents the anon key
-- from being misused if it leaks, while still allowing the app
-- to read/write. Tighten to user_id-scoped policies in Phase 1
-- when PIN/auth is added.
-- ============================================================

alter table parties          enable row level security;
alter table receipts         enable row level security;
alter table production_orders enable row level security;
alter table dispatches       enable row level security;
alter table rola_returns     enable row level security;
alter table payments         enable row level security;
alter table expenses         enable row level security;
alter table sync_failures    enable row level security;

-- Temporary open policies for v1 (Phase 0–4, no auth)
create policy "anon_all_parties"           on parties           for all to anon using (true) with check (true);
create policy "anon_all_receipts"          on receipts          for all to anon using (true) with check (true);
create policy "anon_all_production_orders" on production_orders for all to anon using (true) with check (true);
create policy "anon_all_dispatches"        on dispatches        for all to anon using (true) with check (true);
create policy "anon_all_rola_returns"      on rola_returns      for all to anon using (true) with check (true);
create policy "anon_all_payments"          on payments          for all to anon using (true) with check (true);
create policy "anon_all_expenses"          on expenses          for all to anon using (true) with check (true);
create policy "anon_all_sync_failures"     on sync_failures     for all to anon using (true) with check (true);

-- ============================================================
-- Indexes for common query patterns
-- ============================================================
create index if not exists receipts_party_idx           on receipts          (party_id);
create index if not exists receipts_date_idx            on receipts          (date desc);
create index if not exists production_receipt_idx       on production_orders (receipt_id);
create index if not exists dispatches_party_idx         on dispatches        (party_id);
create index if not exists dispatches_date_idx          on dispatches        (date desc);
create index if not exists rola_returns_party_idx       on rola_returns      (party_id);
create index if not exists payments_party_idx           on payments          (party_id);
create index if not exists expenses_date_idx            on expenses          (date desc);
create index if not exists expenses_category_idx        on expenses          (category);
