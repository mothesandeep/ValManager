-- ============================================================
-- KASAB VAL MANAGER: Challan Image Storage & URLs Setup
-- Safe to run in Supabase SQL Editor (Idempotent)
-- ============================================================

-- 1. Ensure image_url column exists on receipts table
alter table receipts add column if not exists image_url text;

-- 2. Ensure image_url column exists on dispatches table
alter table dispatches add column if not exists image_url text;

-- 3. Create storage bucket for challan images if not exists
insert into storage.buckets (id, name, public)
values ('challan-images', 'challan-images', true)
on conflict (id) do update set public = true;

-- 4. Enable public read access for challan-images bucket
create policy if not exists "Allow public read access on challan-images"
  on storage.objects for select
  using (bucket_id = 'challan-images');

-- 5. Enable secure uploads to challan-images bucket (Requires authorized app/user token)
create policy if not exists "Allow uploads to challan-images"
  on storage.objects for insert
  with check (bucket_id = 'challan-images' and public.is_app_authorized());

-- 6. Enable secure updates to challan-images bucket (Requires authorized app/user token)
create policy if not exists "Allow updates to challan-images"
  on storage.objects for update
  using (bucket_id = 'challan-images' and public.is_app_authorized());
