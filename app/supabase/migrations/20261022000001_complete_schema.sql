-- ============================================================
-- KASAB VAL MANAGER: Complete & Verified Schema Setup
-- Safe to run in Supabase SQL Editor (Idempotent)
-- ============================================================

-- 1. EXTENSIONS
create extension if not exists "pgcrypto";

-- 2. PARTIES TABLE
create table if not exists parties (
  id                       uuid primary key default gen_random_uuid(),
  name                     text not null,
  phone                    text,
  address                  text,
  notes                    text,
  default_rola_weight_g    integer default 200,
  default_bungari_weight_g integer default 70,
  created_at               timestamptz default now()
);

-- Ensure party-wise weight columns exist
alter table parties add column if not exists default_rola_weight_g integer default 200;
alter table parties add column if not exists default_bungari_weight_g integer default 70;

-- 3. RECEIPTS TABLE (Inward Kasab)
create table if not exists receipts (
  id           uuid primary key default gen_random_uuid(),
  party_id     uuid references parties(id) on delete restrict,
  date         date not null,
  color        text,
  gross_weight numeric not null,
  tare_weight  numeric default 0,
  net_weight   numeric,
  challan_no   text,
  rola_count   integer default 0,
  bori_count   integer default 1,
  status       text default 'Pending',
  created_at   timestamptz default now()
);

-- Ensure missing columns exist
alter table receipts add column if not exists bori_count integer default 1;
alter table receipts add column if not exists challan_no text;
alter table receipts add column if not exists status text default 'Pending';

-- 4. DISPATCHES TABLE (Outward Val / Kali / Rola)
create table if not exists dispatches (
  id                uuid primary key default gen_random_uuid(),
  party_id          uuid references parties(id) on delete restrict,
  date              date not null,
  dispatch_type     text default 'Val',
  challan_no        text,
  cord_count        integer,
  twist_type        text,
  bungari_count     integer default 0,
  bungari_weight_g  numeric default 70,
  bore_gross_weight numeric not null,
  net_val_weight    numeric,
  rate_per_kg       numeric,
  amount            numeric,
  rola_count        integer default 0,
  bori_count        integer default 0,
  created_at        timestamptz default now()
);

-- Ensure multi-bag & tar columns exist
alter table dispatches add column if not exists dispatch_type text default 'Val';
alter table dispatches add column if not exists challan_no text;
alter table dispatches add column if not exists cord_count integer;
alter table dispatches add column if not exists twist_type text;
alter table dispatches add column if not exists bungari_count integer default 0;
alter table dispatches add column if not exists bungari_weight_g numeric default 70;
alter table dispatches add column if not exists rola_count integer default 0;
alter table dispatches add column if not exists bori_count integer default 0;

-- 5. PAYMENTS TABLE
create table if not exists payments (
  id         uuid primary key default gen_random_uuid(),
  party_id   uuid references parties(id) on delete restrict,
  date       date not null,
  amount     numeric not null,
  note       text,
  created_at timestamptz default now()
);

-- 6. EXPENSES TABLE
create table if not exists expenses (
  id         uuid primary key default gen_random_uuid(),
  date       date not null,
  category   text not null,
  amount     numeric not null,
  note       text,
  created_at timestamptz default now()
);

-- 7. SYNC FAILURES (Offline Audit Log)
create table if not exists sync_failures (
  id           uuid primary key default gen_random_uuid(),
  table_name   text,
  record_id    uuid,
  error        text,
  attempted_at timestamptz default now()
);

-- 8. COMPATIBILITY TABLES (Rola Returns & Production Orders)
create table if not exists rola_returns (
  id         uuid primary key default gen_random_uuid(),
  party_id   uuid references parties(id) on delete restrict,
  date       date not null,
  rola_count integer not null,
  created_at timestamptz default now()
);

create table if not exists production_orders (
  id         uuid primary key default gen_random_uuid(),
  receipt_id uuid references receipts(id) on delete restrict,
  cord_count integer,
  twist_type text,
  waste      numeric default 0,
  status     text default 'Pending',
  created_at timestamptz default now()
);

-- 9. PERFORMANCE INDEXES
create index if not exists receipts_party_idx      on receipts   (party_id);
create index if not exists receipts_date_idx       on receipts   (date desc);
create index if not exists dispatches_party_idx    on dispatches (party_id);
create index if not exists dispatches_date_idx     on dispatches (date desc);
create index if not exists payments_party_idx      on payments   (party_id);
create index if not exists expenses_date_idx       on expenses   (date desc);
create index if not exists expenses_category_idx   on expenses   (category);

-- 10. ROW LEVEL SECURITY (RLS)
alter table parties           enable row level security;
alter table receipts          enable row level security;
alter table dispatches        enable row level security;
alter table payments          enable row level security;
alter table expenses          enable row level security;
alter table sync_failures     enable row level security;
alter table rola_returns      enable row level security;
alter table production_orders enable row level security;

-- Open Anon Policies (Allows frontend with anon key to perform CRUD)
drop policy if exists "anon_all_parties" on parties;
drop policy if exists "anon_all_receipts" on receipts;
drop policy if exists "anon_all_dispatches" on dispatches;
drop policy if exists "anon_all_payments" on payments;
drop policy if exists "anon_all_expenses" on expenses;
drop policy if exists "anon_all_sync_failures" on sync_failures;
drop policy if exists "anon_all_rola_returns" on rola_returns;
drop policy if exists "anon_all_production_orders" on production_orders;

create policy "anon_all_parties"           on parties           for all to anon using (true) with check (true);
create policy "anon_all_receipts"          on receipts          for all to anon using (true) with check (true);
create policy "anon_all_dispatches"        on dispatches        for all to anon using (true) with check (true);
create policy "anon_all_payments"          on payments          for all to anon using (true) with check (true);
create policy "anon_all_expenses"          on expenses          for all to anon using (true) with check (true);
create policy "anon_all_sync_failures"     on sync_failures     for all to anon using (true) with check (true);
create policy "anon_all_rola_returns"      on rola_returns      for all to anon using (true) with check (true);
create policy "anon_all_production_orders" on production_orders for all to anon using (true) with check (true);
