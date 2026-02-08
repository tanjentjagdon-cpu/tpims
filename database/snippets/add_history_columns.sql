-- Add order_history column if not exists
ALTER TABLE public.shopee_orders
ADD COLUMN IF NOT EXISTS order_history JSONB DEFAULT '[]'::jsonb;

-- Add shipping_history column if not exists
ALTER TABLE public.shopee_orders
ADD COLUMN IF NOT EXISTS shipping_history JSONB DEFAULT '[]'::jsonb;

NOTIFY pgrst, 'reload schema';
