-- ============================================================
-- Migration 004: Batch-based Gapcha Reconciliation
-- ============================================================

-- Table to store closed/reconciled production batches
create table if not exists gapcha_reconciliations (
  id                  uuid primary key default gen_random_uuid(),
  party_id            uuid references parties(id) on delete restrict,
  date                date not null,
  input_kasab_weight  numeric not null default 0,
  output_val_weight   numeric not null default 0,
  output_kali_weight  numeric not null default 0,
  reconciled_output   numeric not null default 0,
  gapcha_weight       numeric not null default 0,
  note                text,
  created_at          timestamptz default now()
);

-- Add linking columns to receipts and dispatches
alter table receipts
  add column if not exists reconciliation_id uuid references gapcha_reconciliations(id) on delete set null,
  add column if not exists status text default 'Pending';

alter table dispatches
  add column if not exists reconciliation_id uuid references gapcha_reconciliations(id) on delete set null;

-- Enable RLS
alter table gapcha_reconciliations enable row level security;

-- Open policy for single operator v1
create policy "anon_all_gapcha_reconciliations" on gapcha_reconciliations for all to anon using (true) with check (true);

-- Indexes
create index if not exists gapcha_reconciliations_party_idx on gapcha_reconciliations (party_id);
create index if not exists gapcha_reconciliations_date_idx on gapcha_reconciliations (date desc);
create index if not exists receipts_reconciliation_idx on receipts (reconciliation_id);
create index if not exists dispatches_reconciliation_idx on dispatches (reconciliation_id);
