-- ============================================
-- TELAPHORIA IMS - COMPLETE SUPABASE MIGRATION
-- Run this in Supabase SQL Editor
-- ============================================

-- ============================================
-- 1. INVENTORY_PRODUCTS TABLE (Already exists, verify structure)
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
  updated_at TIMESTAMPTZ DEFAULT NOW()
);

-- Add index for faster queries
CREATE INDEX IF NOT EXISTS idx_inventory_products_user_id ON inventory_products(user_id);

-- ============================================
-- 2. INVENTORY_TRANSACTIONS TABLE (Already exists, verify structure)
-- ============================================
CREATE TABLE IF NOT EXISTS inventory_transactions (
  id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  user_id UUID NOT NULL REFERENCES auth.users(id) ON DELETE CASCADE,
  product_id UUID REFERENCES inventory_products(id) ON DELETE SET NULL,
  qty_change INTEGER NOT NULL,
  transaction_type TEXT NOT NULL CHECK (transaction_type IN ('sale', 'return', 'restock', 'cut', 'cancellation')),
  reference_id TEXT NOT NULL,
  created_at TIMESTAMPTZ DEFAULT NOW()
);

CREATE INDEX IF NOT EXISTS idx_inventory_transactions_user_id ON inventory_transactions(user_id);
CREATE INDEX IF NOT EXISTS idx_inventory_transactions_product_id ON inventory_transactions(product_id);

-- ============================================
-- 3. SHOP_SALES TABLE (NEW)
-- ============================================
CREATE TABLE IF NOT EXISTS shop_sales (
  id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  user_id UUID NOT NULL REFERENCES auth.users(id) ON DELETE CASCADE,
  order_id TEXT NOT NULL,
  shop TEXT NOT NULL CHECK (shop IN ('Shopee', 'TikTok', 'Lazada')),
  -- Buyer Info
  buyer_name TEXT,
  contact_no TEXT,
  address TEXT,
  -- Order Info
  date_ordered DATE NOT NULL,
  status TEXT NOT NULL DEFAULT 'Delivered' CHECK (status IN ('Shipped', 'Delivered', 'Completed', 'Cancelled')),
  cancellation_reason TEXT,
  -- Released Date/Time (for Delivered status)
  released_date DATE,
  released_time TIME,
  -- Income Status
  income_status TEXT DEFAULT 'Pending' CHECK (income_status IN ('Pending', 'Released')),
  -- Payment Details
  estimated_shipping_fee_charged DECIMAL(10,2) DEFAULT 0,
  shipping_fee_rebate DECIMAL(10,2) DEFAULT 0,
  service_fee DECIMAL(10,2) DEFAULT 0,
  transaction_fee DECIMAL(10,2) DEFAULT 0,
  withholding_tax DECIMAL(10,2) DEFAULT 0,
  -- Totals (computed from products)
  total_quantity INTEGER DEFAULT 0,
  order_total DECIMAL(10,2) DEFAULT 0,
  -- Timestamps
  created_at TIMESTAMPTZ DEFAULT NOW(),
  updated_at TIMESTAMPTZ DEFAULT NOW()
);

CREATE INDEX IF NOT EXISTS idx_shop_sales_user_id ON shop_sales(user_id);
CREATE INDEX IF NOT EXISTS idx_shop_sales_order_id ON shop_sales(order_id);
CREATE INDEX IF NOT EXISTS idx_shop_sales_shop ON shop_sales(shop);
CREATE INDEX IF NOT EXISTS idx_shop_sales_status ON shop_sales(status);
CREATE INDEX IF NOT EXISTS idx_shop_sales_date ON shop_sales(date_ordered);

-- ============================================
-- 4. SALE_PRODUCTS TABLE (Products per sale - for multi-product orders)
-- ============================================
CREATE TABLE IF NOT EXISTS sale_products (
  id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  sale_id UUID NOT NULL REFERENCES shop_sales(id) ON DELETE CASCADE,
  product_id UUID REFERENCES inventory_products(id) ON DELETE SET NULL,
  product_name TEXT NOT NULL,
  quantity INTEGER NOT NULL,
  unit_price DECIMAL(10,2) NOT NULL,
  subtotal DECIMAL(10,2) NOT NULL,
  created_at TIMESTAMPTZ DEFAULT NOW()
);

CREATE INDEX IF NOT EXISTS idx_sale_products_sale_id ON sale_products(sale_id);

-- ============================================
-- 5. EXPENSES TABLE (NEW)
-- ============================================
CREATE TABLE IF NOT EXISTS expenses (
  id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  user_id UUID NOT NULL REFERENCES auth.users(id) ON DELETE CASCADE,
  date DATE NOT NULL,
  name TEXT NOT NULL,
  type TEXT NOT NULL CHECK (type IN ('Government', 'Petrol', 'Food', 'Parking', 'Materials', 'Ads', 'Others')),
  fee DECIMAL(10,2) NOT NULL DEFAULT 0,
  delivery_fee DECIMAL(10,2) DEFAULT 0,
  total DECIMAL(10,2) NOT NULL DEFAULT 0,
  image_url TEXT,
  created_at TIMESTAMPTZ DEFAULT NOW(),
  updated_at TIMESTAMPTZ DEFAULT NOW()
);

