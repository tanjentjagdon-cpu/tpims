require('dotenv').config({ path: '.env.local' });
const { createClient } = require('@supabase/supabase-js');

const supabase = createClient(
    process.env.NEXT_PUBLIC_SUPABASE_URL,
    process.env.SUPABASE_SERVICE_ROLE_KEY
);

async function verify() {
    const TARGET_ORDER_ID = '260109HX3UEXTC';
    console.log('Verifying Order: ' + TARGET_ORDER_ID);

    const { data, error } = await supabase
        .from('shopee_orders')
        .select('*')
        .eq('order_id', TARGET_ORDER_ID);

    if (error) {
        console.error('Error:', error);
        return;
    }

    if (!data || data.length === 0) {
        console.log('❌ Order NOT FOUND in DB');
        return;
    }

    console.log(`Found ${data.length} rows.`);

    let totalIncome = 0;

    data.forEach((row, i) => {
        console.log(`\nRow ${i + 1}:`);
        console.log(`  Product: ${row.product_name}`);
        console.log(`  Qty: ${row.quantity}`);
        console.log(`  Buyer Pay: ${row.total_payment}`);
        console.log(`  Income (Net): ${row.estimated_income}`);
        console.log(`  Address: ${row.buyers_address ? row.buyers_address.substring(0, 30) + '...' : 'N/A'}`);
        console.log(`  Service Fee: ${row.service_fee}`);
        console.log(`  Trans Fee: ${row.transaction_fee}`);
        console.log(`  Tax: ${row.tax}`);
        console.log(`  Shipping Paid: ${row.shipping_fee_paid_by_buyer}`);

        totalIncome += Number(row.estimated_income);
    });

    console.log(`\nTotal Order Income (Sum): ${totalIncome}`);
}

verify();
