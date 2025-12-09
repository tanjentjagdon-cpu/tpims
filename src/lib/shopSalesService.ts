import { supabase } from './supabaseClient';

// ============================================
// SHOP SALES SERVICE
// Handles all shop_sales CRUD operations
// ============================================

export interface ShopSale {
  id: string;
  user_id: string;
  order_id: string;
  shop: string;
  order_date: string;
  completion_date?: string;
  buyer_name?: string;
  buyer_contact?: string;
  buyer_address?: string;
  product_name: string;
  item_price: number;
  quantity: number;
  subtotal: number;
  shipping_fee_buyer: number;
  shipping_fee_charged: number;
  shipping_fee_rebate: number;
  service_fee: number;
  transaction_fee: number;
  tax: number;
  net_total: number;
  merchandise_subtotal: number;
  shipping_fee: number;
  shopee_voucher: number;
  seller_voucher: number;
  payment_discount: number;
  shopee_coin_redeem: number;
  total_buyer_payment: number;
  status: string;
  released_date?: string;
  released_time?: string;
  income_status: string;
  cancellation_reason?: string;
  created_at?: string;
  updated_at?: string;
}

// ============================================
// LOAD ALL SALES FOR A USER
// ============================================
export async function loadShopSales(userId: string): Promise<ShopSale[]> {
  const { data, error } = await supabase
    .from('shop_sales')
    .select('*')
    .eq('user_id', userId)
    .order('order_date', { ascending: false });

  if (error) {
    console.error('Error loading shop sales:', error);
    throw error;
  }

  return data || [];
}

// ============================================
// ADD A SINGLE SALE
// ============================================
export async function addShopSale(sale: Omit<ShopSale, 'id' | 'created_at' | 'updated_at'>): Promise<ShopSale> {
  const { data, error } = await supabase
    .from('shop_sales')
    .insert([sale])
    .select()
    .single();

  if (error) {
    console.error('Error adding shop sale:', error);
    throw error;
  }

  return data;
}

// ============================================
// BULK INSERT SALES (for CSV import)
// ============================================
export async function bulkInsertSales(sales: Omit<ShopSale, 'id' | 'created_at' | 'updated_at'>[]): Promise<{ inserted: number; errors: string[] }> {
  const errors: string[] = [];
  let inserted = 0;

  // Insert in batches of 100
  const batchSize = 100;
  for (let i = 0; i < sales.length; i += batchSize) {
    const batch = sales.slice(i, i + batchSize);
    
    const { data, error } = await supabase
      .from('shop_sales')
      .insert(batch)
      .select();

    if (error) {
      errors.push(`Batch ${Math.floor(i / batchSize) + 1}: ${error.message}`);
    } else {
      inserted += data?.length || 0;
    }
  }

  return { inserted, errors };
}

// ============================================
// UPDATE A SALE
// ============================================
export async function updateShopSale(id: string, updates: Partial<ShopSale>): Promise<ShopSale> {
  const { data, error } = await supabase
    .from('shop_sales')
    .update(updates)
    .eq('id', id)
    .select()
    .single();

  if (error) {
    console.error('Error updating shop sale:', error);
    throw error;
  }

  return data;
}

// ============================================
// DELETE A SALE
// ============================================
export async function deleteShopSale(id: string): Promise<void> {
  const { error } = await supabase
    .from('shop_sales')
    .delete()
    .eq('id', id);

  if (error) {
    console.error('Error deleting shop sale:', error);
    throw error;
  }
}

// ============================================
// DELETE ALL SALES FOR A USER (for re-import)
// ============================================
export async function deleteAllSales(userId: string): Promise<void> {
  const { error } = await supabase
    .from('shop_sales')
    .delete()
    .eq('user_id', userId);

  if (error) {
    console.error('Error deleting all sales:', error);
    throw error;
  }
}

