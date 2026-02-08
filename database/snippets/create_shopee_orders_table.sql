-- Create shopee_orders table
CREATE TABLE IF NOT EXISTS public.shopee_orders (
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
    support_program_fee DECIMAL DEFAULT 0,
    service_fee DECIMAL DEFAULT 0,
    transaction_fee DECIMAL DEFAULT 0,
    tax DECIMAL DEFAULT 0,
    merchandise_subtotal DECIMAL DEFAULT 0,
    
    created_at TIMESTAMP WITH TIME ZONE DEFAULT timezone('utc'::text, now()) NOT NULL
);

-- Enable RLS
ALTER TABLE public.shopee_orders ENABLE ROW LEVEL SECURITY;

-- Create Policy
CREATE POLICY "Enable all for authenticated" ON public.shopee_orders 
    FOR ALL TO authenticated 
    USING (true) 
    WITH CHECK (true);

-- Create index for faster queries
CREATE INDEX IF NOT EXISTS idx_shopee_orders_order_id ON public.shopee_orders(order_id);
CREATE INDEX IF NOT EXISTS idx_shopee_orders_user_id ON public.shopee_orders(user_id);
CREATE INDEX IF NOT EXISTS idx_shopee_orders_order_date ON public.shopee_orders(order_date DESC);

-- Notify PostgREST to reload schema
NOTIFY pgrst, 'reload schema';
