-- ── Migration 002: Add Multi-Bag & Kali/Val fields to Dispatches ─────────────

ALTER TABLE dispatches
  ADD COLUMN IF NOT EXISTS dispatch_type text DEFAULT 'Val',
  ADD COLUMN IF NOT EXISTS challan_no text,
  ADD COLUMN IF NOT EXISTS bungari_weight_g numeric DEFAULT 70,
  ADD COLUMN IF NOT EXISTS rola_count int DEFAULT 0;
