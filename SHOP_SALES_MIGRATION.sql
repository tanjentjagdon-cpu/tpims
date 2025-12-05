-- ============================================
-- TELAPHORIA IMS - SHOP SALES TABLE
-- Run this in Supabase SQL Editor
-- ============================================

-- Drop existing table if exists (careful - this deletes data!)
-- DROP TABLE IF EXISTS shop_sales CASCADE;

-- ============================================
-- SHOP_SALES TABLE
-- Based on Excel: "Sales as of 17112025"
-- ============================================
CREATE TABLE IF NOT EXISTS shop_sales (
  id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  user_id UUID NOT NULL REFERENCES auth.users(id) ON DELETE CASCADE,
  
  -- Order Info
  order_id TEXT NOT NULL,                    -- "251030EMXU4GVB"
  shop TEXT NOT NULL DEFAULT 'Shopee',       -- Shopee, TikTok, Lazada
  order_date DATE NOT NULL,                  -- Date ng order
  completion_date DATE,                      -- Date na completed
  
  -- Buyer Info
  buyer_name TEXT,                           -- "Jashley Mcaine"
  buyer_contact TEXT,                        -- "+639151138604"
  buyer_address TEXT,                        -- Full address
  
  -- Product Info
  product_name TEXT NOT NULL,                -- "Olive Green-Noraisa"
  item_price DECIMAL(10,2) NOT NULL DEFAULT 0,  -- 39.00
  quantity INTEGER NOT NULL DEFAULT 1,       -- 3
  subtotal DECIMAL(10,2) NOT NULL DEFAULT 0, -- 117.00 (item_price * quantity)
  
  -- Shipping & Fees (from Excel)
  shipping_fee_buyer DECIMAL(10,2) DEFAULT 0,        -- Shipping fee paid by buyer
  shipping_fee_charged DECIMAL(10,2) DEFAULT 0,      -- Est. Shipping Fee Charged by Logistic
  shipping_fee_rebate DECIMAL(10,2) DEFAULT 0,       -- Shipping fee Rebate
  service_fee DECIMAL(10,2) DEFAULT 0,               -- Service Fee
  transaction_fee DECIMAL(10,2) DEFAULT 0,           -- Transaction Fee
  tax DECIMAL(10,2) DEFAULT 0,                       -- Tax (withholding)
  
  -- Totals
  net_total DECIMAL(10,2) DEFAULT 0,                 -- Total after fees (what you receive)
  merchandise_subtotal DECIMAL(10,2) DEFAULT 0,      -- Merchandise Subtotal
  shipping_fee DECIMAL(10,2) DEFAULT 0,              -- Shipping Fee (separate column in Excel)
  
  -- Vouchers & Discounts
  shopee_voucher DECIMAL(10,2) DEFAULT 0,
  seller_voucher DECIMAL(10,2) DEFAULT 0,
  payment_discount DECIMAL(10,2) DEFAULT 0,
  shopee_coin_redeem DECIMAL(10,2) DEFAULT 0,
  total_buyer_payment DECIMAL(10,2) DEFAULT 0,       -- What buyer paid
  
  -- Status (MANUAL UPDATE in UI)
  status TEXT NOT NULL DEFAULT 'Shipped' CHECK (status IN ('Shipped', 'Delivered', 'Completed', 'Cancelled')),
  
  -- Released Info (MANUAL UPDATE in UI)
  released_date DATE,                        -- Manual: when money released
  released_time TIME,                        -- Manual: time released
  income_status TEXT DEFAULT 'Pending' CHECK (income_status IN ('Pending', 'Released')),
  
  -- Cancellation (if applicable)
  cancellation_reason TEXT,
  
  -- Timestamps
  created_at TIMESTAMPTZ DEFAULT NOW(),
  updated_at TIMESTAMPTZ DEFAULT NOW()
);

