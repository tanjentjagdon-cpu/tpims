# Inventory Quantity Sync - Setup Guide

## Overview
This guide walks through setting up real-time inventory quantity synchronization across your TelaPhoria IMS modules:
- **Inventory**: Source of truth for product quantities
- **ShopSales**: Deducts qty when orders are delivered
- **Cuts**: Deducts qty when fabric is cut
- **Returns/Cancellations**: Adds qty back to inventory
- **Restock**: Adds qty when restocking

## Step 1: Create Supabase Tables

1. Go to https://app.supabase.com → Your Project → SQL Editor
2. Click "New Query"
3. Copy entire contents of `SUPABASE_INVENTORY_MIGRATION.sql`
4. Paste into SQL Editor
5. Click "Run"
6. Verify tables created: `inventory_products`, `inventory_transactions`

**Tables Created:**
- `inventory_products`: Main product table with quantities
- `inventory_transactions`: Audit trail for all qty changes
- Views: `low_stock_alerts`, `transaction_summary_30d`
- Function: `check_inventory_availability()`

## Step 2: Understand the Service Layer

File: `src/lib/inventoryService.ts`

**Key Functions:**

### Loading Products
```typescript
const products = await loadInventoryProducts(userId);
```

### Recording Transactions (Core System)
All qty changes go through `recordTransaction()`:
```typescript
await recordTransaction(userId, {
  product_id: 'uuid',
  qty_change: -5,           // negative = deduct, positive = add
  transaction_type: 'sale', // 'sale' | 'return' | 'cut' | 'restock' | 'cancellation'
  reference_id: 'order123'  // Links to ShopSales, Cuts, etc.
});
```

### Specific Transaction Types

**1. New Sale (When ShopSales order added):**
```typescript
await syncOrderWithInventory(userId, orderId, productId, quantity, 'Delivered');
```

**2. Order Cancellation:**
```typescript
await handleOrderCancellation(userId, orderId, productId, quantity);
```

**3. Fabric Cut:**
```typescript
await recordFabricCut(userId, cutId, productId, quantity);
```

**4. Restock:**
```typescript
await recordRestock(userId, restockId, productId, quantity);
```

## Step 3: Update Inventory Page (src/app/inventory/page.tsx)

**Changes Needed:**
1. Import inventoryService functions
2. Load products from Supabase on mount
3. When adding product: save to Supabase
4. When deleting product: delete from Supabase
5. Manual restock button: record restock transaction

**Example Implementation (Add this to component):**
```typescript
useEffect(() => {
  const loadProducts = async () => {
    if (session?.user?.id) {
      const data = await loadInventoryProducts(session.user.id);
      // Convert API data to match Product interface
      const formatted = data.map(p => ({
        id: p.id,
        productName: p.product_name,
        category: p.category,
        type: p.type,
        quantity: p.quantity,
        image: p.image_url,
        createdAt: p.created_at
      }));
      setProducts(formatted);
    }
  };
  loadProducts();
}, [session?.user?.id]);
```

## Step 4: Update ShopSales Page (src/app/shopsales/page.tsx)

**Changes Needed:**
1. Import inventoryService
2. When sale added with status='Delivered': call `syncOrderWithInventory()`
3. When sale status changes to 'Cancelled'/'Returned': call `handleOrderCancellation()`

**Example - In handleAddSale():**
```typescript
// After adding sale to local state
if (newSale.status === 'Delivered' || newSale.status === 'Shipped') {
  await syncOrderWithInventory(
    session.user.id,
    newSale.id,
    newSale.productId,
    newSale.quantity,
    newSale.status
  );
}
```

**Example - When status changes:**
```typescript
// In status change handler
if (newStatus === 'Cancelled' || newStatus === 'Returned') {
  const sale = sales.find(s => s.id === saleId);
  await handleOrderCancellation(
    session.user.id,
    saleId,
    sale.productId,
    sale.quantity
  );
}
```

## Step 5: Implement Cuts Page (src/app/cuts/page.tsx)

**Current State:** Blank page with basic structure

**Implementation:**
1. Create form to select product and enter cut quantity
2. On submit: call `recordFabricCut()`
3. Display transaction history