CREATE INDEX IF NOT EXISTS idx_expenses_user_id ON expenses(user_id);
CREATE INDEX IF NOT EXISTS idx_expenses_date ON expenses(date);
CREATE INDEX IF NOT EXISTS idx_expenses_type ON expenses(type);

-- ============================================
-- 6. CASHFLOWS TABLE (NEW)
-- ============================================
CREATE TABLE IF NOT EXISTS cashflows (
  id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  user_id UUID NOT NULL REFERENCES auth.users(id) ON DELETE CASCADE,
  description TEXT NOT NULL,
  type TEXT NOT NULL CHECK (type IN ('income', 'expense')),
  amount DECIMAL(10,2) NOT NULL,
  category TEXT NOT NULL,
  date DATE NOT NULL,
  notes TEXT,
  reference_id TEXT, -- Links to sale_id or expense_id
  created_at TIMESTAMPTZ DEFAULT NOW(),
  updated_at TIMESTAMPTZ DEFAULT NOW()
);

CREATE INDEX IF NOT EXISTS idx_cashflows_user_id ON cashflows(user_id);
CREATE INDEX IF NOT EXISTS idx_cashflows_type ON cashflows(type);
CREATE INDEX IF NOT EXISTS idx_cashflows_date ON cashflows(date);

-- ============================================
-- 7. FABRIC_CUTS TABLE (NEW - Kosiedon Cuts)
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
-- 8. RETURNED_PARCELS TABLE (NEW - Cancelled Orders)
-- ============================================
CREATE TABLE IF NOT EXISTS returned_parcels (
  id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  user_id UUID NOT NULL REFERENCES auth.users(id) ON DELETE CASCADE,
  order_id TEXT NOT NULL,
  shop TEXT NOT NULL CHECK (shop IN ('Shopee', 'TikTok', 'Lazada')),
  return_date TIMESTAMPTZ DEFAULT NOW(),
  restocked_date TIMESTAMPTZ,
  status TEXT NOT NULL DEFAULT 'Pending' CHECK (status IN ('Pending', 'Restocked')),
  created_at TIMESTAMPTZ DEFAULT NOW()
);

CREATE INDEX IF NOT EXISTS idx_returned_parcels_user_id ON returned_parcels(user_id);
CREATE INDEX IF NOT EXISTS idx_returned_parcels_status ON returned_parcels(status);

-- ============================================
-- 9. RETURNED_PARCEL_PRODUCTS TABLE (Products in returned parcels)
-- ============================================
CREATE TABLE IF NOT EXISTS returned_parcel_products (
  id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  parcel_id UUID NOT NULL REFERENCES returned_parcels(id) ON DELETE CASCADE,
  product_id UUID REFERENCES inventory_products(id) ON DELETE SET NULL,
  product_name TEXT NOT NULL,
  quantity INTEGER NOT NULL,
  created_at TIMESTAMPTZ DEFAULT NOW()
);

CREATE INDEX IF NOT EXISTS idx_returned_parcel_products_parcel_id ON returned_parcel_products(parcel_id);

-- ============================================
-- 10. ROW LEVEL SECURITY (RLS) POLICIES
-- Users can only access their own data
-- ============================================

-- Enable RLS on all tables
ALTER TABLE inventory_products ENABLE ROW LEVEL SECURITY;
ALTER TABLE inventory_transactions ENABLE ROW LEVEL SECURITY;
ALTER TABLE shop_sales ENABLE ROW LEVEL SECURITY;
ALTER TABLE sale_products ENABLE ROW LEVEL SECURITY;
ALTER TABLE expenses ENABLE ROW LEVEL SECURITY;
ALTER TABLE cashflows ENABLE ROW LEVEL SECURITY;
ALTER TABLE fabric_cuts ENABLE ROW LEVEL SECURITY;
ALTER TABLE returned_parcels ENABLE ROW LEVEL SECURITY;
ALTER TABLE returned_parcel_products ENABLE ROW LEVEL SECURITY;

-- Create RLS policies for inventory_products
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

-- Create RLS policies for inventory_transactions
DROP POLICY IF EXISTS "Users can view own transactions" ON inventory_transactions;
CREATE POLICY "Users can view own transactions" ON inventory_transactions
  FOR SELECT USING (auth.uid() = user_id);

DROP POLICY IF EXISTS "Users can insert own transactions" ON inventory_transactions;
CREATE POLICY "Users can insert own transactions" ON inventory_transactions
  FOR INSERT WITH CHECK (auth.uid() = user_id);

-- Create RLS policies for shop_sales
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

