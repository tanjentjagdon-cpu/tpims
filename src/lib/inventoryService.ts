import { supabase } from './supabaseClient';

export interface InventoryTransaction {
  id?: string;
  product_id: string;
  qty_change: number; // positive for add, negative for deduct
  transaction_type: 'sale' | 'return' | 'restock' | 'cut' | 'cancellation';
  reference_id: string; // order_id or cut_id or restock_id
  created_at?: string;
  user_id?: string;
}

/**
 * Load all products from Supabase inventory table
 */
export async function loadInventoryProducts(userId: string) {
  try {
    const { data, error } = await supabase
      .from('inventory_products')
      .select('*')
      .eq('user_id', userId)
      .order('created_at', { ascending: false });

    if (error) throw error;
    return data || [];
  } catch (error) {
    console.error('Error loading inventory products:', error);
    return [];
  }
}

/**
 * Save a new product to inventory
 */
export async function saveProduct(userId: string, product: any) {
  try {
    const { data, error } = await supabase
      .from('inventory_products')
      .insert({
        user_id: userId,
        product_name: product.productName,
        category: product.category,
        type: product.type,
        quantity: parseInt(product.quantity),
        image_url: product.image || null,
        created_at: new Date().toISOString(),
      })
      .select()
      .single();

    if (error) throw error;
    return data;
  } catch (error) {
    console.error('Error saving product:', error);
    throw error;
  }
}

/**
 * Update product quantity
 */
export async function updateProductQuantity(productId: string, newQuantity: number) {
  try {
    const { data, error } = await supabase
      .from('inventory_products')
      .update({ quantity: newQuantity })
      .eq('id', productId)
      .select()
      .single();

    if (error) throw error;
    return data;
  } catch (error) {
    console.error('Error updating product quantity:', error);
    throw error;
  }
}

/**
 * Delete a product from inventory
 */
export async function deleteProduct(productId: string) {
  try {
    const { error } = await supabase
      .from('inventory_products')
      .delete()
      .eq('id', productId);

    if (error) throw error;
    return true;
  } catch (error) {
    console.error('Error deleting product:', error);
    throw error;
  }
}

/**
 * Record an inventory transaction (sale, return, cut, etc.)
 * This creates an audit trail and updates product quantity
 */
export async function recordTransaction(userId: string, transaction: InventoryTransaction) {
  try {
    // Insert transaction record
    const { data: txData, error: txError } = await supabase
      .from('inventory_transactions')
      .insert({
        user_id: userId,
        product_id: transaction.product_id,
        qty_change: transaction.qty_change,
        transaction_type: transaction.transaction_type,
        reference_id: transaction.reference_id,
        created_at: new Date().toISOString(),
      })
      .select()
      .single();

    if (txError) throw txError;

    // Get current product quantity
    const { data: product, error: fetchError } = await supabase
      .from('inventory_products')
      .select('quantity')
      .eq('id', transaction.product_id)
      .single();

    if (fetchError) throw fetchError;

    // Update product quantity
    const newQuantity = (product?.quantity || 0) + transaction.qty_change;
    const { error: updateError } = await supabase
      .from('inventory_products')
      .update({ quantity: newQuantity })
      .eq('id', transaction.product_id);

    if (updateError) throw updateError;

    return { transaction: txData, newQuantity };
  } catch (error) {
    console.error('Error recording transaction:', error);
    throw error;
  }
}

/**
 * Get transaction history for a specific product
 */
export async function getProductTransactionHistory(productId: string) {
  try {
    const { data, error } = await supabase
      .from('inventory_transactions')
      .select('*')
      .eq('product_id', productId)
      .order('created_at', { ascending: false });

    if (error) throw error;
    return data || [];
  } catch (error) {
    console.error('Error fetching transaction history:', error);
    return [];
  }
}

/**
 * Sync ShopSales order with inventory
 * Deduct quantity when order is delivered/shipped
 */
