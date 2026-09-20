-- Migration: 005_secure_rls
-- Description: Drops open anon policies and replaces them with a Master PIN requirement

-- 1. Drop existing open policies
drop policy if exists "anon_all_parties" on parties;
drop policy if exists "anon_all_receipts" on receipts;
drop policy if exists "anon_all_production_orders" on production_orders;
drop policy if exists "anon_all_dispatches" on dispatches;
drop policy if exists "anon_all_rola_returns" on rola_returns;
drop policy if exists "anon_all_payments" on payments;
drop policy if exists "anon_all_expenses" on expenses;
drop policy if exists "anon_all_sync_failures" on sync_failures;
drop policy if exists "anon_all_gapcha_sales" on gapcha_sales;
drop policy if exists "anon_all_gapcha_reconciliations" on gapcha_reconciliations;

-- 2. Create new secure policies requiring the 'x-app-pin' header
-- We use a Master PIN of '7878' (this can be changed later)

create policy "pin_secured_parties" on parties for all to anon 
using (current_setting('request.headers', true)::json->>'x-app-pin' = '7878') 
with check (current_setting('request.headers', true)::json->>'x-app-pin' = '7878');

create policy "pin_secured_receipts" on receipts for all to anon 
using (current_setting('request.headers', true)::json->>'x-app-pin' = '7878') 
with check (current_setting('request.headers', true)::json->>'x-app-pin' = '7878');

create policy "pin_secured_production_orders" on production_orders for all to anon 
using (current_setting('request.headers', true)::json->>'x-app-pin' = '7878') 
with check (current_setting('request.headers', true)::json->>'x-app-pin' = '7878');

create policy "pin_secured_dispatches" on dispatches for all to anon 
using (current_setting('request.headers', true)::json->>'x-app-pin' = '7878') 
with check (current_setting('request.headers', true)::json->>'x-app-pin' = '7878');

create policy "pin_secured_rola_returns" on rola_returns for all to anon 
using (current_setting('request.headers', true)::json->>'x-app-pin' = '7878') 
with check (current_setting('request.headers', true)::json->>'x-app-pin' = '7878');

create policy "pin_secured_payments" on payments for all to anon 
using (current_setting('request.headers', true)::json->>'x-app-pin' = '7878') 
with check (current_setting('request.headers', true)::json->>'x-app-pin' = '7878');

create policy "pin_secured_expenses" on expenses for all to anon 
using (current_setting('request.headers', true)::json->>'x-app-pin' = '7878') 
with check (current_setting('request.headers', true)::json->>'x-app-pin' = '7878');

create policy "pin_secured_sync_failures" on sync_failures for all to anon 
using (current_setting('request.headers', true)::json->>'x-app-pin' = '7878') 
with check (current_setting('request.headers', true)::json->>'x-app-pin' = '7878');

create policy "pin_secured_gapcha_sales" on gapcha_sales for all to anon 
using (current_setting('request.headers', true)::json->>'x-app-pin' = '7878') 
with check (current_setting('request.headers', true)::json->>'x-app-pin' = '7878');

create policy "pin_secured_gapcha_reconciliations" on gapcha_reconciliations for all to anon 
using (current_setting('request.headers', true)::json->>'x-app-pin' = '7878') 
with check (current_setting('request.headers', true)::json->>'x-app-pin' = '7878');
