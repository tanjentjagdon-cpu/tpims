
const { createClient } = require('@supabase/supabase-js');
const path = require('path');
require('dotenv').config({ path: path.join(__dirname, '../.env.local') });

const supabaseUrl = process.env.NEXT_PUBLIC_SUPABASE_URL;
const supabaseKey = process.env.SUPABASE_SERVICE_ROLE_KEY;

if (!supabaseUrl || !supabaseKey) {
    console.error('Missing env vars');
    process.exit(1);
}

const supabase = createClient(supabaseUrl, supabaseKey);

async function checkState() {
    console.log('--- Checking Database State ---');

    // 1. Check if sales_orders has order_id column
    // We can't describe table easily via client, but we can try to select it.
    console.log('1. Checking sales_orders schema...');
    const { data: salesSample, error: salesError } = await supabase
        .from('sales_orders')
        .select('id, order_id, quantity, product_id, sale_date')
        .limit(1);
    
    if (salesError) {
        console.error('❌ Error selecting order_id from sales_orders:', salesError.message);
        console.log('   (This likely means the column "order_id" DOES NOT EXIST yet.)');
    } else {
        console.log('✅ sales_orders has order_id column.');
    }

    // 2. Check Lavender Product (ALL variations)
    console.log('\n2. Checking ALL "Lavender" products...');
    const { data: products, error: prodError } = await supabase
        .from('products')
        .select('id, variation, available_stock, sold_shopee')
        .ilike('variation', '%Lavender%'); 
    
    if (prodError) {
        console.error('Error fetching product:', prodError);
    } else {
        console.table(products);
        
        for (const p of products) {
            // 3. Check Sales History for this product
            console.log(`\n3. Checking Sales History for Product: ${p.variation} (${p.id})`);
            const { data: history, error: histError } = await supabase
                .from('sales_orders')
                .select('*')
                .eq('product_id', p.id)
                .order('created_at', { ascending: false });
            
            if (histError) console.error(histError);
            else {
                console.log(`Found ${history.length} sales records.`);
                if (history.length > 0) {
                     console.table(history.map(h => ({
                        id: h.id,
                        qty: h.quantity,
                        date: h.sale_date,
                        order_id: h.order_id || 'NULL'
                    })));
                }
            }
        }
    }

    // 4. Check specific Order ID in shopee_orders
    console.log('\n4. Checking Order ID "251031HVHGQH1T" in shopee_orders...');
    const { data: shopeeOrders, error: shopeeError } = await supabase
        .from('shopee_orders')
        .select('*')
        .eq('order_id', '251031HVHGQH1T');
    
    if (shopeeError) console.error(shopeeError);
    else {
        console.log(`Found ${shopeeOrders.length} records in shopee_orders.`);
        if (shopeeOrders.length > 0) console.log('Sample:', shopeeOrders[0].order_id, shopeeOrders[0].variation);
    }

    // 5. Check specific Order ID in sales_orders
    console.log('\n5. Checking Order ID "251031HVHGQH1T" in sales_orders...');
    const { data: salesOrders, error: salesOrderError } = await supabase
        .from('sales_orders')
        .select('*')
        .eq('order_id', '251031HVHGQH1T');

    if (salesOrderError) console.error(salesOrderError);
    else {
        console.log(`Found ${salesOrders.length} records in sales_orders.`);
    }
}

checkState();
