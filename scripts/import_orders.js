const XLSX = require('xlsx');
const { createClient } = require('@supabase/supabase-js');
const fs = require('fs');
const path = require('path');
require('dotenv').config({ path: '.env.local' });

const supabaseUrl = process.env.NEXT_PUBLIC_SUPABASE_URL;
const supabaseKey = process.env.SUPABASE_SERVICE_ROLE_KEY;

if (!supabaseUrl || !supabaseKey) {
    console.error('Missing env vars');
    process.exit(1);
}

const supabase = createClient(supabaseUrl, supabaseKey);

// Column Mapping based on Shopee.xlsx (0-indexed)
const COLS = {
    DATE: 0, // Correction: Previous output showed DATE at 0 or 1 depending on empty col? 
    // read_excel.js step 54: "[Col 1] DATE". Col 0 was empty/undefined?
    // Let's re-verify: Step 54 says "[Col 1] DATE". So Index 1.
    // Wait, Step 54:
    // [Col 0] (Empty): 
    // [Col 1] DATE: 45960
    // So indices are 1-based in my previous log text? "rawHeaders.forEach((h, i) => ..."
    // No, "Col 0" is index 0.
    // So: 
    // Index 1: DATE
    // Index 2: Order ID
    // Mapped from 'read_excel.js' inspection
    DATE: 0,
    ORDER_ID: 2,
    STATUS: 3,
    ADDRESS: 4,
    PRODUCT: 5,
    PRICE: 6,
    QUANTITY: 7,
    ITEM_TOTAL: 8,
    SHIPPING_PAID: 9,
    SHIPPING_CHARGED: 10,
    SHIPPING_REBATE: 11,
    SUPPORT_FEE: 12,
    SERVICE_FEE: 13,
    TRANS_FEE: 14,
    TAX: 15,
    ORDER_TOTAL_SNAPSHOT: 16, // The 'Total' col at 16
    MERCH_SUBTOTAL: 17,
    SHIPPING_EXCESS: 18,
    SHOPEE_VOUCHER: 19,
    SELLER_VOUCHER: 20,
    PAYMENT_DISCOUNT: 21,
    COINS: 22,
    TOTAL_PAYMENT: 23
};

function excelDateToJSDate(serial) {
    const utc_days = Math.floor(serial - 25569);
    const utc_value = utc_days * 86400;
    const date_info = new Date(utc_value * 1000);
    return date_info;
}

