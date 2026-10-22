-- ============================================================
-- Baseline Migration: Generated from ACTUAL remote schema
-- Project: xlkatnqmqhnzrmdiwdyf
-- Captured: 2026-09-20
-- Replaces: 001 through 005_party_weights_settings
--
-- NOTE: This was introspected from the live remote database.
--       DO NOT apply 005_secure_rls.sql or 006_add_bori_count.sql.
--       Test locally with: supabase db reset
-- ============================================================

-- ── EXTENSIONS ──────────────────────────────────────────────
create extension if not exists "pgcrypto";

-- ── TABLE: parties ──────────────────────────────────────────
create table if not exists parties (
  id                      uuid primary key default gen_random_uuid(),
  name                    text not null,
  phone                   text,
  address                 text,
  notes                   text,
  created_at              timestamptz default now(),
  default_rola_weight_g   integer default 200,
  default_bungari_weight_g integer default 70
);

-- ── TABLE: receipts ─────────────────────────────────────────
create table if not exists receipts (
  id                uuid primary key default gen_random_uuid(),
  party_id          uuid references parties(id) on delete restrict,
  date              date not null,
  color             text,
  gross_weight      numeric not null,
  tare_weight       numeric default 0,
  net_weight        numeric,
  challan_no        text,
  rola_count        integer default 0,
  created_at        timestamptz default now(),
  status            text default 'Pending'
);

-- ── TABLE: dispatches ───────────────────────────────────────
create table if not exists dispatches (
  id                uuid primary key default gen_random_uuid(),
  party_id          uuid references parties(id) on delete restrict,
  date              date not null,
  bungari_count     integer default 0,
  bore_gross_weight numeric not null,
  net_val_weight    numeric,
  rate_per_kg       numeric,
  amount            numeric,
  created_at        timestamptz default now(),
  dispatch_type     text default 'Val',
  challan_no        text,
  bungari_weight_g  numeric default 70,
  rola_count        integer default 0,
  cord_count        integer,
  twist_type        text
);

-- ── TABLE: payments ─────────────────────────────────────────
create table if not exists payments (
  id         uuid primary key default gen_random_uuid(),
  party_id   uuid references parties(id) on delete restrict,
  date       date not null,
  amount     numeric not null,
  note       text,
  created_at timestamptz default now()
);

-- ── TABLE: expenses ─────────────────────────────────────────
create table if not exists expenses (
  id         uuid primary key default gen_random_uuid(),
  date       date not null,
  category   text not null,
  amount     numeric not null,
  note       text,
  created_at timestamptz default now()
);

-- ── TABLE: sync_failures ────────────────────────────────────
create table if not exists sync_failures (
  id           uuid primary key default gen_random_uuid(),
  table_name   text,
  record_id    uuid,
  error        text,
  attempted_at timestamptz default now()
);

-- ── TABLE: rola_returns (kept for backward compat, 0 rows) ──
create table if not exists rola_returns (
  id         uuid primary key default gen_random_uuid(),
  party_id   uuid references parties(id) on delete restrict,
  date       date not null,
  rola_count integer not null,
  created_at timestamptz default now()
);

-- ── TABLE: production_orders (kept, 0 rows) ─────────────────
create table if not exists production_orders (
  id         uuid primary key default gen_random_uuid(),
  receipt_id uuid references receipts(id) on delete restrict,
  cord_count integer,
  twist_type text,
  waste      numeric default 0,
  status     text default 'Pending',
  created_at timestamptz default now()
);

-- ── INDEXES ─────────────────────────────────────────────────
create index if not exists receipts_party_idx                  on receipts               (party_id);
create index if not exists receipts_date_idx                   on receipts               (date desc);
create index if not exists dispatches_party_idx                on dispatches             (party_id);
create index if not exists dispatches_date_idx                 on dispatches             (date desc);
create index if not exists payments_party_idx                  on payments               (party_id);
create index if not exists expenses_date_idx                   on expenses               (date desc);
create index if not exists expenses_category_idx               on expenses               (category);
create index if not exists rola_returns_party_idx              on rola_returns           (party_id);
create index if not exists production_receipt_idx              on production_orders      (receipt_id);

-- ── ROW LEVEL SECURITY ───────────────────────────────────────
-- Open anon policies (current remote state — NOT the PIN-based 005_secure_rls.sql)
alter table parties               enable row level security;
alter table receipts              enable row level security;
alter table dispatches            enable row level security;
alter table payments              enable row level security;
alter table expenses              enable row level security;
alter table sync_failures         enable row level security;
alter table rola_returns          enable row level security;
alter table production_orders     enable row level security;

create policy "anon_all_parties"               on parties               for all to anon using (true) with check (true);
create policy "anon_all_receipts"              on receipts              for all to anon using (true) with check (true);
create policy "anon_all_dispatches"            on dispatches            for all to anon using (true) with check (true);
create policy "anon_all_payments"              on payments              for all to anon using (true) with check (true);
create policy "anon_all_expenses"              on expenses              for all to anon using (true) with check (true);
create policy "anon_all_sync_failures"         on sync_failures         for all to anon using (true) with check (true);
create policy "anon_all_rola_returns"          on rola_returns          for all to anon using (true) with check (true);
create policy "anon_all_production_orders"     on production_orders     for all to anon using (true) with check (true);
