-- Add unique constraint for tiktok_orders to enable upsert
-- This allows us to use upsert with onConflict

-- First, check if there are any duplicate order_id + user_id combinations
-- If there are, we'll keep only the most recent one

WITH ranked_orders AS (
    SELECT 
        id,
        ROW_NUMBER() OVER (PARTITION BY order_id, user_id ORDER BY created_at DESC) as rn
    FROM public.tiktok_orders
)
DELETE FROM public.tiktok_orders
WHERE id IN (
    SELECT id FROM ranked_orders WHERE rn > 1
);

-- Now add the unique constraint
ALTER TABLE public.tiktok_orders
ADD CONSTRAINT tiktok_orders_order_id_user_id_key 
UNIQUE (order_id, user_id);

-- Notify PostgREST to reload schema
NOTIFY pgrst, 'reload schema';
