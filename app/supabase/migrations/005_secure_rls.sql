-- ============================================================
-- 005: Secure Row Level Security (RLS)
-- Description: Locks down the anon policies so that only requests
-- containing the correct x-app-pin header can read/write data.
-- ============================================================

-- Create a helper function to verify the PIN from the request headers
create or replace function public.is_app_authorized()
returns boolean as $$
declare
  app_pin text;
begin
  -- Extract the x-app-pin from the request headers sent by Supabase JS client
  app_pin := current_setting('request.headers', true)::json->>'x-app-pin';
  
  -- The Master PIN is hardcoded here to match the frontend VITE_MASTER_PIN.
  -- Default in frontend is '7878'. If you change it in .env.local, you must
  -- update this SQL function.
  return app_pin = '7878';
end;
$$ language plpgsql security definer;

-- Drop the old fully open policies
drop policy if exists "anon_all_parties" on parties;
drop policy if exists "anon_all_receipts" on receipts;
drop policy if exists "anon_all_dispatches" on dispatches;
drop policy if exists "anon_all_gapcha_reconciliations" on gapcha_reconciliations;
drop policy if exists "anon_all_gapcha_sales" on gapcha_sales;
drop policy if exists "anon_all_payments" on payments;
drop policy if exists "anon_all_expenses" on expenses;
drop policy if exists "anon_all_sync_failures" on sync_failures;
drop policy if exists "anon_all_rola_returns" on rola_returns;
drop policy if exists "anon_all_production_orders" on production_orders;

-- Create the new PIN-secured policies
create policy "pin_secure_parties" on parties for all to anon using (public.is_app_authorized()) with check (public.is_app_authorized());
create policy "pin_secure_receipts" on receipts for all to anon using (public.is_app_authorized()) with check (public.is_app_authorized());
create policy "pin_secure_dispatches" on dispatches for all to anon using (public.is_app_authorized()) with check (public.is_app_authorized());
create policy "pin_secure_gapcha_reconciliations" on gapcha_reconciliations for all to anon using (public.is_app_authorized()) with check (public.is_app_authorized());
create policy "pin_secure_gapcha_sales" on gapcha_sales for all to anon using (public.is_app_authorized()) with check (public.is_app_authorized());
create policy "pin_secure_payments" on payments for all to anon using (public.is_app_authorized()) with check (public.is_app_authorized());
create policy "pin_secure_expenses" on expenses for all to anon using (public.is_app_authorized()) with check (public.is_app_authorized());
create policy "pin_secure_sync_failures" on sync_failures for all to anon using (public.is_app_authorized()) with check (public.is_app_authorized());
create policy "pin_secure_rola_returns" on rola_returns for all to anon using (public.is_app_authorized()) with check (public.is_app_authorized());
create policy "pin_secure_production_orders" on production_orders for all to anon using (public.is_app_authorized()) with check (public.is_app_authorized());
