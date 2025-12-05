-- ============================================
-- TELAPHORIA IMS - SAFE MIGRATION
-- This script is safe to run multiple times
-- It skips existing tables and only creates what's missing
-- ============================================

-- ============================================
-- 1. INVENTORY_PRODUCTS TABLE
-- ============================================
CREATE TABLE IF NOT EXISTS inventory_products (
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

CREATE INDEX IF NOT EXISTS idx_inventory_products_user_id ON inventory_products(user_id);
CREATE INDEX IF NOT EXISTS idx_inventory_products_quantity ON inventory_products(quantity);

-- ============================================
-- 2. INVENTORY_TRANSACTIONS TABLE
-- ============================================
CREATE TABLE IF NOT EXISTS inventory_transactions (
  id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  user_id UUID NOT NULL REFERENCES auth.users(id) ON DELETE CASCADE,
  product_id UUID REFERENCES inventory_products(id) ON DELETE CASCADE,
  qty_change INTEGER NOT NULL,
  transaction_type TEXT NOT NULL CHECK (transaction_type IN ('sale', 'return', 'restock', 'cut', 'cancellation')),
  reference_id TEXT NOT NULL,
  notes TEXT,
  created_at TIMESTAMPTZ DEFAULT NOW()
);

CREATE INDEX IF NOT EXISTS idx_inventory_transactions_user_id ON inventory_transactions(user_id);
CREATE INDEX IF NOT EXISTS idx_inventory_transactions_product_id ON inventory_transactions(product_id);

-- ============================================
-- 3. DROP OLD SHOP_SALES IF EXISTS (to recreate with correct schema)
-- UNCOMMENT THIS IF YOU WANT TO START FRESH (deletes existing sales data!)
-- ============================================
-- DROP TABLE IF EXISTS sale_products CASCADE;
-- DROP TABLE IF EXISTS shop_sales CASCADE;

-- ============================================
-- 4. SHOP_SALES TABLE (Based on Excel structure)
-- ============================================
CREATE TABLE IF NOT EXISTS shop_sales (
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

CREATE INDEX IF NOT EXISTS idx_shop_sales_user_id ON shop_sales(user_id);
CREATE INDEX IF NOT EXISTS idx_shop_sales_order_id ON shop_sales(order_id);
CREATE INDEX IF NOT EXISTS idx_shop_sales_shop ON shop_sales(shop);
CREATE INDEX IF NOT EXISTS idx_shop_sales_status ON shop_sales(status);
CREATE INDEX IF NOT EXISTS idx_shop_sales_order_date ON shop_sales(order_date);
CREATE INDEX IF NOT EXISTS idx_shop_sales_income_status ON shop_sales(income_status);

-- ============================================
-- 5. EXPENSES TABLE
-- ============================================
CREATE TABLE IF NOT EXISTS expenses (
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

CREATE INDEX IF NOT EXISTS idx_expenses_user_id ON expenses(user_id);
CREATE INDEX IF NOT EXISTS idx_expenses_date ON expenses(date);

-- ============================================
-- 6. FABRIC_CUTS TABLE
-- ============================================
CREATE TABLE IF NOT EXISTS fabric_cuts (
  id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  user_id UUID NOT NULL REFERENCES auth.users(id) ON DELETE CASCADE,
  product_id UUID REFERENCES inventory_products(id) ON DELETE SET NULL,
  product_name TEXT NOT NULL,
  yards DECIMAL(10,2) NOT NULL,
  date TIMESTAMPTZ DEFAULT NOW(),
  created_at TIMESTAMPTZ DEFAULT NOW()
);

CREATE INDEX IF NOT EXISTS idx_fabric_cuts_user_id ON fabric_cuts(user_id);
CREATE INDEX IF NOT EXISTS idx_fabric_cuts_product_id ON fabric_cuts(product_id);

-- ============================================
-- 7. CASHFLOWS TABLE
-- ============================================
CREATE TABLE IF NOT EXISTS cashflows (
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

CREATE INDEX IF NOT EXISTS idx_cashflows_user_id ON cashflows(user_id);
CREATE INDEX IF NOT EXISTS idx_cashflows_date ON cashflows(date);

-- ============================================
-- 8. ENABLE ROW LEVEL SECURITY
-- ============================================
ALTER TABLE inventory_products ENABLE ROW LEVEL SECURITY;
ALTER TABLE inventory_transactions ENABLE ROW LEVEL SECURITY;
ALTER TABLE shop_sales ENABLE ROW LEVEL SECURITY;
ALTER TABLE expenses ENABLE ROW LEVEL SECURITY;
ALTER TABLE fabric_cuts ENABLE ROW LEVEL SECURITY;
ALTER TABLE cashflows ENABLE ROW LEVEL SECURITY;

-- ============================================
-- 9. RLS POLICIES - INVENTORY_PRODUCTS
-- ============================================
DROP POLICY IF EXISTS "Users can view own products" ON inventory_products;
CREATE POLICY "Users can view own products" ON inventory_products
  FOR SELECT USING (auth.uid() = user_id);

DROP POLICY IF EXISTS "Users can insert own products" ON inventory_products;
CREATE POLICY "Users can insert own products" ON inventory_products
  FOR INSERT WITH CHECK (auth.uid() = user_id);

DROP POLICY IF EXISTS "Users can update own products" ON inventory_products;
CREATE POLICY "Users can update own products" ON inventory_products
  FOR UPDATE USING (auth.uid() = user_id);

DROP POLICY IF EXISTS "Users can delete own products" ON inventory_products;
CREATE POLICY "Users can delete own products" ON inventory_products
  FOR DELETE USING (auth.uid() = user_id);

-- ============================================
-- 10. RLS POLICIES - INVENTORY_TRANSACTIONS
-- ============================================
DROP POLICY IF EXISTS "Users can view own transactions" ON inventory_transactions;
CREATE POLICY "Users can view own transactions" ON inventory_transactions
  FOR SELECT USING (auth.uid() = user_id);

DROP POLICY IF EXISTS "Users can insert own transactions" ON inventory_transactions;
CREATE POLICY "Users can insert own transactions" ON inventory_transactions
  FOR INSERT WITH CHECK (auth.uid() = user_id);

-- ============================================
-- 11. RLS POLICIES - SHOP_SALES
-- ============================================
DROP POLICY IF EXISTS "Users can view own sales" ON shop_sales;
CREATE POLICY "Users can view own sales" ON shop_sales
  FOR SELECT USING (auth.uid() = user_id);

DROP POLICY IF EXISTS "Users can insert own sales" ON shop_sales;
CREATE POLICY "Users can insert own sales" ON shop_sales
  FOR INSERT WITH CHECK (auth.uid() = user_id);

DROP POLICY IF EXISTS "Users can update own sales" ON shop_sales;
CREATE POLICY "Users can update own sales" ON shop_sales
  FOR UPDATE USING (auth.uid() = user_id);

DROP POLICY IF EXISTS "Users can delete own sales" ON shop_sales;
CREATE POLICY "Users can delete own sales" ON shop_sales
  FOR DELETE USING (auth.uid() = user_id);

-- ============================================
-- 12. RLS POLICIES - EXPENSES
-- ============================================
DROP POLICY IF EXISTS "Users can view own expenses" ON expenses;
CREATE POLICY "Users can view own expenses" ON expenses
  FOR SELECT USING (auth.uid() = user_id);

DROP POLICY IF EXISTS "Users can insert own expenses" ON expenses;
CREATE POLICY "Users can insert own expenses" ON expenses
  FOR INSERT WITH CHECK (auth.uid() = user_id);

DROP POLICY IF EXISTS "Users can update own expenses" ON expenses;
CREATE POLICY "Users can update own expenses" ON expenses
  FOR UPDATE USING (auth.uid() = user_id);

DROP POLICY IF EXISTS "Users can delete own expenses" ON expenses;
CREATE POLICY "Users can delete own expenses" ON expenses
  FOR DELETE USING (auth.uid() = user_id);

-- ============================================
-- 13. RLS POLICIES - FABRIC_CUTS
-- ============================================
DROP POLICY IF EXISTS "Users can view own cuts" ON fabric_cuts;
CREATE POLICY "Users can view own cuts" ON fabric_cuts
  FOR SELECT USING (auth.uid() = user_id);

DROP POLICY IF EXISTS "Users can insert own cuts" ON fabric_cuts;
CREATE POLICY "Users can insert own cuts" ON fabric_cuts
  FOR INSERT WITH CHECK (auth.uid() = user_id);

DROP POLICY IF EXISTS "Users can update own cuts" ON fabric_cuts;
CREATE POLICY "Users can update own cuts" ON fabric_cuts
  FOR UPDATE USING (auth.uid() = user_id);

DROP POLICY IF EXISTS "Users can delete own cuts" ON fabric_cuts;
CREATE POLICY "Users can delete own cuts" ON fabric_cuts
  FOR DELETE USING (auth.uid() = user_id);

-- ============================================
-- 14. RLS POLICIES - CASHFLOWS
-- ============================================
DROP POLICY IF EXISTS "Users can view own cashflows" ON cashflows;
CREATE POLICY "Users can view own cashflows" ON cashflows
  FOR SELECT USING (auth.uid() = user_id);

DROP POLICY IF EXISTS "Users can insert own cashflows" ON cashflows;
CREATE POLICY "Users can insert own cashflows" ON cashflows
  FOR INSERT WITH CHECK (auth.uid() = user_id);

DROP POLICY IF EXISTS "Users can update own cashflows" ON cashflows;
CREATE POLICY "Users can update own cashflows" ON cashflows
  FOR UPDATE USING (auth.uid() = user_id);

DROP POLICY IF EXISTS "Users can delete own cashflows" ON cashflows;
CREATE POLICY "Users can delete own cashflows" ON cashflows
  FOR DELETE USING (auth.uid() = user_id);

-- ============================================
-- 15. AUTO-UPDATE TRIGGERS
-- ============================================
CREATE OR REPLACE FUNCTION update_updated_at()
RETURNS TRIGGER AS $$
BEGIN
  NEW.updated_at = NOW();
  RETURN NEW;
END;
$$ LANGUAGE plpgsql;

DROP TRIGGER IF EXISTS inventory_products_updated_at ON inventory_products;
CREATE TRIGGER inventory_products_updated_at
  BEFORE UPDATE ON inventory_products
  FOR EACH ROW EXECUTE FUNCTION update_updated_at();

DROP TRIGGER IF EXISTS shop_sales_updated_at ON shop_sales;
CREATE TRIGGER shop_sales_updated_at
  BEFORE UPDATE ON shop_sales
  FOR EACH ROW EXECUTE FUNCTION update_updated_at();

DROP TRIGGER IF EXISTS expenses_updated_at ON expenses;
CREATE TRIGGER expenses_updated_at
  BEFORE UPDATE ON expenses
  FOR EACH ROW EXECUTE FUNCTION update_updated_at();

DROP TRIGGER IF EXISTS cashflows_updated_at ON cashflows;
CREATE TRIGGER cashflows_updated_at
  BEFORE UPDATE ON cashflows
  FOR EACH ROW EXECUTE FUNCTION update_updated_at();

-- ============================================
-- 16. GRANT PERMISSIONS
-- ============================================
GRANT SELECT, INSERT, UPDATE, DELETE ON inventory_products TO authenticated;
GRANT SELECT, INSERT, UPDATE, DELETE ON inventory_transactions TO authenticated;
GRANT SELECT, INSERT, UPDATE, DELETE ON shop_sales TO authenticated;
GRANT SELECT, INSERT, UPDATE, DELETE ON expenses TO authenticated;
GRANT SELECT, INSERT, UPDATE, DELETE ON fabric_cuts TO authenticated;
GRANT SELECT, INSERT, UPDATE, DELETE ON cashflows TO authenticated;

-- ============================================
-- DONE! 
-- Tables created:
-- ✅ inventory_products
-- ✅ inventory_transactions
-- ✅ shop_sales
-- ✅ expenses
-- ✅ fabric_cuts
-- ✅ cashflows
-- ============================================
