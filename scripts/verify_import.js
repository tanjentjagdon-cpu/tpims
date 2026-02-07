const { createClient } = require('@supabase/supabase-js');
require('dotenv').config({ path: '.env.local' });

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

    console.log(`Found ${data.length} rows.`);

    let totalBuyerPayment = 0;

    data.forEach(row => {
        console.log(`- Product: ${row.product_name}, Var: ${row.variation}, Qty: ${row.quantity}, Pay: ${row.total_payment}, IsSplit: ${row.is_split}`);
        totalBuyerPayment += parseFloat(row.total_payment);
    });

    console.log(`\nCalculated Total Payment in DB: ${totalBuyerPayment}`);

    const expected = 235;
    if (Math.abs(totalBuyerPayment - expected) < 0.01) {
        console.log('✅ SUCCCESS: Total matches expected value (235). Split logic is working.');
    } else {
        console.log(`❌ FAIL: Expected ${expected}, got ${totalBuyerPayment}`);
    }
}

verify();