-- ============================================
-- INDEXES FOR PERFORMANCE
-- ============================================
CREATE INDEX IF NOT EXISTS idx_shop_sales_user_id ON shop_sales(user_id);
CREATE INDEX IF NOT EXISTS idx_shop_sales_order_id ON shop_sales(order_id);
CREATE INDEX IF NOT EXISTS idx_shop_sales_shop ON shop_sales(shop);
CREATE INDEX IF NOT EXISTS idx_shop_sales_status ON shop_sales(status);
CREATE INDEX IF NOT EXISTS idx_shop_sales_order_date ON shop_sales(order_date);
CREATE INDEX IF NOT EXISTS idx_shop_sales_income_status ON shop_sales(income_status);

-- ============================================
-- ROW LEVEL SECURITY (RLS)
-- Users can only access their own data
-- ============================================
ALTER TABLE shop_sales ENABLE ROW LEVEL SECURITY;

-- View own sales
DROP POLICY IF EXISTS "Users can view own sales" ON shop_sales;
CREATE POLICY "Users can view own sales" ON shop_sales
  FOR SELECT USING (auth.uid() = user_id);

-- Insert own sales
DROP POLICY IF EXISTS "Users can insert own sales" ON shop_sales;
CREATE POLICY "Users can insert own sales" ON shop_sales
  FOR INSERT WITH CHECK (auth.uid() = user_id);

-- Update own sales
DROP POLICY IF EXISTS "Users can update own sales" ON shop_sales;
CREATE POLICY "Users can update own sales" ON shop_sales
  FOR UPDATE USING (auth.uid() = user_id);

-- Delete own sales
DROP POLICY IF EXISTS "Users can delete own sales" ON shop_sales;
CREATE POLICY "Users can delete own sales" ON shop_sales
  FOR DELETE USING (auth.uid() = user_id);

-- ============================================
-- AUTO-UPDATE updated_at TRIGGER
-- ============================================
CREATE OR REPLACE FUNCTION update_shop_sales_updated_at()
RETURNS TRIGGER AS $$
BEGIN
  NEW.updated_at = NOW();
  RETURN NEW;
END;
$$ LANGUAGE plpgsql;

DROP TRIGGER IF EXISTS shop_sales_updated_at ON shop_sales;
CREATE TRIGGER shop_sales_updated_at
  BEFORE UPDATE ON shop_sales
  FOR EACH ROW
  EXECUTE FUNCTION update_shop_sales_updated_at();

-- ============================================
-- GRANT PERMISSIONS
-- ============================================
GRANT SELECT, INSERT, UPDATE, DELETE ON shop_sales TO authenticated;

-- ============================================
-- HELPFUL VIEWS
-- ============================================

-- View: Sales Summary by Status
CREATE OR REPLACE VIEW sales_by_status AS
SELECT 
  user_id,
  status,
  COUNT(*) as order_count,
  SUM(quantity) as total_items,
  SUM(subtotal) as gross_sales,
  SUM(net_total) as net_sales
FROM shop_sales
GROUP BY user_id, status;

-- View: Sales Summary by Month
CREATE OR REPLACE VIEW sales_by_month AS
SELECT 
  user_id,
  DATE_TRUNC('month', order_date) as month,
  COUNT(*) as order_count,
  SUM(quantity) as total_items,
  SUM(subtotal) as gross_sales,
  SUM(net_total) as net_sales
FROM shop_sales
GROUP BY user_id, DATE_TRUNC('month', order_date)
ORDER BY month DESC;

-- View: Pending vs Released Income
CREATE OR REPLACE VIEW income_summary AS
SELECT 
  user_id,
  income_status,
  COUNT(*) as order_count,
  SUM(net_total) as total_income
FROM shop_sales
WHERE status != 'Cancelled'
GROUP BY user_id, income_status;

GRANT SELECT ON sales_by_status TO authenticated;
GRANT SELECT ON sales_by_month TO authenticated;
GRANT SELECT ON income_summary TO authenticated;
