-- ============================================================
-- KASAB VAL MANAGER: Party Aliases & Nickname Matching
-- Safe to run in Supabase SQL Editor (Idempotent)
-- ============================================================

-- 1. Add aliases text array column to parties table if not exists
alter table parties add column if not exists aliases text[] default '{}'::text[];

-- 2. Create GIN index for high-performance alias lookup
create index if not exists idx_parties_aliases on parties using gin(aliases);

-- 3. Populate aliases for Vijay Navadiya
update parties
set aliases = array['Vijay Bhai', 'Vijay']
where id = 'c5cf275e-ea77-4ccf-8576-e72b6d131af4'
  and (aliases is null or cardinality(aliases) = 0);