// ============================================
// PARSE CSV ROW TO SHOP SALE
// Based on Shopee Excel export format
// ============================================
export function parseCSVRow(row: string[], userId: string): Omit<ShopSale, 'id' | 'created_at' | 'updated_at'> | null {
  try {
    // CSV columns based on Excel:
    // 0: DATE (order date)
    // 1: Order number
    // 2: Name (buyer name + contact)
    // 3: Status
    // 4: Date (completion date)
    // 5: Buyer's Address
    // 6: Products (product name)
    // 7: Item Price
    // 8: quantity
    // 9: Total (subtotal)
    // 10: Shipping fee paid by buyer
    // 11: Estimated Shipping Fee Charged
    // 12: Shipping fee Rebate
    // 13: Service Fee
    // 14: Transaction Fee
    // 15: Tax
    // 16: Total (net total)
    // 17: Merchandise Subtotal
    // 18: Shipping Fee
    // 19: Shopee Voucher
    // 20: Seller Voucher
    // 21: Payment discount
    // 22: shopee coin redeem
    // 23: Total Buyer Payment

    const parseNumber = (val: string): number => {
      if (!val || val === '-' || val.trim() === '') return 0;
      const cleaned = val.replace(/[^0-9.-]/g, '');
      return parseFloat(cleaned) || 0;
    };

    const parseDate = (val: string): string | null => {
      if (!val || val.trim() === '') return null;
      // Format: MM/DD/YYYY -> YYYY-MM-DD
      const parts = val.trim().split('/');
      if (parts.length === 3) {
        const [month, day, year] = parts;
        return `${year}-${month.padStart(2, '0')}-${day.padStart(2, '0')}`;
      }
      return null;
    };

    // Parse buyer name and contact from combined field
    const buyerInfo = row[2] || '';
    const buyerLines = buyerInfo.split('\n');
    const buyerName = buyerLines[0]?.trim() || '';
    const buyerContact = buyerLines[1]?.trim() || '';

    // Map status
    const rawStatus = (row[3] || '').toUpperCase().trim();
    let status = 'Shipped';
    let incomeStatus = 'Pending';
    if (rawStatus === 'COMPLETED') {
      status = 'Completed';
      incomeStatus = 'Released';
    } else if (rawStatus === 'DELIVERED') {
      status = 'Delivered';
      incomeStatus = 'Released';
    } else if (rawStatus === 'CANCELLED' || rawStatus === 'CANCELED') {
      status = 'Cancelled';
      incomeStatus = 'Pending';
    }

    const orderDate = parseDate(row[0]);
    if (!orderDate) {
      console.warn('Invalid order date:', row[0]);
      return null;
    }

    return {
      user_id: userId,
      order_id: (row[1] || '').trim(),
      shop: 'Shopee',
      order_date: orderDate,
      completion_date: parseDate(row[4]) || undefined,
      buyer_name: buyerName,
      buyer_contact: buyerContact,
      buyer_address: (row[5] || '').trim(),
      product_name: (row[6] || '').trim(),
      item_price: parseNumber(row[7]),
      quantity: Math.round(parseNumber(row[8])) || 1,
      subtotal: parseNumber(row[9]),
      shipping_fee_buyer: parseNumber(row[10]),
      shipping_fee_charged: parseNumber(row[11]),
      shipping_fee_rebate: parseNumber(row[12]),
      service_fee: Math.abs(parseNumber(row[13])), // Usually negative in CSV
      transaction_fee: Math.abs(parseNumber(row[14])),
      tax: Math.abs(parseNumber(row[15])),
      net_total: parseNumber(row[16]),
      merchandise_subtotal: parseNumber(row[17]),
      shipping_fee: parseNumber(row[18]),
      shopee_voucher: Math.abs(parseNumber(row[19])),
      seller_voucher: Math.abs(parseNumber(row[20])),
      payment_discount: Math.abs(parseNumber(row[21])),
      shopee_coin_redeem: Math.abs(parseNumber(row[22])),
      total_buyer_payment: parseNumber(row[23]),
      status,
      income_status: incomeStatus,
    };
  } catch (error) {
    console.error('Error parsing CSV row:', error, row);
    return null;
  }
}

// ============================================
// PARSE ENTIRE CSV FILE - Groups products by order_id
// ============================================
export function parseCSVFile(csvContent: string, userId: string): Omit<ShopSale, 'id' | 'created_at' | 'updated_at'>[] {
  // First, parse all rows into individual products
  const allRows: Omit<ShopSale, 'id' | 'created_at' | 'updated_at'>[] = [];
  
  // Split by lines, handling potential \r\n or \n
  const lines = csvContent.split(/\r?\n/);
  
  // Skip header row
  for (let i = 1; i < lines.length; i++) {
    const line = lines[i].trim();
    if (!line) continue;

    // Parse CSV line (handle quoted values with commas)
    const row = parseCSVLine(line);
    
    const sale = parseCSVRow(row, userId);
    if (sale && sale.order_id) {
      allRows.push(sale);
    }
  }

  // Group by order_id
  const orderGroups = new Map<string, Omit<ShopSale, 'id' | 'created_at' | 'updated_at'>[]>();
  
  for (const row of allRows) {
    const existing = orderGroups.get(row.order_id);
    if (existing) {
      existing.push(row);
    } else {
      orderGroups.set(row.order_id, [row]);
    }
  }

  // Merge products with same order_id
  const mergedSales: Omit<ShopSale, 'id' | 'created_at' | 'updated_at'>[] = [];
  
  for (const [orderId, products] of orderGroups) {
    if (products.length === 1) {
      // Single product order - use as-is
      mergedSales.push(products[0]);
    } else {
      // Multiple products - merge into one order
      const firstProduct = products[0];
      
      // Combine product names
      const productNames = products.map(p => p.product_name);
      let combinedName = productNames[0];
      if (productNames.length === 2) {
        combinedName = `${productNames[0]}, ${productNames[1]}`;
      } else if (productNames.length > 2) {
        combinedName = `${productNames[0]}, ${productNames[1]} (+${productNames.length - 2} more)`;
      }

      // Sum up quantities and amounts
      const totalQuantity = products.reduce((sum, p) => sum + p.quantity, 0);
      const totalSubtotal = products.reduce((sum, p) => sum + p.subtotal, 0);
      const totalItemPrice = totalSubtotal / totalQuantity; // Average price
      
      // Sum fees (only count once from first product to avoid double counting)
      // Shopee fees are usually per order, not per product
      const mergedOrder: Omit<ShopSale, 'id' | 'created_at' | 'updated_at'> = {
        ...firstProduct,
        product_name: combinedName,
        quantity: totalQuantity,
        item_price: Math.round(totalItemPrice * 100) / 100,
        subtotal: totalSubtotal,
        // Merchandise subtotal should be sum of all products
        merchandise_subtotal: products.reduce((sum, p) => sum + p.merchandise_subtotal, 0),
        // Net total - use the first row's net_total as it's usually the order total
        net_total: firstProduct.net_total,
        // Total buyer payment from first row
        total_buyer_payment: firstProduct.total_buyer_payment,
      };

      mergedSales.push(mergedOrder);
    }
  }

  return mergedSales;
}

