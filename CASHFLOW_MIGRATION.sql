-- TelaPhoria IMS - CashFlow Table Migration
-- Run this in Supabase SQL Editor (Dashboard > SQL Editor > New Query)

-- Create cashflow table for tracking income/expenses
CREATE TABLE IF NOT EXISTS cashflows (
  id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  user_id UUID NOT NULL REFERENCES auth.users(id) ON DELETE CASCADE,
  type VARCHAR(50) NOT NULL CHECK (type IN ('Released Income', 'Expense', 'Return', 'Discount', 'Refund', 'Other')),
  amount DECIMAL(10, 2) NOT NULL,
  description TEXT,
  reference_id VARCHAR(255), -- sale_id or other reference
  notes TEXT,
  created_at TIMESTAMP WITH TIME ZONE DEFAULT NOW(),
  updated_at TIMESTAMP WITH TIME ZONE DEFAULT NOW()
);

-- Create indexes for performance
CREATE INDEX idx_user_cashflows ON cashflows(user_id);
CREATE INDEX idx_type ON cashflows(type);
CREATE INDEX idx_created_at ON cashflows(created_at);
CREATE INDEX idx_reference_id ON cashflows(reference_id);

-- Enable Row Level Security (RLS) for cashflows
ALTER TABLE cashflows ENABLE ROW LEVEL SECURITY;

-- Create RLS policy: Users can only see their own cashflows
CREATE POLICY "Users can view their own cashflows"
  ON cashflows
  FOR SELECT
  USING (auth.uid() = user_id);

-- Create RLS policy: Users can insert their own cashflows
CREATE POLICY "Users can insert their own cashflows"
  ON cashflows
  FOR INSERT
  WITH CHECK (auth.uid() = user_id);

-- Create RLS policy: Users can update their own cashflows
CREATE POLICY "Users can update their own cashflows"
  ON cashflows
  FOR UPDATE
  USING (auth.uid() = user_id)
  WITH CHECK (auth.uid() = user_id);

-- Create RLS policy: Users can delete their own cashflows
CREATE POLICY "Users can delete their own cashflows"
  ON cashflows
  FOR DELETE
  USING (auth.uid() = user_id);

-- Create trigger to auto-update updated_at column
CREATE OR REPLACE FUNCTION update_cashflows_updated_at()
RETURNS TRIGGER AS $$
BEGIN
  NEW.updated_at = NOW();
  RETURN NEW;
END;
$$ LANGUAGE plpgsql;

CREATE TRIGGER cashflows_updated_at
  BEFORE UPDATE ON cashflows
  FOR EACH ROW
  EXECUTE FUNCTION update_cashflows_updated_at();

-- Create view for cashflow summary (by type)
CREATE OR REPLACE VIEW cashflow_summary AS
SELECT 
  user_id,
  type,
  COUNT(*) as transaction_count,
  SUM(amount) as total_amount,
  DATE(created_at) as transaction_date
FROM cashflows
GROUP BY user_id, type, DATE(created_at)
ORDER BY transaction_date DESC;

-- Create view for daily cashflow totals
CREATE OR REPLACE VIEW daily_cashflow_totals AS
SELECT 
  user_id,
  DATE(created_at) as cashflow_date,
  SUM(CASE WHEN type = 'Released Income' THEN amount ELSE 0 END) as total_income,
  SUM(CASE WHEN type = 'Expense' THEN amount ELSE 0 END) as total_expenses,
  SUM(CASE WHEN type IN ('Return', 'Refund') THEN amount ELSE 0 END) as total_returns,
  SUM(amount) as net_cashflow
FROM cashflows
GROUP BY user_id, DATE(created_at)
ORDER BY cashflow_date DESC;

-- Grant permissions to authenticated users
GRANT SELECT, INSERT, UPDATE, DELETE ON cashflows TO authenticated;
GRANT SELECT ON cashflow_summary TO authenticated;
GRANT SELECT ON daily_cashflow_totals TO authenticated;