export async function syncOrderWithInventory(userId: string, orderId: string, productId: string, quantity: number, status: string) {
  try {
    // Only process if status is Delivered or Shipped
    if (!['Delivered', 'Shipped'].includes(status)) {
      return null;
    }

    // Check if transaction already exists
    const { data: existing } = await supabase
      .from('inventory_transactions')
      .select('id')
      .eq('reference_id', orderId)
      .eq('transaction_type', 'sale')
      .single();

    if (existing) {
      console.log('Transaction already recorded for this order');
      return null;
    }

    // Record the transaction (deduct quantity)
    return await recordTransaction(userId, {
      product_id: productId,
      qty_change: -quantity, // negative because it's a sale
      transaction_type: 'sale',
      reference_id: orderId,
    });
  } catch (error) {
    console.error('Error syncing order with inventory:', error);
    throw error;
  }
}

/**
 * Handle order cancellation (add qty back)
 */
export async function handleOrderCancellation(userId: string, orderId: string, productId: string, quantity: number) {
  try {
    // Check if cancellation already recorded
    const { data: existing } = await supabase
      .from('inventory_transactions')
      .select('id')
      .eq('reference_id', orderId)
      .eq('transaction_type', 'cancellation')
      .single();

    if (existing) {
      console.log('Cancellation already recorded for this order');
      return null;
    }

    // Record cancellation (add quantity back)
    return await recordTransaction(userId, {
      product_id: productId,
      qty_change: quantity, // positive because we're adding back
      transaction_type: 'cancellation',
      reference_id: orderId,
    });
  } catch (error) {
    console.error('Error handling order cancellation:', error);
    throw error;
  }
}

/**
 * Record fabric cut
 */
export async function recordFabricCut(userId: string, cutId: string, productId: string, quantity: number) {
  try {
    return await recordTransaction(userId, {
      product_id: productId,
      qty_change: -quantity, // negative because it's being cut/used
      transaction_type: 'cut',
      reference_id: cutId,
    });
  } catch (error) {
    console.error('Error recording fabric cut:', error);
    throw error;
  }
}

/**
 * Record restock/restocking
 */
export async function recordRestock(userId: string, restockId: string, productId: string, quantity: number) {
  try {
    return await recordTransaction(userId, {
      product_id: productId,
      qty_change: quantity, // positive because we're adding
      transaction_type: 'restock',
      reference_id: restockId,
    });
  } catch (error) {
    console.error('Error recording restock:', error);
    throw error;
  }
}

/**
 * Get inventory summary for dashboard
 */
export async function getInventorySummary(userId: string) {
  try {
    const { data, error } = await supabase
      .from('inventory_products')
      .select('quantity')
      .eq('user_id', userId);

    if (error) throw error;

    const totalItems = data?.reduce((sum, p) => sum + (p.quantity || 0), 0) || 0;
    const lowStockItems = data?.filter((p) => (p.quantity || 0) <= 50).length || 0;
    const outOfStock = data?.filter((p) => (p.quantity || 0) === 0).length || 0;


    return {
      totalItems,
      lowStockItems,
      outOfStock,
      totalProducts: data?.length || 0,
    };
  } catch (error) {
    console.error('Error fetching inventory summary:', error);
    return {
      totalItems: 0,
      lowStockItems: 0,
      outOfStock: 0,
      totalProducts: 0,
    };
  }
}

/**
 * Create a CashFlow entry for released income (when sale is completed)
 */
export async function createCashFlowEntry(
  userId: string,
  type: string,
  amount: number,
  description: string,
  referenceId: string
) {
  try {
    const { data, error } = await supabase
      .from('cashflows')
      .insert({
        user_id: userId,
        type,
        amount,
        description,
        reference_id: referenceId,
        created_at: new Date().toISOString(),
      })
      .select()
      .single();

    if (error) throw error;
    return data;
  } catch (error) {
    console.error('Error creating cashflow entry:', error);
    throw error;
  }
}

/**
 * Delete CashFlow entries by reference ID (used when deleting a sale)
 */
