-- Add unique constraint to prevent duplicates
ALTER TABLE public.shopee_orders 
ADD CONSTRAINT shopee_orders_order_id_variation_key UNIQUE (order_id, variation);

-- Add missing columns if they don't exist
ALTER TABLE public.shopee_orders 
ADD COLUMN IF NOT EXISTS commission_fee DECIMAL DEFAULT 0,
ADD COLUMN IF NOT EXISTS service_fee DECIMAL DEFAULT 0,
ADD COLUMN IF NOT EXISTS transaction_fee DECIMAL DEFAULT 0,
ADD COLUMN IF NOT EXISTS shipping_fee_rebate DECIMAL DEFAULT 0,
ADD COLUMN IF NOT EXISTS support_program_fee DECIMAL DEFAULT 0,
ADD COLUMN IF NOT EXISTS voucher_code TEXT,
ADD COLUMN IF NOT EXISTS shopee_voucher DECIMAL DEFAULT 0,
ADD COLUMN IF NOT EXISTS date_released TIMESTAMP WITH TIME ZONE;
