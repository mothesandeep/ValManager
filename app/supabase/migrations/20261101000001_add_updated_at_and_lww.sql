-- ============================================================
-- KASAB VAL MANAGER: Add updated_at & Last-Write-Wins (LWW) Support
-- ============================================================

-- 1. ADD updated_at COLUMNS TO ALL CORE TABLES
alter table if exists parties add column if not exists updated_at timestamptz default now();
alter table if exists receipts add column if not exists updated_at timestamptz default now();
alter table if exists dispatches add column if not exists updated_at timestamptz default now();
alter table if exists payments add column if not exists updated_at timestamptz default now();
alter table if exists expenses add column if not exists updated_at timestamptz default now();

-- 2. TRIGGER FUNCTION TO AUTO-UPDATE updated_at TIMESTAMP
create or replace function set_updated_at_column()
returns trigger as $$
begin
  new.updated_at = now();
  return new;
end;
$$ language plpgsql;

-- 3. ATTACH BEFORE UPDATE TRIGGERS
drop trigger if exists set_parties_updated_at on parties;
create trigger set_parties_updated_at
  before update on parties
  for each row execute function set_updated_at_column();

drop trigger if exists set_receipts_updated_at on receipts;
create trigger set_receipts_updated_at
  before update on receipts
  for each row execute function set_updated_at_column();

drop trigger if exists set_dispatches_updated_at on dispatches;
create trigger set_dispatches_updated_at
  before update on dispatches
  for each row execute function set_updated_at_column();

drop trigger if exists set_payments_updated_at on payments;
create trigger set_payments_updated_at
  before update on payments
  for each row execute function set_updated_at_column();

drop trigger if exists set_expenses_updated_at on expenses;
create trigger set_expenses_updated_at
  before update on expenses
  for each row execute function set_updated_at_column();
