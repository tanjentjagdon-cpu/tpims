-- ============================================
-- COMPLETE TIKTOK ORDERS TABLE SETUP
-- Run this entire script in Supabase SQL Editor
-- ============================================

-- Step 1: Create the table
CREATE TABLE IF NOT EXISTS public.tiktok_orders (
    id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
    user_id UUID REFERENCES auth.users(id),
    order_id TEXT NOT NULL,
    order_date TIMESTAMP WITH TIME ZONE NOT NULL,
    product_name TEXT NOT NULL,
    variation TEXT NOT NULL,
    quantity INTEGER NOT NULL,
    status TEXT NOT NULL,
    payout_status TEXT DEFAULT 'Pending',
    total_payment DECIMAL NOT NULL DEFAULT 0,
    estimated_income DECIMAL NOT NULL DEFAULT 0,
    
    -- Fee columns
    buyers_address TEXT,
    shipping_fee_paid_by_buyer DECIMAL DEFAULT 0,
    estimated_shipping_fee DECIMAL DEFAULT 0,
    shipping_fee_rebate DECIMAL DEFAULT 0,
    affiliate_commission DECIMAL DEFAULT 0,
    platform_commission DECIMAL DEFAULT 0,
    transaction_fee DECIMAL DEFAULT 0,
    tax DECIMAL DEFAULT 0,
    merchandise_subtotal DECIMAL DEFAULT 0,
    
    -- Additional fields
    tracking_number TEXT,
    shipping_provider TEXT,
    buyer_username TEXT,
    voucher_code TEXT,
    payment_method TEXT,
    date_paid TIMESTAMP WITH TIME ZONE,
    date_shipped TIMESTAMP WITH TIME ZONE,
    date_completed TIMESTAMP WITH TIME ZONE,
    date_released TIMESTAMP WITH TIME ZONE,
    
    created_at TIMESTAMP WITH TIME ZONE DEFAULT timezone('utc'::text, now()) NOT NULL
);

-- Step 2: Enable RLS
ALTER TABLE public.tiktok_orders ENABLE ROW LEVEL SECURITY;

-- Step 3: Create Policy (drop first if exists)
DROP POLICY IF EXISTS "Enable all for authenticated" ON public.tiktok_orders;

CREATE POLICY "Enable all for authenticated" ON public.tiktok_orders 
    FOR ALL TO authenticated 
    USING (true) 
    WITH CHECK (true);

-- Step 4: Create indexes
CREATE INDEX IF NOT EXISTS idx_tiktok_orders_order_id ON public.tiktok_orders(order_id);
CREATE INDEX IF NOT EXISTS idx_tiktok_orders_user_id ON public.tiktok_orders(user_id);

-- Step 5: Add unique constraint for upsert
-- First remove any duplicates
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

-- Add the unique constraint
ALTER TABLE public.tiktok_orders
ADD CONSTRAINT tiktok_orders_order_id_user_id_key 
UNIQUE (order_id, user_id);

-- Done!
SELECT 'TikTok orders table created successfully!' as message;