-- Create RLS policies for sale_products (based on parent sale)
DROP POLICY IF EXISTS "Users can view own sale products" ON sale_products;
CREATE POLICY "Users can view own sale products" ON sale_products
  FOR SELECT USING (
    EXISTS (SELECT 1 FROM shop_sales WHERE shop_sales.id = sale_products.sale_id AND shop_sales.user_id = auth.uid())
  );

DROP POLICY IF EXISTS "Users can insert own sale products" ON sale_products;
CREATE POLICY "Users can insert own sale products" ON sale_products
  FOR INSERT WITH CHECK (
    EXISTS (SELECT 1 FROM shop_sales WHERE shop_sales.id = sale_products.sale_id AND shop_sales.user_id = auth.uid())
  );

DROP POLICY IF EXISTS "Users can delete own sale products" ON sale_products;
CREATE POLICY "Users can delete own sale products" ON sale_products
  FOR DELETE USING (
    EXISTS (SELECT 1 FROM shop_sales WHERE shop_sales.id = sale_products.sale_id AND shop_sales.user_id = auth.uid())
  );

-- Create RLS policies for expenses
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

-- Create RLS policies for cashflows
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

-- Create RLS policies for fabric_cuts
DROP POLICY IF EXISTS "Users can view own cuts" ON fabric_cuts;
CREATE POLICY "Users can view own cuts" ON fabric_cuts
  FOR SELECT USING (auth.uid() = user_id);

DROP POLICY IF EXISTS "Users can insert own cuts" ON fabric_cuts;
CREATE POLICY "Users can insert own cuts" ON fabric_cuts
  FOR INSERT WITH CHECK (auth.uid() = user_id);

DROP POLICY IF EXISTS "Users can delete own cuts" ON fabric_cuts;
CREATE POLICY "Users can delete own cuts" ON fabric_cuts
  FOR DELETE USING (auth.uid() = user_id);

-- Create RLS policies for returned_parcels
DROP POLICY IF EXISTS "Users can view own returned parcels" ON returned_parcels;
CREATE POLICY "Users can view own returned parcels" ON returned_parcels
  FOR SELECT USING (auth.uid() = user_id);

DROP POLICY IF EXISTS "Users can insert own returned parcels" ON returned_parcels;
CREATE POLICY "Users can insert own returned parcels" ON returned_parcels
  FOR INSERT WITH CHECK (auth.uid() = user_id);

DROP POLICY IF EXISTS "Users can update own returned parcels" ON returned_parcels;
CREATE POLICY "Users can update own returned parcels" ON returned_parcels
  FOR UPDATE USING (auth.uid() = user_id);

DROP POLICY IF EXISTS "Users can delete own returned parcels" ON returned_parcels;
CREATE POLICY "Users can delete own returned parcels" ON returned_parcels
  FOR DELETE USING (auth.uid() = user_id);

-- Create RLS policies for returned_parcel_products (based on parent parcel)
DROP POLICY IF EXISTS "Users can view own returned parcel products" ON returned_parcel_products;
CREATE POLICY "Users can view own returned parcel products" ON returned_parcel_products
  FOR SELECT USING (
    EXISTS (SELECT 1 FROM returned_parcels WHERE returned_parcels.id = returned_parcel_products.parcel_id AND returned_parcels.user_id = auth.uid())
  );

DROP POLICY IF EXISTS "Users can insert own returned parcel products" ON returned_parcel_products;
CREATE POLICY "Users can insert own returned parcel products" ON returned_parcel_products
  FOR INSERT WITH CHECK (
    EXISTS (SELECT 1 FROM returned_parcels WHERE returned_parcels.id = returned_parcel_products.parcel_id AND returned_parcels.user_id = auth.uid())
  );

DROP POLICY IF EXISTS "Users can delete own returned parcel products" ON returned_parcel_products;
CREATE POLICY "Users can delete own returned parcel products" ON returned_parcel_products
  FOR DELETE USING (
    EXISTS (SELECT 1 FROM returned_parcels WHERE returned_parcels.id = returned_parcel_products.parcel_id AND returned_parcels.user_id = auth.uid())
  );

-- ============================================
-- 11. STORAGE BUCKET FOR IMAGES
-- Run this in Supabase Dashboard > Storage
-- ============================================
-- Go to Storage > Create new bucket
-- Name: "images"
-- Public: Yes (or configure policies as needed)

-- Storage Policy for images bucket (run in SQL editor):
-- INSERT INTO storage.buckets (id, name, public) VALUES ('images', 'images', true);

-- Policy to allow authenticated users to upload
-- CREATE POLICY "Allow authenticated uploads" ON storage.objects
--   FOR INSERT WITH CHECK (bucket_id = 'images' AND auth.role() = 'authenticated');

-- Policy to allow public reads
-- CREATE POLICY "Allow public reads" ON storage.objects
--   FOR SELECT USING (bucket_id = 'images');

-- ============================================
-- DONE! Now update your Next.js code to use these tables
-- ============================================
