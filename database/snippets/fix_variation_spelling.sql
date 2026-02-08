-- Migration: Fix variation spelling typo
-- Run this in Supabase SQL Editor

ALTER TABLE public.products RENAME COLUMN varation TO variation;

-- Ensure RLS is still working correctly
-- (Renaming a column usually doesn't break RLS if the policy uses *, 
-- but if it references the column specifically, we might need to update it.)
-- Our policies use user_id, which is fine.

-- Also ensure storage bucket exists for images
-- Run this if you haven't already:
-- INSERT INTO storage.buckets (id, name, public) VALUES ('product-images', 'product-images', true) ON CONFLICT DO NOTHING;

NOTIFY pgrst, 'reload schema';
