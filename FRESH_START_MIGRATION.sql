-- ============================================
-- TELAPHORIA IMS - FRESH START MIGRATION
-- This DROPS existing tables and recreates them
-- WARNING: This deletes all existing data!
-- ============================================

-- Drop existing tables (in correct order due to foreign keys)
DROP TABLE IF EXISTS sale_products CASCADE;
DROP TABLE IF EXISTS returned_parcel_products CASCADE;
DROP TABLE IF EXISTS returned_parcels CASCADE;
DROP TABLE IF EXISTS cashflows CASCADE;
DROP TABLE IF EXISTS fabric_cuts CASCADE;
DROP TABLE IF EXISTS expenses CASCADE;
DROP TABLE IF EXISTS shop_sales CASCADE;
DROP TABLE IF EXISTS inventory_transactions CASCADE;
DROP TABLE IF EXISTS inventory_products CASCADE;

-- Drop existing views
DROP VIEW IF EXISTS low_stock_alerts CASCADE;
DROP VIEW IF EXISTS sales_by_status CASCADE;
DROP VIEW IF EXISTS sales_by_month CASCADE;
DROP VIEW IF EXISTS income_summary CASCADE;

-- ============================================
-- 1. INVENTORY_PRODUCTS TABLE
-- ============================================
CREATE TABLE inventory_products (
  id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  user_id UUID NOT NULL REFERENCES auth.users(id) ON DELETE CASCADE,
  product_name TEXT NOT NULL,
  category TEXT NOT NULL,
  type TEXT NOT NULL,
  quantity INTEGER NOT NULL DEFAULT 0,
  image_url TEXT,
  created_at TIMESTAMPTZ DEFAULT NOW(),
  updated_at TIMESTAMPTZ DEFAULT NOW(),
  UNIQUE(user_id, product_name)
);

CREATE INDEX idx_inventory_products_user_id ON inventory_products(user_id);
CREATE INDEX idx_inventory_products_quantity ON inventory_products(quantity);

-- ============================================
-- 2. INVENTORY_TRANSACTIONS TABLE
-- ============================================
CREATE TABLE inventory_transactions (
  id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  user_id UUID NOT NULL REFERENCES auth.users(id) ON DELETE CASCADE,
  product_id UUID REFERENCES inventory_products(id) ON DELETE CASCADE,
  qty_change INTEGER NOT NULL,
  transaction_type TEXT NOT NULL CHECK (transaction_type IN ('sale', 'return', 'restock', 'cut', 'cancellation')),
  reference_id TEXT NOT NULL,
  notes TEXT,
  created_at TIMESTAMPTZ DEFAULT NOW()
);

CREATE INDEX idx_inventory_transactions_user_id ON inventory_transactions(user_id);
CREATE INDEX idx_inventory_transactions_product_id ON inventory_transactions(product_id);

-- ============================================
-- 3. SHOP_SALES TABLE (Based on Shopee Excel)
-- ============================================
CREATE TABLE shop_sales (
  id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  user_id UUID NOT NULL REFERENCES auth.users(id) ON DELETE CASCADE,
  
  -- Order Info
  order_id TEXT NOT NULL,
  shop TEXT NOT NULL DEFAULT 'Shopee',
  order_date DATE NOT NULL,
  completion_date DATE,
  
  -- Buyer Info
  buyer_name TEXT,
  buyer_contact TEXT,
  buyer_address TEXT,
  
  -- Product Info
  product_name TEXT NOT NULL,
  item_price DECIMAL(10,2) NOT NULL DEFAULT 0,
  quantity INTEGER NOT NULL DEFAULT 1,
  subtotal DECIMAL(10,2) NOT NULL DEFAULT 0,
  
  -- Shipping & Fees
  shipping_fee_buyer DECIMAL(10,2) DEFAULT 0,
  shipping_fee_charged DECIMAL(10,2) DEFAULT 0,
  shipping_fee_rebate DECIMAL(10,2) DEFAULT 0,
  service_fee DECIMAL(10,2) DEFAULT 0,
  transaction_fee DECIMAL(10,2) DEFAULT 0,
  tax DECIMAL(10,2) DEFAULT 0,
  
  -- Totals
  net_total DECIMAL(10,2) DEFAULT 0,
  merchandise_subtotal DECIMAL(10,2) DEFAULT 0,
  shipping_fee DECIMAL(10,2) DEFAULT 0,
  
  -- Vouchers & Discounts
  shopee_voucher DECIMAL(10,2) DEFAULT 0,
  seller_voucher DECIMAL(10,2) DEFAULT 0,
  payment_discount DECIMAL(10,2) DEFAULT 0,
  shopee_coin_redeem DECIMAL(10,2) DEFAULT 0,
  total_buyer_payment DECIMAL(10,2) DEFAULT 0,
  
  -- Status (MANUAL UPDATE in UI)
  status TEXT NOT NULL DEFAULT 'Shipped',
  
  -- Released Info (MANUAL UPDATE in UI)
  released_date DATE,
  released_time TIME,
  income_status TEXT DEFAULT 'Pending',
  
  -- Cancellation
  cancellation_reason TEXT,
  
  -- Timestamps
  created_at TIMESTAMPTZ DEFAULT NOW(),
  updated_at TIMESTAMPTZ DEFAULT NOW()
);

