-- Migration: Add default rola and bungari weights to parties table
ALTER TABLE public.parties 
ADD COLUMN IF NOT EXISTS default_rola_weight_g integer DEFAULT 200,
ADD COLUMN IF NOT EXISTS default_bungari_weight_g integer DEFAULT 70;
