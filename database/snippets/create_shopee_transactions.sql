
-- Create shopee_transactions table
CREATE TABLE IF NOT EXISTS public.shopee_transactions (
    id UUID DEFAULT gen_random_uuid() PRIMARY KEY,
    transaction_date TIMESTAMP WITH TIME ZONE,
    transaction_type TEXT,
    description TEXT,
    order_id TEXT,
    money_direction TEXT,
    amount DECIMAL(12, 2),
    status TEXT,
    wallet_balance DECIMAL(12, 2),
    created_at TIMESTAMP WITH TIME ZONE DEFAULT timezone('utc'::text, now())
);

-- Enable RLS
ALTER TABLE public.shopee_transactions ENABLE ROW LEVEL SECURITY;

-- Create policy for authenticated users
CREATE POLICY "Enable read access for authenticated users" ON public.shopee_transactions
    FOR SELECT
    TO authenticated
    USING (true);

CREATE POLICY "Enable insert access for authenticated users" ON public.shopee_transactions
    FOR INSERT
    TO authenticated
    WITH CHECK (true);

CREATE POLICY "Enable update access for authenticated users" ON public.shopee_transactions
    FOR UPDATE
    TO authenticated
    USING (true);

CREATE POLICY "Enable delete access for authenticated users" ON public.shopee_transactions
    FOR DELETE
    TO authenticated
    USING (true);

-- Grant permissions
GRANT ALL ON public.shopee_transactions TO authenticated;
GRANT ALL ON public.shopee_transactions TO service_role;
