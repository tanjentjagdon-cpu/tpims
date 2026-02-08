-- Create tiktok_orders table
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
    
    -- Fee columns (TikTok specific might differ, but using Shopee structure for now as requested to copy)
    buyers_address TEXT,
    shipping_fee_paid_by_buyer DECIMAL DEFAULT 0,
    estimated_shipping_fee DECIMAL DEFAULT 0,
    shipping_fee_rebate DECIMAL DEFAULT 0,
    affiliate_commission DECIMAL DEFAULT 0, -- TikTok specific
    platform_commission DECIMAL DEFAULT 0, -- TikTok specific
    transaction_fee DECIMAL DEFAULT 0,
    tax DECIMAL DEFAULT 0,
    merchandise_subtotal DECIMAL DEFAULT 0,
    
    -- Additional fields from Shopee that might map
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

-- Enable RLS
ALTER TABLE public.tiktok_orders ENABLE ROW LEVEL SECURITY;

-- Create Policy
CREATE POLICY "Enable all for authenticated" ON public.tiktok_orders 
    FOR ALL TO authenticated 
    USING (true) 
    WITH CHECK (true);

-- Create index for faster queries
CREATE INDEX IF NOT EXISTS idx_tiktok_orders_order_id ON public.tiktok_orders(order_id);
CREATE INDEX IF NOT EXISTS idx_tiktok_orders_user_id ON public.tiktok_orders(user_id);

-- Notify PostgREST to reload schema
NOTIFY pgrst, 'reload schema';