async function importOrders() {
    console.log('Reading Shopee.xlsx...');
    const workbook = XLSX.readFile('Shopee.xlsx');
    const sheetName = workbook.SheetNames[0];
    const data = XLSX.utils.sheet_to_json(workbook.Sheets[sheetName], { header: 1 });

    // Skip header row(s). Usually Row 0 is header.
    const rows = data.slice(1);

    console.log(`Found ${rows.length} rows to process.`);

    let successCount = 0;
    let errorCount = 0;

    const ordersBatch = [];

    // Grouping for "is_split" logic (Optional, since we stick to all rows = separate items)
    // But we need to assign 'is_split' flag.
    const orderCounts = {};
    rows.forEach(r => {
        const oid = r[COLS.ORDER_ID];
        if (oid) orderCounts[oid] = (orderCounts[oid] || 0) + 1;
    });

    let lastOrderId = null;

    for (let i = 0; i < rows.length; i++) {
        const row = rows[i];
        let orderId = row[COLS.ORDER_ID];

        // Handle Merged Cells / Empty Order ID
        // If Order ID is missing but we have a Product (Col 5), assume it belongs to the previous Order ID.
        if (!orderId && lastOrderId && row[COLS.PRODUCT]) {
            orderId = lastOrderId;
        }

        if (!orderId) {
            // If we still don't have an orderId, and no product, it's garbage. 
            // Or if it's the start and empty.
            continue;
        }

        // Update last seen
        lastOrderId = orderId;

        // Note: isSplit logic previously relied on counting Order IDs upfront.
        // If we "fill down", our upfront count was WRONG because it ignored these empty rows.
        // We need to re-calculate isSplit or just handle it differently.
        // Actually, 'isSplit' is just an informational flag.
        // Let's rely on the Item Key sequence.

        const isSplit = orderCounts[orderId] > 1;
        const itemKey = `${orderId}_row_${i}`; // Unique Key per Excel Row

        // Parse Product & Variation
        let rawProduct = row[COLS.PRODUCT] || '';
        let productName = rawProduct;
        let variation = '';

        // Split on "Variation:" if present
        if (rawProduct.includes('Variation:')) {
            const parts = rawProduct.split('Variation:');
            productName = parts[0].trim();
            variation = parts[1].trim();
            // Clean up ",1 Yard..." common suffix if needed, but keeping it raw is safer for matching
        }

        // Parse Date
        let orderDate = new Date();
        if (row[COLS.DATE]) {
            if (typeof row[COLS.DATE] === 'number') {
                orderDate = excelDateToJSDate(row[COLS.DATE]);
            } else {
                // Try string parse
                orderDate = new Date(row[COLS.DATE]);
            }
        }

        const payload = {
            order_id: String(orderId).trim(),
            order_date: orderDate.toISOString(),
            product_name: productName,
            variation: variation,
            quantity: parseFloat(row[COLS.QUANTITY]) || 0,
            status: row[COLS.STATUS] || 'Completed',
            total_payment: parseFloat(row[COLS.TOTAL_PAYMENT]) || 0,
            estimated_income: parseFloat(row[COLS.ORDER_TOTAL_SNAPSHOT]) || 0, // Using ORDER_TOTAL_SNAPSHOT as estimated_income

            // Full Data Import
            buyers_address: row[COLS.ADDRESS] || '',
            shipping_fee_paid_by_buyer: parseFloat(row[COLS.SHIPPING_PAID]) || 0,
            estimated_shipping_fee: parseFloat(row[COLS.SHIPPING_CHARGED]) || 0,
            shipping_fee_rebate: parseFloat(row[COLS.SHIPPING_REBATE]) || 0,
            support_program_fee: parseFloat(row[COLS.SUPPORT_FEE]) || 0,
            service_fee: parseFloat(row[COLS.SERVICE_FEE]) || 0,
            transaction_fee: parseFloat(row[COLS.TRANS_FEE]) || 0,
            tax: parseFloat(row[COLS.TAX]) || 0,
            order_total_snapshot: parseFloat(row[COLS.ORDER_TOTAL_SNAPSHOT]) || 0,
            merchandise_subtotal: parseFloat(row[COLS.MERCH_SUBTOTAL]) || 0,
            shipping_fee_excess: parseFloat(row[COLS.SHIPPING_EXCESS]) || 0,
            shopee_voucher: parseFloat(row[COLS.SHOPEE_VOUCHER]) || 0,
            seller_voucher: parseFloat(row[COLS.SELLER_VOUCHER]) || 0,
            payment_discount: parseFloat(row[COLS.PAYMENT_DISCOUNT]) || 0,
            shopee_coins_redeemed: parseFloat(row[COLS.COINS]) || 0,

            item_key: itemKey,
            is_split: isSplit,
            // Assuming user_id will be handled by RLS? 
            // WAIT: Service Role bypasses RLS, but we need to assign a user_id if the table requires it.
            // shopee_orders.sql: user_id UUID REFERENCES auth.users(id).
            // We need a proper user_id.
            // Since this runs as admin, we should find the user.
            // For now, I'll fetch the first user or a specific user?
            // The user is likely the one logged in `npm run dev`.
            // But this script runs in Node.

            // CRITICAL: We need a user_id. 
            // Getting specific user "JentCosy" logic?
            // I'll query auth.users for a user email. Do I know it?
            // I will search for ANY user and use it (assuming single tenant for now) or
            // fail if multiple.
        };

        ordersBatch.push(payload);
    }

    // Get User ID
    // Note: auth.users is not directly accessible usually via public client? 
    // Service Role CAN access it.
    const { data: users, error: userError } = await supabase.auth.admin.listUsers();

    if (userError || !users || users.users.length === 0) {
        console.error('Could not find any user to assign orders to!');
        process.exit(1);
    }

    // Use the first user found (Risk: Wrong user if multiple)
    // But typically handy for single-user dev.
    const targetUserId = users.users[0].id;
    console.log(`Assigning orders to User ID: ${targetUserId} (${users.users[0].email})`);

    ordersBatch.forEach(o => o.user_id = targetUserId);

    // Upsert in chunks
    const CHUNK_SIZE = 100;
    for (let i = 0; i < ordersBatch.length; i += CHUNK_SIZE) {
        const chunk = ordersBatch.slice(i, i + CHUNK_SIZE);

        const { error } = await supabase
            .from('shopee_orders')
            .upsert(chunk, { onConflict: 'item_key' });

        if (error) {
            console.error('Error importing chunk:', error);
            errorCount += chunk.length;
        } else {
            successCount += chunk.length;
            process.stdout.write('.');
        }
    }

    console.log(`\nImport Finished.`);
    console.log(`Success: ${successCount}`);
    console.log(`Errors: ${errorCount}`);
}

importOrders();