CREATE INDEX idx_shop_sales_user_id ON shop_sales(user_id);
CREATE INDEX idx_shop_sales_order_id ON shop_sales(order_id);
CREATE INDEX idx_shop_sales_shop ON shop_sales(shop);
CREATE INDEX idx_shop_sales_status ON shop_sales(status);
CREATE INDEX idx_shop_sales_order_date ON shop_sales(order_date);
CREATE INDEX idx_shop_sales_income_status ON shop_sales(income_status);

-- ============================================
-- 4. EXPENSES TABLE
-- ============================================
CREATE TABLE expenses (
  id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  user_id UUID NOT NULL REFERENCES auth.users(id) ON DELETE CASCADE,
  date DATE NOT NULL,
  name TEXT NOT NULL,
  type TEXT NOT NULL,
  fee DECIMAL(10,2) NOT NULL DEFAULT 0,
  delivery_fee DECIMAL(10,2) DEFAULT 0,
  total DECIMAL(10,2) NOT NULL DEFAULT 0,
  image_url TEXT,
  created_at TIMESTAMPTZ DEFAULT NOW(),
  updated_at TIMESTAMPTZ DEFAULT NOW()
);

CREATE INDEX idx_expenses_user_id ON expenses(user_id);
CREATE INDEX idx_expenses_date ON expenses(date);

-- ============================================
-- 5. FABRIC_CUTS TABLE (Kosiedon Cuts)
-- ============================================
CREATE TABLE fabric_cuts (
  id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  user_id UUID NOT NULL REFERENCES auth.users(id) ON DELETE CASCADE,
  product_id UUID REFERENCES inventory_products(id) ON DELETE SET NULL,
  product_name TEXT NOT NULL,
  yards DECIMAL(10,2) NOT NULL,
  date TIMESTAMPTZ DEFAULT NOW(),
  created_at TIMESTAMPTZ DEFAULT NOW()
);

CREATE INDEX idx_fabric_cuts_user_id ON fabric_cuts(user_id);
CREATE INDEX idx_fabric_cuts_product_id ON fabric_cuts(product_id);

-- ============================================
-- 6. CASHFLOWS TABLE
-- ============================================
CREATE TABLE cashflows (
  id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  user_id UUID NOT NULL REFERENCES auth.users(id) ON DELETE CASCADE,
  description TEXT NOT NULL,
  type TEXT NOT NULL,
  amount DECIMAL(10,2) NOT NULL,
  category TEXT NOT NULL,
  date DATE NOT NULL,
  notes TEXT,
  reference_id TEXT,
  created_at TIMESTAMPTZ DEFAULT NOW(),
  updated_at TIMESTAMPTZ DEFAULT NOW()
);

CREATE INDEX idx_cashflows_user_id ON cashflows(user_id);
CREATE INDEX idx_cashflows_date ON cashflows(date);

-- ============================================
-- 7. ENABLE ROW LEVEL SECURITY
-- ============================================
ALTER TABLE inventory_products ENABLE ROW LEVEL SECURITY;
ALTER TABLE inventory_transactions ENABLE ROW LEVEL SECURITY;
ALTER TABLE shop_sales ENABLE ROW LEVEL SECURITY;
ALTER TABLE expenses ENABLE ROW LEVEL SECURITY;
ALTER TABLE fabric_cuts ENABLE ROW LEVEL SECURITY;
ALTER TABLE cashflows ENABLE ROW LEVEL SECURITY;

-- ============================================
-- 8. RLS POLICIES - INVENTORY_PRODUCTS
-- ============================================
CREATE POLICY "Users can view own products" ON inventory_products
  FOR SELECT USING (auth.uid() = user_id);

CREATE POLICY "Users can insert own products" ON inventory_products
  FOR INSERT WITH CHECK (auth.uid() = user_id);

CREATE POLICY "Users can update own products" ON inventory_products
  FOR UPDATE USING (auth.uid() = user_id);

CREATE POLICY "Users can delete own products" ON inventory_products
  FOR DELETE USING (auth.uid() = user_id);

-- ============================================
-- 9. RLS POLICIES - INVENTORY_TRANSACTIONS
-- ============================================
CREATE POLICY "Users can view own transactions" ON inventory_transactions
  FOR SELECT USING (auth.uid() = user_id);

