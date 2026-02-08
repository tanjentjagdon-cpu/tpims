
ALTER TABLE public.sales_orders
ADD COLUMN IF NOT EXISTS order_id TEXT;

CREATE INDEX IF NOT EXISTS idx_sales_orders_order_id ON public.sales_orders(order_id);

NOTIFY pgrst, 'reload schema';