export async function deleteCashFlowByReference(referenceId: string) {
  try {
    const { error } = await supabase
      .from('cashflows')
      .delete()
      .eq('reference_id', referenceId);

    if (error) throw error;
    return true;
  } catch (error) {
    console.error('Error deleting cashflow entry:', error);
    throw error;
  }
}

// ==========================================
// SALES FUNCTIONS
// ==========================================

export interface SaleProduct {
  productId: string;
  productName: string;
  quantity: number;
  price: number;
}

export interface Sale {
  id?: string;
  shop: string;
  buyer_name: string;
  contact_no: string;
  address: string;
  products: SaleProduct[];
  total_quantity: number;
  total_price: number;
  shipping_fee: number;
  final_total: number;
  status: string;
  released_date: string | null;
  released_time: string | null;
  income_status: string;
  user_id?: string;
  created_at?: string;
}

/**
 * Load all sales for a user
 */
export async function loadSales(userId: string) {
  try {
    const { data: sales, error } = await supabase
      .from('sales')
      .select(`
        *,
        sale_products (*)
      `)
      .eq('user_id', userId)
      .order('created_at', { ascending: false });

    if (error) throw error;

    // Transform to match frontend format
    return (sales || []).map((sale: any) => ({
      id: sale.id,
      shop: sale.shop,
      buyerName: sale.buyer_name,
      contactNo: sale.contact_no,
      address: sale.address,
      products: (sale.sale_products || []).map((p: any) => ({
        productId: p.product_id,
        productName: p.product_name,
        quantity: p.quantity,
        price: p.price,
      })),
      totalQuantity: sale.total_quantity,
      totalPrice: sale.total_price,
      shippingFee: sale.shipping_fee,
      finalTotal: sale.final_total,
      status: sale.status,
      releasedDate: sale.released_date,
      releasedTime: sale.released_time,
      incomeStatus: sale.income_status,
      createdAt: sale.created_at,
    }));
  } catch (error) {
    console.error('Error loading sales:', error);
    return [];
  }
}

/**
 * Save a new sale with products
 */
export async function saveSale(userId: string, sale: any) {
  try {
    // Insert main sale record
    const { data: saleData, error: saleError } = await supabase
      .from('sales')
      .insert({
        user_id: userId,
        shop: sale.shop,
        buyer_name: sale.buyerName,
        contact_no: sale.contactNo,
        address: sale.address,
        total_quantity: sale.totalQuantity,
        total_price: sale.totalPrice,
        shipping_fee: sale.shippingFee,
        final_total: sale.finalTotal,
        status: sale.status,
        released_date: sale.releasedDate || null,
        released_time: sale.releasedTime || null,
        income_status: sale.incomeStatus,
        created_at: new Date().toISOString(),
      })
      .select()
      .single();

    if (saleError) throw saleError;

    // Insert sale products
    const saleProducts = sale.products.map((p: any) => ({
      sale_id: saleData.id,
      product_id: p.productId,
      product_name: p.productName,
      quantity: p.quantity,
      price: p.price,
    }));

    const { error: productsError } = await supabase
      .from('sale_products')
      .insert(saleProducts);

    if (productsError) throw productsError;

    return { ...saleData, products: sale.products };
  } catch (error) {
    console.error('Error saving sale:', error);
    throw error;
  }
}

/**
 * Update an existing sale
 */
