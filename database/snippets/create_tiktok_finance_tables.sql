-- Create tiktok_finance_statements table
CREATE TABLE IF NOT EXISTS tiktok_finance_statements (
    id TEXT PRIMARY KEY, -- statement_id
    shop_id TEXT NOT NULL,
    statement_time BIGINT,
    payment_status TEXT, -- 'PAID', 'UNPAID', etc.
    revenue_amount NUMERIC,
    fee_amount NUMERIC,
    adjustment_amount NUMERIC,
    settlement_amount NUMERIC,
    currency TEXT DEFAULT 'PHP',
    raw_data JSONB,
    created_at TIMESTAMP WITH TIME ZONE DEFAULT timezone('utc'::text, now()),
    updated_at TIMESTAMP WITH TIME ZONE DEFAULT timezone('utc'::text, now())
);

-- Create tiktok_finance_payments table
CREATE TABLE IF NOT EXISTS tiktok_finance_payments (
    id TEXT PRIMARY KEY, -- payment_id
    shop_id TEXT NOT NULL,
    create_time BIGINT,
    amount NUMERIC,
    currency TEXT DEFAULT 'PHP',
    status TEXT,
    bank_account_number TEXT,
    raw_data JSONB,
    created_at TIMESTAMP WITH TIME ZONE DEFAULT timezone('utc'::text, now()),
    updated_at TIMESTAMP WITH TIME ZONE DEFAULT timezone('utc'::text, now())
);

-- RLS Policies (Open for now based on user context, but good to have prepared)
ALTER TABLE tiktok_finance_statements ENABLE ROW LEVEL SECURITY;
ALTER TABLE tiktok_finance_payments ENABLE ROW LEVEL SECURITY;

CREATE POLICY "Enable read access for authenticated users" ON tiktok_finance_statements FOR SELECT USING (auth.role() = 'authenticated');
CREATE POLICY "Enable insert access for authenticated users" ON tiktok_finance_statements FOR INSERT WITH CHECK (auth.role() = 'authenticated');
CREATE POLICY "Enable update access for authenticated users" ON tiktok_finance_statements FOR UPDATE USING (auth.role() = 'authenticated');

CREATE POLICY "Enable read access for authenticated users" ON tiktok_finance_payments FOR SELECT USING (auth.role() = 'authenticated');
CREATE POLICY "Enable insert access for authenticated users" ON tiktok_finance_payments FOR INSERT WITH CHECK (auth.role() = 'authenticated');
CREATE POLICY "Enable update access for authenticated users" ON tiktok_finance_payments FOR UPDATE USING (auth.role() = 'authenticated');
