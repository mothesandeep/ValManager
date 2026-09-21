-- Step 1: Remove the foreign key constraints from receipts and dispatches
alter table if exists receipts drop constraint if exists receipts_reconciliation_id_fkey;
alter table if exists dispatches drop constraint if exists dispatches_reconciliation_id_fkey;

-- Step 2: Drop the indices for reconciliation_id
drop index if exists receipts_reconciliation_idx;
drop index if exists dispatches_reconciliation_idx;

-- Step 3: Drop the reconciliation_id columns
alter table if exists receipts drop column if exists reconciliation_id;
alter table if exists dispatches drop column if exists reconciliation_id;

-- Step 4: Drop the gapcha_sales and gapcha_reconciliations tables
drop table if exists gapcha_sales cascade;
drop table if exists gapcha_reconciliations cascade;