export async function updateSale(saleId: string, sale: any) {
  try {
    // Update main sale record
    const { error: saleError } = await supabase
      .from('sales')
      .update({
        shop: sale.shop,
        buyer_name: sale.buyerName,
        contact_no: sale.contactNo,
        address: sale.address,
        total_quantity: sale.totalQuantity,
        total_price: sale.totalPrice,
        shipping_fee: sale.shippingFee,
        final_total: sale.finalTotal,
        status: sale.status,
        released_date: sale.releasedDate || null,
        released_time: sale.releasedTime || null,
        income_status: sale.incomeStatus,
      })
      .eq('id', saleId);

    if (saleError) throw saleError;

    // Delete old products and insert new ones
    const { error: deleteError } = await supabase
      .from('sale_products')
      .delete()
      .eq('sale_id', saleId);

    if (deleteError) throw deleteError;

    // Insert updated products
    const saleProducts = sale.products.map((p: any) => ({
      sale_id: saleId,
      product_id: p.productId,
      product_name: p.productName,
      quantity: p.quantity,
      price: p.price,
    }));

    const { error: productsError } = await supabase
      .from('sale_products')
      .insert(saleProducts);

    if (productsError) throw productsError;

    return true;
  } catch (error) {
    console.error('Error updating sale:', error);
    throw error;
  }
}

/**
 * Delete a sale and its products
 */
export async function deleteSale(saleId: string) {
  try {
    // Products will be deleted automatically due to CASCADE
    const { error } = await supabase
      .from('sales')
      .delete()
      .eq('id', saleId);

    if (error) throw error;
    return true;
  } catch (error) {
    console.error('Error deleting sale:', error);
    throw error;
  }
}

// ==========================================
// EXPENSES FUNCTIONS
// ==========================================

export interface Expense {
  id?: string;
  date: string;
  name: string;
  type: string;
  fee: number;
  delivery_fee: number;
  total: number;
  image: string | null;
  user_id?: string;
  created_at?: string;
}

/**
 * Load all expenses for a user
 */
export async function loadExpenses(userId: string) {
  try {
    const { data, error } = await supabase
      .from('expenses')
      .select('*')
      .eq('user_id', userId)
      .order('date', { ascending: false });

    if (error) throw error;

    // Transform to match frontend format
    return (data || []).map((e: any) => ({
      id: e.id,
      date: e.date,
      name: e.name,
      type: e.type,
      fee: e.fee,
      deliveryFee: e.delivery_fee,
      total: e.total,
      image: e.image,
    }));
  } catch (error) {
    console.error('Error loading expenses:', error);
    return [];
  }
}

/**
 * Save a new expense
 */
export async function saveExpense(userId: string, expense: any) {
  try {
    const { data, error } = await supabase
      .from('expenses')
      .insert({
        user_id: userId,
        date: expense.date,
        name: expense.name,
        type: expense.type,
        fee: expense.fee,
        delivery_fee: expense.deliveryFee,
        total: expense.total,
        image: expense.image || null,
        created_at: new Date().toISOString(),
      })
      .select()
      .single();

    if (error) throw error;
    return {
      id: data.id,
      date: data.date,
      name: data.name,
      type: data.type,
      fee: data.fee,
      deliveryFee: data.delivery_fee,
      total: data.total,
      image: data.image,
    };
  } catch (error) {
    console.error('Error saving expense:', error);
    throw error;
  }
}

/**
 * Update an existing expense
 */
export async function updateExpense(expenseId: string, expense: any) {
  try {
    const { error } = await supabase
      .from('expenses')
      .update({
        date: expense.date,
        name: expense.name,
        type: expense.type,
        fee: expense.fee,
        delivery_fee: expense.deliveryFee,
        total: expense.total,
        image: expense.image || null,
      })
      .eq('id', expenseId);

    if (error) throw error;
    return true;
  } catch (error) {
    console.error('Error updating expense:', error);
    throw error;
  }
}

/**
 * Delete an expense
 */
export async function deleteExpense(expenseId: string) {
  try {
    const { error } = await supabase
      .from('expenses')
      .delete()
      .eq('id', expenseId);

    if (error) throw error;
    return true;
  } catch (error) {
    console.error('Error deleting expense:', error);
    throw error;
  }
}

// ==========================================
// FABRIC CUTS FUNCTIONS
// ==========================================

export interface FabricCut {
  id?: string;
  product_id: string;
  product_name: string;
  yards: number;
  date: string;
  user_id?: string;
  created_at?: string;
}

/**
 * Load all fabric cuts for a user
 */
