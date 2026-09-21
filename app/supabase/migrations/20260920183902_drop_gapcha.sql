-- ============================================================
-- Drop Gapcha Feature (Remote Database Cleanup)
-- Description: Removes all foreign keys, columns, and tables
-- associated with the deprecated Gapcha feature.
-- ============================================================

-- 1. Drop the foreign keys and columns from receipts and dispatches
alter table receipts drop constraint if exists receipts_reconciliation_id_fkey;
alter table dispatches drop constraint if exists dispatches_reconciliation_id_fkey;

alter table receipts drop column if exists reconciliation_id;
alter table dispatches drop column if exists reconciliation_id;

-- 2. Drop the Gapcha tables
drop table if exists gapcha_sales cascade;
drop table if exists gapcha_reconciliations cascade;
