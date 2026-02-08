-- Create restock_history table
CREATE TABLE IF NOT EXISTS public.restock_history (
    id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
    product_id UUID REFERENCES public.products(id) ON DELETE CASCADE,
    quantity DECIMAL NOT NULL,
    cost_at_restock DECIMAL NOT NULL,
    restock_date DATE NOT NULL DEFAULT CURRENT_DATE,
    created_at TIMESTAMP WITH TIME ZONE DEFAULT timezone('utc'::text, now()) NOT NULL,
    user_id UUID REFERENCES auth.users(id)
);

-- Create expenses table
CREATE TABLE IF NOT EXISTS public.expenses (
    id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
    description TEXT,
    amount DECIMAL NOT NULL,
    quantity DECIMAL,
    unit_cost DECIMAL,
    category TEXT,
    expense_date DATE NOT NULL DEFAULT CURRENT_DATE,
    created_at TIMESTAMP WITH TIME ZONE DEFAULT timezone('utc'::text, now()) NOT NULL,
    product_id UUID REFERENCES public.products(id) ON DELETE SET NULL,
    user_id UUID REFERENCES auth.users(id)
);

-- Create sales_orders table
CREATE TABLE IF NOT EXISTS public.sales_orders (
    id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
    product_id UUID REFERENCES public.products(id) ON DELETE CASCADE,
    quantity DECIMAL NOT NULL,
    platform TEXT NOT NULL, -- 'Shopee' or 'Tiktok'
    sale_date DATE NOT NULL DEFAULT CURRENT_DATE,
    created_at TIMESTAMP WITH TIME ZONE DEFAULT timezone('utc'::text, now()) NOT NULL,
    user_id UUID REFERENCES auth.users(id)
);

-- Enable RLS
ALTER TABLE public.restock_history ENABLE ROW LEVEL SECURITY;
ALTER TABLE public.expenses ENABLE ROW LEVEL SECURITY;
ALTER TABLE public.sales_orders ENABLE ROW LEVEL SECURITY;

-- Create Policies (Simplified for the user)
CREATE POLICY "Enable all for authenticated" ON public.restock_history FOR ALL TO authenticated USING (true) WITH CHECK (true);
CREATE POLICY "Enable all for authenticated" ON public.expenses FOR ALL TO authenticated USING (true) WITH CHECK (true);
CREATE POLICY "Enable all for authenticated" ON public.sales_orders FOR ALL TO authenticated USING (true) WITH CHECK (true);

-- Notify PostgREST to reload schema
NOTIFY pgrst, 'reload schema';