export async function loadFabricCuts(userId: string) {
  try {
    const { data, error } = await supabase
      .from('fabric_cuts')
      .select('*')
      .eq('user_id', userId)
      .order('date', { ascending: false });

    if (error) throw error;

    // Transform to match frontend format
    return (data || []).map((c: any) => ({
      id: c.id,
      productId: c.product_id,
      productName: c.product_name,
      yards: c.yards,
      date: c.date,
    }));
  } catch (error) {
    console.error('Error loading fabric cuts:', error);
    return [];
  }
}

/**
 * Save a new fabric cut
 */
export async function saveFabricCut(userId: string, cut: any) {
  try {
    const { data, error } = await supabase
      .from('fabric_cuts')
      .insert({
        user_id: userId,
        product_id: cut.productId,
        product_name: cut.productName,
        yards: cut.yards,
        date: cut.date,
        created_at: new Date().toISOString(),
      })
      .select()
      .single();

    if (error) throw error;
    return {
      id: data.id,
      productId: data.product_id,
      productName: data.product_name,
      yards: data.yards,
      date: data.date,
    };
  } catch (error) {
    console.error('Error saving fabric cut:', error);
    throw error;
  }
}

/**
 * Mark fabric cut as used (delete from active list)
 */
export async function markFabricCutUsed(cutId: string) {
  try {
    const { error } = await supabase
      .from('fabric_cuts')
      .delete()
      .eq('id', cutId);

    if (error) throw error;
    return true;
  } catch (error) {
    console.error('Error marking fabric cut as used:', error);
    throw error;
  }
}

// ==========================================
// RETURNED PARCELS FUNCTIONS
// ==========================================

export interface ReturnedParcel {
  id?: string;
  order_id: string;
  shop: string;
  products: SaleProduct[];
  return_date: string;
  restocked_date: string | null;
  status: string;
  user_id?: string;
  created_at?: string;
}

/**
 * Load all returned parcels for a user
 */
export async function loadReturnedParcels(userId: string) {
  try {
    const { data, error } = await supabase
      .from('returned_parcels')
      .select('*')
      .eq('user_id', userId)
      .order('return_date', { ascending: false });

    if (error) throw error;

    // Transform to match frontend format
    return (data || []).map((p: any) => ({
      id: p.id,
      orderId: p.order_id,
      shop: p.shop,
      products: p.products || [],
      returnDate: p.return_date,
      restockedDate: p.restocked_date,
      status: p.status,
    }));
  } catch (error) {
    console.error('Error loading returned parcels:', error);
    return [];
  }
}

/**
 * Save a new returned parcel
 */
export async function saveReturnedParcel(userId: string, parcel: any) {
  try {
    const { data, error } = await supabase
      .from('returned_parcels')
      .insert({
        user_id: userId,
        order_id: parcel.orderId,
        shop: parcel.shop,
        products: parcel.products,
        return_date: parcel.returnDate,
        restocked_date: parcel.restockedDate || null,
        status: parcel.status,
        created_at: new Date().toISOString(),
      })
      .select()
      .single();

    if (error) throw error;
    return {
      id: data.id,
      orderId: data.order_id,
      shop: data.shop,
      products: data.products,
      returnDate: data.return_date,
      restockedDate: data.restocked_date,
      status: data.status,
    };
  } catch (error) {
    console.error('Error saving returned parcel:', error);
    throw error;
  }
}

/**
 * Mark returned parcel as restocked
 */
export async function markParcelRestocked(parcelId: string) {
  try {
    const { error } = await supabase
      .from('returned_parcels')
      .update({
        status: 'restocked',
        restocked_date: new Date().toISOString().split('T')[0],
      })
      .eq('id', parcelId);

    if (error) throw error;
    return true;
  } catch (error) {
    console.error('Error marking parcel as restocked:', error);
    throw error;
  }
}

/**
 * Delete a returned parcel
 */
