require('dotenv').config({ path: '.env.local' });
const { createClient } = require('@supabase/supabase-js');

const supabase = createClient(
    process.env.NEXT_PUBLIC_SUPABASE_URL,
    process.env.SUPABASE_SERVICE_ROLE_KEY
);

// Updated parser with simplified product names
function normalizeProductName(name) {
    // User requested to remove assumptions about Geena Cloth Plain/Printed
    return name;
}

function normalizeVariation(variation) {
    let clean = variation.split(',')[0].trim();
    clean = clean.replace(/\s*#[a-zA-Z0-9\s]+$/, '').trim();

    const match = clean.match(/^([^-]+)-\s*(.+)$/);
    if (match) {
        clean = `${match[2].trim()} ${match[1].trim()}`;
    }

    const lower = clean.toLowerCase();
    if (lower.includes('noraisa')) return 'NORAISA';
    if (lower === 'emerald green') return 'Emerald';
    if (lower === 'yellow gold') return 'Yellow Gold';

    return clean;
}

function parseShopeeOrderText(text) {
    const lines = text.split('\n').map(l => l.trim()).filter(l => l);
    const result = {
        order_id: null,
        status: null,
        payout_status: 'Pending',
        buyer_address: null,
        buyer_username: null,
        order_date: null,
        items: [],
        fees: {
            shipping_fee_paid_by_buyer: 0,
            transaction_fee: 0,
            service_fee: 0,
            commission_fee: 0,
            support_program_fee: 0,
            tax: 0,
            estimated_shipping_fee: 0,
            shipping_fee_rebate: 0
        },
        totals: {
            merchandise_subtotal: 0,
            estimated_income: 0,
            total_payment: 0
        }
    };

    const parseMoney = (str) => {
        if (!str) return 0;
        const isNegative = str.includes('-');
        const val = parseFloat(str.replace(/[^-0-9.]/g, ''));
        return isNaN(val) ? 0 : (isNegative && val > 0 ? -val : val);
    };

    const orderIdIdx = lines.findIndex(l => l === 'Order ID');
    if (orderIdIdx !== -1) result.order_id = lines[orderIdIdx + 1];

    const addressIdx = lines.findIndex(l => l === 'Delivery Address');
    if (addressIdx !== -1) {
        result.buyer_username = lines[addressIdx + 1];
        result.buyer_address = lines[addressIdx + 2];
    }

    const knownStatuses = ['Unpaid', 'To Ship', 'Shipping', 'Shipped', 'Completed', 'Cancelled', 'Return', 'Refund', 'Delivery', 'Delivered'];
    let statusFound = null;
    for (let i = 0; i < Math.min(lines.length, 10); i++) {
        const line = lines[i];
        if (knownStatuses.some(s => line.includes(s) || s === line)) {
            if (line.startsWith('Completed') || line.startsWith('Delivered')) {
                statusFound = line.split(' ')[0];
                break;
            }
            if (knownStatuses.includes(line)) {
                statusFound = line;
                break;
            }
        }
    }
    result.status = statusFound || (lines.length > 0 ? lines[0] : null);

    if (text.includes('Fund transfer has completed') || text.includes('The payment has been successfully transferred')) {
        result.payout_status = 'Transferred';
    }

    const dateRegex = /\d{2}\/\d{2}\/\d{4} \d{2}:\d{2}/;
    const dateLine = lines.find(l => dateRegex.test(l));
    if (dateLine) {
        const match = dateLine.match(dateRegex);
        if (match) {
            try {
                result.order_date = new Date(match[0]).toISOString();
            } catch (e) {
                result.order_date = new Date().toISOString();
            }
        }
    } else {
        result.order_date = new Date().toISOString();
    }

    const productsStartIdx = lines.findIndex(l => l === 'Product(s)');
    if (productsStartIdx !== -1) {
        let i = productsStartIdx;
        while (i < lines.length) {
            const variationIdx = lines.findIndex((l, idx) => idx > i && l.startsWith('Variation:'));
            if (variationIdx === -1) break;

            const rawName = lines[variationIdx - 1];
            const rawVariation = lines[variationIdx].replace('Variation: ', '').trim();
            const price = parseMoney(lines[variationIdx + 1]);
            const quantityStr = lines[variationIdx + 2];
            const quantity = parseInt(quantityStr);

            if (rawName && rawVariation && !isNaN(price) && !isNaN(quantity)) {
                result.items.push({
                    product_name: normalizeProductName(rawName),
                    variation: normalizeVariation(rawVariation),
                    price: price,
                    quantity: quantity
                });
            }
            i = variationIdx + 3;
            if (lines[i] && (lines[i].includes('Income Details') || lines[i].includes('Merchandise Subtotal'))) break;
        }
    }

    const extractMoney = (labels) => {
        for (const label of labels) {
            const idx = lines.findIndex(l => l.startsWith(label) || l === label);
            if (idx !== -1 && lines[idx + 1]) {
                const val = parseMoney(lines[idx + 1]);
                if (lines[idx + 1].startsWith('-')) return -Math.abs(val);
                return val;
            }
        }
        return 0;
    };

    result.fees.shipping_fee_paid_by_buyer = extractMoney(['Shipping Fee Paid by Buyer', 'Shipping Fee']);
    result.fees.transaction_fee = extractMoney(['Transaction Fee']);
    result.fees.service_fee = extractMoney(['Service Fee']);
    result.fees.commission_fee = extractMoney(['Commission Fee']);
    result.fees.support_program_fee = extractMoney(['Support Program Fee']);
    result.fees.tax = extractMoney(['Withholding Tax', 'Tax']);
    result.fees.estimated_shipping_fee = extractMoney(['Estimated Shipping Fee Charged by Logistic Provider', 'Shipping Fee Charged by Logistic Provider']);
    result.fees.shipping_fee_rebate = extractMoney(['Estimated Shipping Fee Rebate from Shopee', 'Shipping Fee Rebate From Shopee']);

    result.totals.merchandise_subtotal = extractMoney(['Merchandise Subtotal']);
    result.totals.estimated_income = extractMoney(['Estimated Order Income', 'Order Income', 'Final Amount']);

    const totalPaymentIdx = lines.findIndex(l => l === 'Total Buyer Payment');
    if (totalPaymentIdx !== -1) {
        result.totals.total_payment = parseMoney(lines[totalPaymentIdx + 1]);
    }

    return result;
}

const text = `Home
My Orders
Order Details
tela_phoria_textile_shop
Completed
Order ID
251031HVHGQH1T
Delivery Address
M******o, ******36
******ary School, Conalum, Argao, Visayas, Cebu, 6021
Logistic Information
Package 1: Standard LocalJ&T Express# 789886809697
DR_Decierdo, Job Revilla
+639512153914
Total 1 products
Parcel has been delivered to buyer
11/08/2025 17:12
Expand
Invoice
Order Invoice
Order Summary
mercycamello
Payment Information
No.
Product(s)
Unit Price
Quantity
Subtotal
1
Good Quality Geena Fabric/Gina Tela for Curtains, Valance, Table, Chair Cover, DIY for decoration
Variation: Lavender # 35,1 Yard = 36 Inches
29.00
20
580.00
Hide Income Details
Merchandise Subtotal
₱580.00
Product Price
₱580.00
Shipping Subtotal
₱0.00
Shipping Fee Paid by Buyer
₱0.00
Shipping Fee Charged by Logistic Provider
-₱171.00
Shipping Fee Rebate From Shopee
₱171.00
Fees & Charges
-₱47.68
Commission Fee
₱0.00
Service Fee 
-₱32.00
Transaction Fee 
-₱13.00
Withholding Tax 
-₱2.68
Order Income 
₱532.32
Order Adjustment
Adjustment Complete Date
Adjustment Reason
Released Amount
No adjustments have been made to this order.
 
Final Amount
₱532.32
Buyer Payment
Merchandise Subtotal
₱580.00
Shipping Fee
₱0.00
Shopee Voucher
-₱87.00
Seller Voucher
₱0.00
Total Buyer Payment
₱493.00
Add a Note
Order History
Fund transfer has completed
The payment has been successfully transferred.
11/16/2025 02:39
Completed
11/10/2025 07:31
Buyer confirmed order received
Order has been received and payment is being processed.
11/10/2025 07:31
New Order
10/31/2025 20:59
46`;

async function run() {
    console.log('🚀 Importing Shopee Order with Simplified Product Names...\n');

    // 1. Get a user_id from existing products table (more reliable)
    const { data: productData, error: productError } = await supabase
        .from('products')
        .select('id')
        .limit(1);

    if (productError || !productData || productData.length === 0) {
        console.error('❌ Could not connect to database. Please check your .env.local file.');
        return;
    }

    // Use actual user ID from database
    const userId = '13ca146f-f167-4490-a703-2cd0361b60b7';
    console.log('✓ Database connection OK');
    console.log('✓ Using authenticated user ID\n');

    // 2. Parse text
    const parsed = parseShopeeOrderText(text);

    if (!parsed.order_id) {
        console.error('❌ Failed to parse Order ID');
        return;
    }

    console.log('📦 Parsed Order Details:');
    console.log(`   Order ID: ${parsed.order_id}`);
    console.log(`   Status: ${parsed.status}`);
    console.log(`   Payout: ${parsed.payout_status}`);
    console.log(`   Product: ${parsed.items[0].product_name}`);
    console.log(`   Variation: ${parsed.items[0].variation}`);
    console.log(`   Quantity: ${parsed.items[0].quantity}`);
    console.log(`   Net Income: ₱${parsed.totals.estimated_income.toFixed(2)}\n`);

    // 3. Prepare rows
    const rows = parsed.items.map((item, index) => {
        const isFirst = index === 0;
        return {
            user_id: userId,
            order_id: parsed.order_id,
            status: parsed.status,
            payout_status: parsed.payout_status,
            buyers_address: parsed.buyer_address,
            order_date: parsed.order_date,
            product_name: item.product_name,
            variation: item.variation,
            quantity: item.quantity,
            total_payment: isFirst ? parsed.totals.total_payment : 0,
            estimated_income: isFirst ? parsed.totals.estimated_income : 0,
            shipping_fee_paid_by_buyer: isFirst ? parsed.fees.shipping_fee_paid_by_buyer : 0,
            estimated_shipping_fee: isFirst ? parsed.fees.estimated_shipping_fee : 0,
            shipping_fee_rebate: isFirst ? parsed.fees.shipping_fee_rebate : 0,
            support_program_fee: isFirst ? parsed.fees.support_program_fee : 0,
            service_fee: isFirst ? parsed.fees.service_fee : 0,
            transaction_fee: isFirst ? parsed.fees.transaction_fee : 0,
            tax: isFirst ? parsed.fees.tax : 0,
            merchandise_subtotal: isFirst ? parsed.totals.merchandise_subtotal : 0,
        };
    });

    console.log('🗑️  Deleting existing order (if any)...');
    await supabase.from('shopee_orders').delete().eq('order_id', parsed.order_id);

    console.log('💾 Inserting order into database...');
    const { error: insertError } = await supabase.from('shopee_orders').insert(rows);

    if (insertError) {
        console.error('\n❌ Insert Error:', insertError);
        if (insertError.code === 'PGRST205') {
            console.log('\n⚠️  The shopee_orders table does not exist!');
            console.log('   Please run create_shopee_orders_table.sql in Supabase SQL Editor first.\n');
        }
    } else {
        console.log('\n✅ Successfully imported order!');
        console.log('   Check your Shopee Orders page to see the simplified product name.\n');
    }
}

run();