// ============================================
// HELPER: Parse CSV line handling quoted values
// ============================================
function parseCSVLine(line: string): string[] {
  const result: string[] = [];
  let current = '';
  let inQuotes = false;

  for (let i = 0; i < line.length; i++) {
    const char = line[i];
    
    if (char === '"') {
      inQuotes = !inQuotes;
    } else if (char === ',' && !inQuotes) {
      result.push(current.trim());
      current = '';
    } else {
      current += char;
    }
  }
  
  // Don't forget the last field
  result.push(current.trim());
  
  return result;
}

// ============================================
// GET SALES SUMMARY
// ============================================
export async function getSalesSummary(userId: string) {
  const { data, error } = await supabase
    .from('shop_sales')
    .select('status, income_status, net_total, subtotal')
    .eq('user_id', userId);

  if (error) {
    console.error('Error getting sales summary:', error);
    throw error;
  }

  const summary = {
    totalOrders: data?.length || 0,
    totalGrossSales: 0,
    totalNetSales: 0,
    pendingIncome: 0,
    releasedIncome: 0,
    byStatus: {
      Shipped: 0,
      Delivered: 0,
      Completed: 0,
      Cancelled: 0,
    } as Record<string, number>,
  };

  data?.forEach(sale => {
    summary.totalGrossSales += sale.subtotal || 0;
    summary.totalNetSales += sale.net_total || 0;
    
    if (sale.income_status === 'Pending') {
      summary.pendingIncome += sale.net_total || 0;
    } else {
      summary.releasedIncome += sale.net_total || 0;
    }

    if (sale.status in summary.byStatus) {
      summary.byStatus[sale.status]++;
    }
  });

  return summary;
}

// ============================================
// EXPORT SALES TO EXCEL (via Render backend)
// ============================================
export async function exportSalesToExcel(
  sales: ShopSale[], 
  template: 'default' | 'bir' | 'summary' = 'default',
  filename: string = 'sales_export'
): Promise<void> {
  const API_URL = process.env.NEXT_PUBLIC_API_URL || 'https://tpimis-backend.onrender.com';
  
  // Transform sales data for export
  const exportData = sales.map(sale => ({
    orderId: sale.order_id,
    orderDate: sale.order_date,
    shop: sale.shop,
    buyerName: sale.buyer_name || '',
    productName: sale.product_name,
    quantity: sale.quantity,
    unitPrice: sale.item_price,
    subtotal: sale.subtotal,
    shippingFee: sale.shipping_fee || 0,
    serviceFee: sale.service_fee || 0,
    transactionFee: sale.transaction_fee || 0,
    tax: sale.tax || 0,
    netTotal: sale.net_total,
    status: sale.status,
    incomeStatus: sale.income_status,
    totalAmount: sale.subtotal,
  }));

  try {
    const response = await fetch(`${API_URL}/api/excel/export`, {
      method: 'POST',
      headers: {
        'Content-Type': 'application/json',
      },
      body: JSON.stringify({
        data: exportData,
        template,
        filename,
      }),
    });

    if (!response.ok) {
      throw new Error('Export failed');
    }

    // Download the file
    const blob = await response.blob();
    const url = window.URL.createObjectURL(blob);
    const a = document.createElement('a');
    a.href = url;
    a.download = `${filename}.xlsx`;
    document.body.appendChild(a);
    a.click();
    window.URL.revokeObjectURL(url);
    document.body.removeChild(a);
  } catch (error) {
    console.error('Export error:', error);
    throw error;
  }
}