export async function deleteReturnedParcel(parcelId: string) {
  try {
    const { error } = await supabase
      .from('returned_parcels')
      .delete()
      .eq('id', parcelId);

    if (error) throw error;
    return true;
  } catch (error) {
    console.error('Error deleting returned parcel:', error);
    throw error;
  }
}

// ==========================================
// CASHFLOWS FUNCTIONS (Extended)
// ==========================================

export interface CashFlow {
  id?: string;
  type: 'income' | 'expense';
  amount: number;
  category: string;
  description: string;
  date: string;
  notes: string | null;
  reference_id: string | null;
  user_id?: string;
  created_at?: string;
}

/**
 * Load all cashflows for a user
 */
export async function loadCashFlows(userId: string) {
  try {
    const { data, error } = await supabase
      .from('cashflows')
      .select('*')
      .eq('user_id', userId)
      .order('date', { ascending: false });

    if (error) throw error;

    // Transform to match frontend format
    return (data || []).map((c: any) => ({
      id: c.id,
      type: c.type,
      amount: c.amount,
      category: c.category,
      description: c.description,
      date: c.date,
      notes: c.notes,
      referenceId: c.reference_id,
    }));
  } catch (error) {
    console.error('Error loading cashflows:', error);
    return [];
  }
}

/**
 * Save a new cashflow entry
 */
export async function saveCashFlow(userId: string, cashflow: any) {
  try {
    const { data, error } = await supabase
      .from('cashflows')
      .insert({
        user_id: userId,
        type: cashflow.type,
        amount: cashflow.amount,
        category: cashflow.category,
        description: cashflow.description,
        date: cashflow.date,
        notes: cashflow.notes || null,
        reference_id: cashflow.referenceId || null,
        created_at: new Date().toISOString(),
      })
      .select()
      .single();

    if (error) throw error;
    return {
      id: data.id,
      type: data.type,
      amount: data.amount,
      category: data.category,
      description: data.description,
      date: data.date,
      notes: data.notes,
      referenceId: data.reference_id,
    };
  } catch (error) {
    console.error('Error saving cashflow:', error);
    throw error;
  }
}

/**
 * Update an existing cashflow
 */
export async function updateCashFlow(cashflowId: string, cashflow: any) {
  try {
    const { error } = await supabase
      .from('cashflows')
      .update({
        type: cashflow.type,
        amount: cashflow.amount,
        category: cashflow.category,
        description: cashflow.description,
        date: cashflow.date,
        notes: cashflow.notes || null,
      })
      .eq('id', cashflowId);

    if (error) throw error;
    return true;
  } catch (error) {
    console.error('Error updating cashflow:', error);
    throw error;
  }
}

/**
 * Delete a cashflow entry
 */
export async function deleteCashFlow(cashflowId: string) {
  try {
    const { error } = await supabase
      .from('cashflows')
      .delete()
      .eq('id', cashflowId);

    if (error) throw error;
    return true;
  } catch (error) {
    console.error('Error deleting cashflow:', error);
    throw error;
  }
}

/**
 * Get cashflow summary (total income, expenses, balance)
 */
export async function getCashFlowSummary(userId: string, month?: string) {
  try {
    let query = supabase
      .from('cashflows')
      .select('type, amount')
      .eq('user_id', userId);

    if (month) {
      // Filter by month (format: YYYY-MM)
      query = query.gte('date', `${month}-01`).lte('date', `${month}-31`);
    }

    const { data, error } = await query;

    if (error) throw error;

    const totalIncome = (data || [])
      .filter((c) => c.type === 'income')
      .reduce((sum, c) => sum + c.amount, 0);

    const totalExpenses = (data || [])
      .filter((c) => c.type === 'expense')
      .reduce((sum, c) => sum + c.amount, 0);

    return {
      totalIncome,
      totalExpenses,
      balance: totalIncome - totalExpenses,
    };
  } catch (error) {
    console.error('Error getting cashflow summary:', error);
    return { totalIncome: 0, totalExpenses: 0, balance: 0 };
  }
}
