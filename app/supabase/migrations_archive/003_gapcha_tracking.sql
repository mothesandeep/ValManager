-- ============================================================
-- Migration 003: Gapcha (Sellable Surplus Weight) Tracking
-- ============================================================

-- Table to record sales of surplus/gapcha weight to external buyers
create table if not exists gapcha_sales (
  id            uuid primary key default gen_random_uuid(),
  party_id      uuid references parties(id) on delete set null, -- optional origin party attribution
  buyer_name    text not null,                                   -- buyer / customer name
  date          date not null,
  weight_kg     numeric not null,                               -- weight sold in kg
  rate_per_kg   numeric,                                        -- rate in ₹/kg (optional)
  amount        numeric,                                        -- amount = weight_kg * rate_per_kg (optional)
  note          text,                                           -- optional notes
  created_at    timestamptz default now()
);

-- Enable RLS
alter table gapcha_sales enable row level security;

-- Open policy for single operator v1
create policy "anon_all_gapcha_sales" on gapcha_sales for all to anon using (true) with check (true);

-- Indexes for queries
create index if not exists gapcha_sales_party_idx on gapcha_sales (party_id);
create index if not exists gapcha_sales_date_idx on gapcha_sales (date desc);
