-- TelaPhoria IMS - Inventory & Transaction Tables Migration
-- Run this in Supabase SQL Editor (Dashboard > SQL Editor > New Query)

-- Create inventory_products table (source of truth for quantities)
CREATE TABLE inventory_products (
  id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  user_id UUID NOT NULL REFERENCES auth.users(id) ON DELETE CASCADE,
  product_name VARCHAR(255) NOT NULL,
  category VARCHAR(100) NOT NULL,
  type VARCHAR(100) NOT NULL,
  quantity INTEGER NOT NULL DEFAULT 0,
  image_url TEXT,
  created_at TIMESTAMP WITH TIME ZONE DEFAULT NOW(),
  updated_at TIMESTAMP WITH TIME ZONE DEFAULT NOW(),
  
  -- Ensure each user has unique product names
  UNIQUE(user_id, product_name)
);

-- Create indexes for performance
CREATE INDEX idx_user_products ON inventory_products(user_id);
CREATE INDEX idx_quantity ON inventory_products(quantity);

-- Create inventory_transactions table (audit trail)
CREATE TABLE inventory_transactions (
  id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  user_id UUID NOT NULL REFERENCES auth.users(id) ON DELETE CASCADE,
  product_id UUID NOT NULL REFERENCES inventory_products(id) ON DELETE CASCADE,
  qty_change INTEGER NOT NULL,
  transaction_type VARCHAR(50) NOT NULL CHECK (transaction_type IN ('sale', 'return', 'restock', 'cut', 'cancellation')),
  reference_id VARCHAR(255) NOT NULL, -- order_id, cut_id, restock_id
  notes TEXT,
  created_at TIMESTAMP WITH TIME ZONE DEFAULT NOW()
);

-- Create indexes for performance
CREATE INDEX idx_product_transactions ON inventory_transactions(product_id);
CREATE INDEX idx_user_transactions ON inventory_transactions(user_id);
CREATE INDEX idx_transaction_type ON inventory_transactions(transaction_type);
CREATE INDEX idx_reference_id ON inventory_transactions(reference_id);

-- Enable Row Level Security (RLS) for inventory_products
ALTER TABLE inventory_products ENABLE ROW LEVEL SECURITY;

-- Create RLS policy: Users can only see their own products
CREATE POLICY "Users can view their own products"
  ON inventory_products
  FOR SELECT
  USING (auth.uid() = user_id);

-- Create RLS policy: Users can insert their own products
CREATE POLICY "Users can insert their own products"
  ON inventory_products
  FOR INSERT
  WITH CHECK (auth.uid() = user_id);

-- Create RLS policy: Users can update their own products
CREATE POLICY "Users can update their own products"
  ON inventory_products
  FOR UPDATE
  USING (auth.uid() = user_id)
  WITH CHECK (auth.uid() = user_id);

-- Create RLS policy: Users can delete their own products
CREATE POLICY "Users can delete their own products"
  ON inventory_products
  FOR DELETE
  USING (auth.uid() = user_id);

-- Enable RLS for inventory_transactions
ALTER TABLE inventory_transactions ENABLE ROW LEVEL SECURITY;

-- Create RLS policy: Users can only see their own transactions
CREATE POLICY "Users can view their own transactions"
  ON inventory_transactions
  FOR SELECT
  USING (auth.uid() = user_id);

-- Create RLS policy: Users can insert their own transactions
CREATE POLICY "Users can insert their own transactions"
  ON inventory_transactions
  FOR INSERT
  WITH CHECK (auth.uid() = user_id);

-- Create trigger to auto-update updated_at column
CREATE OR REPLACE FUNCTION update_updated_at_column()
RETURNS TRIGGER AS $$
BEGIN
  NEW.updated_at = NOW();
  RETURN NEW;
END;
$$ LANGUAGE plpgsql;

CREATE TRIGGER inventory_products_updated_at
  BEFORE UPDATE ON inventory_products
  FOR EACH ROW
  EXECUTE FUNCTION update_updated_at_column();

-- Create view for low stock alerts (quantity <= 50)
CREATE VIEW low_stock_alerts AS
SELECT 
  id,
  user_id,
  product_name,
  category,
  type,
  quantity,
  CASE 
    WHEN quantity = 0 THEN 'Out of Stock'
    WHEN quantity <= 10 THEN 'Critical'
    WHEN quantity <= 50 THEN 'Low'
    ELSE 'Normal'
  END as stock_level
FROM inventory_products
WHERE quantity <= 50;

-- Create view for transaction summary (last 30 days)
CREATE VIEW transaction_summary_30d AS
SELECT 
  user_id,
  transaction_type,
  COUNT(*) as transaction_count,
  SUM(qty_change) as total_qty_change,
  DATE(created_at) as transaction_date
FROM inventory_transactions
WHERE created_at >= NOW() - INTERVAL '30 days'
GROUP BY user_id, transaction_type, DATE(created_at)
ORDER BY transaction_date DESC;

-- Optional: Create a function to check inventory before processing sale
CREATE OR REPLACE FUNCTION check_inventory_availability(
  p_product_id UUID,
  p_requested_qty INTEGER
) RETURNS TABLE(available BOOLEAN, current_qty INTEGER) AS $$
BEGIN
  RETURN QUERY
  SELECT 
    (quantity >= p_requested_qty) as available,
    quantity as current_qty
  FROM inventory_products
  WHERE id = p_product_id;
END;
$$ LANGUAGE plpgsql;

-- Grant permissions to authenticated users
GRANT SELECT, INSERT, UPDATE, DELETE ON inventory_products TO authenticated;
GRANT SELECT, INSERT, UPDATE, DELETE ON inventory_transactions TO authenticated;
GRANT SELECT ON low_stock_alerts TO authenticated;
GRANT SELECT ON transaction_summary_30d TO authenticated;