CREATE POLICY "Users can insert own transactions" ON inventory_transactions
  FOR INSERT WITH CHECK (auth.uid() = user_id);

-- ============================================
-- 10. RLS POLICIES - SHOP_SALES
-- ============================================
CREATE POLICY "Users can view own sales" ON shop_sales
  FOR SELECT USING (auth.uid() = user_id);

CREATE POLICY "Users can insert own sales" ON shop_sales
  FOR INSERT WITH CHECK (auth.uid() = user_id);

CREATE POLICY "Users can update own sales" ON shop_sales
  FOR UPDATE USING (auth.uid() = user_id);

CREATE POLICY "Users can delete own sales" ON shop_sales
  FOR DELETE USING (auth.uid() = user_id);

-- ============================================
-- 11. RLS POLICIES - EXPENSES
-- ============================================
CREATE POLICY "Users can view own expenses" ON expenses
  FOR SELECT USING (auth.uid() = user_id);

CREATE POLICY "Users can insert own expenses" ON expenses
  FOR INSERT WITH CHECK (auth.uid() = user_id);

CREATE POLICY "Users can update own expenses" ON expenses
  FOR UPDATE USING (auth.uid() = user_id);

CREATE POLICY "Users can delete own expenses" ON expenses
  FOR DELETE USING (auth.uid() = user_id);

-- ============================================
-- 12. RLS POLICIES - FABRIC_CUTS
-- ============================================
CREATE POLICY "Users can view own cuts" ON fabric_cuts
  FOR SELECT USING (auth.uid() = user_id);

CREATE POLICY "Users can insert own cuts" ON fabric_cuts
  FOR INSERT WITH CHECK (auth.uid() = user_id);

CREATE POLICY "Users can update own cuts" ON fabric_cuts
  FOR UPDATE USING (auth.uid() = user_id);

CREATE POLICY "Users can delete own cuts" ON fabric_cuts
  FOR DELETE USING (auth.uid() = user_id);

-- ============================================
-- 13. RLS POLICIES - CASHFLOWS
-- ============================================
CREATE POLICY "Users can view own cashflows" ON cashflows
  FOR SELECT USING (auth.uid() = user_id);

CREATE POLICY "Users can insert own cashflows" ON cashflows
  FOR INSERT WITH CHECK (auth.uid() = user_id);

CREATE POLICY "Users can update own cashflows" ON cashflows
  FOR UPDATE USING (auth.uid() = user_id);

CREATE POLICY "Users can delete own cashflows" ON cashflows
  FOR DELETE USING (auth.uid() = user_id);

-- ============================================
-- 14. AUTO-UPDATE TRIGGERS
-- ============================================
CREATE OR REPLACE FUNCTION update_updated_at()
RETURNS TRIGGER AS $$
BEGIN
  NEW.updated_at = NOW();
  RETURN NEW;
END;
$$ LANGUAGE plpgsql;

CREATE TRIGGER inventory_products_updated_at
  BEFORE UPDATE ON inventory_products
  FOR EACH ROW EXECUTE FUNCTION update_updated_at();

CREATE TRIGGER shop_sales_updated_at
  BEFORE UPDATE ON shop_sales
  FOR EACH ROW EXECUTE FUNCTION update_updated_at();

CREATE TRIGGER expenses_updated_at
  BEFORE UPDATE ON expenses
  FOR EACH ROW EXECUTE FUNCTION update_updated_at();

CREATE TRIGGER cashflows_updated_at
  BEFORE UPDATE ON cashflows
  FOR EACH ROW EXECUTE FUNCTION update_updated_at();

-- ============================================
-- 15. GRANT PERMISSIONS
-- ============================================
GRANT SELECT, INSERT, UPDATE, DELETE ON inventory_products TO authenticated;
GRANT SELECT, INSERT, UPDATE, DELETE ON inventory_transactions TO authenticated;
GRANT SELECT, INSERT, UPDATE, DELETE ON shop_sales TO authenticated;
GRANT SELECT, INSERT, UPDATE, DELETE ON expenses TO authenticated;
GRANT SELECT, INSERT, UPDATE, DELETE ON fabric_cuts TO authenticated;
GRANT SELECT, INSERT, UPDATE, DELETE ON cashflows TO authenticated;

-- ============================================
-- 16. LOW STOCK VIEW
-- ============================================
CREATE VIEW low_stock_alerts AS
SELECT * FROM inventory_products WHERE quantity <= 50;

GRANT SELECT ON low_stock_alerts TO authenticated;

-- ============================================
-- MIGRATION COMPLETE!
-- 
-- Tables created:
-- ✅ inventory_products
-- ✅ inventory_transactions  
-- ✅ shop_sales
-- ✅ expenses
-- ✅ fabric_cuts
-- ✅ cashflows
-- ✅ low_stock_alerts (view)
-- ============================================