**Structure:**
```
Cuts Page
├── Form: Select Product + Enter Qty
├── Submit Button (triggers recordFabricCut)
└── Transaction History Table
```

## Step 6: Add Restock Feature (In Inventory Page)

**Implementation:**
Add "Restock" button in product detail modal or separate restock form:

```typescript
const handleRestock = async (productId, quantity) => {
  const restockId = `restock_${Date.now()}`;
  await recordRestock(session.user.id, restockId, productId, quantity);
};
```

## Transaction Flow Examples

### Example 1: Complete Sale Workflow
```
1. User in ShopSales adds order:
   - Product: "Geena Cloth - Plain"
   - Qty: 10
   - Status: "Delivered"

2. System calls syncOrderWithInventory()
   → Finds inventory record for product
   → Records transaction: qty_change = -10, type = 'sale'
   → Updates product quantity: 100 → 90

3. In ShopSales, user sees qty: 90 next refresh
4. In Inventory, product shows qty: 90
```

### Example 2: Return/Cancellation
```
1. User in ShopSales changes status "Delivered" → "Cancelled"

2. System calls handleOrderCancellation()
   → Records transaction: qty_change = +10, type = 'cancellation'
   → Updates product quantity: 90 → 100

3. Inventory reflects restored qty: 100
```

### Example 3: Fabric Cutting
```
1. User in Cuts page records cut:
   - Product: "Geena Cloth - Plain"
   - Qty cut: 5

2. System calls recordFabricCut()
   → Records transaction: qty_change = -5, type = 'cut'
   → Updates product quantity: 100 → 95

3. Inventory shows qty: 95
```

## Database Schema Reference

### inventory_products table
```sql
id (UUID)
user_id (UUID) - Links to auth.users
product_name (VARCHAR)
category (VARCHAR)
type (VARCHAR)
quantity (INTEGER) - Current stock
image_url (TEXT)
created_at (TIMESTAMP)
updated_at (TIMESTAMP)
```

### inventory_transactions table
```sql
id (UUID)
user_id (UUID)
product_id (UUID) - Links to inventory_products
qty_change (INTEGER) - +/- number
transaction_type (VARCHAR) - 'sale'|'return'|'cut'|'restock'|'cancellation'
reference_id (VARCHAR) - links to order_id, cut_id, etc.
created_at (TIMESTAMP)
```

## Testing Checklist

- [ ] Supabase tables created successfully
- [ ] Can add products in Inventory page → saves to Supabase
- [ ] Can view products in Inventory page → loads from Supabase
- [ ] Can delete product → removed from Supabase
- [ ] Add sale in ShopSales → Inventory qty decreases
- [ ] Cancel sale → Inventory qty restores
- [ ] Record cut in Cuts → Inventory qty decreases
- [ ] Restock product → Inventory qty increases
- [ ] Transaction history visible in Supabase transactions table

## Troubleshooting

**Problem: "Error: User not authenticated"**
- Ensure user is logged in
- Check session.user.id exists
- Verify Supabase RLS policies enabled

**Problem: "Qty not updating in real-time"**
- Refresh page to see latest qty
- To implement real-time: Add Supabase subscriptions to inventory pages
- Use: `supabase.from('inventory_products').on('*', callback).subscribe()`

**Problem: "Can't insert into inventory_products"**
- Check RLS policies are enabled
- Verify user_id matches authenticated user
- Check product_name isn't duplicate for same user

**Problem: "Transaction recorded but qty didn't update"**
- Check both transactions recorded with reference_id
- Verify product exists in inventory_products
- Check for negative qty (implement validation if needed)

## Next Steps (Optional Enhancements)

1. **Real-Time Updates**: Add Supabase subscriptions for live qty updates
2. **Negative Qty Validation**: Prevent sales/cuts if qty < requested
3. **Restock Alerts**: Show warning when qty drops below threshold
4. **Batch Operations**: Support bulk imports of products
5. **Inventory Reports**: Monthly/weekly transaction summaries
6. **Sync History**: View all qty changes for audit trail

## Environment Setup

Ensure `.env.local` has:
```
NEXT_PUBLIC_SUPABASE_URL=your_url
NEXT_PUBLIC_SUPABASE_ANON_KEY=your_key
```

These are already configured from initial setup.
