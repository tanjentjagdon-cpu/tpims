require('dotenv').config({ path: '.env.local' });
const { createClient } = require('@supabase/supabase-js');

const supabase = createClient(
    process.env.NEXT_PUBLIC_SUPABASE_URL,
    process.env.SUPABASE_SERVICE_ROLE_KEY
);

async function run() {
    console.log('Importing Shopee Order (Using Fallback)...');

    // Use a placeholder UUID - RLS will be bypassed with service role key
    const userId = '00000000-0000-0000-0000-000000000000';
    console.log('Using Fallback User ID:', userId);

    const orderData = {
        user_id: userId,
        order_id: '251031HVHGQH1T',
        status: 'Completed',
        payout_status: 'Transferred',
        buyers_address: '******ary School, Conalum, Argao, Visayas, Cebu, 6021',
        order_date: new Date('11/08/2025 17:12').toISOString(),
        product_name: 'Good Quality Geena Fabric/Gina Tela for Curtains, Valance, Table, Chair Cover, DIY for decoration',
        variation: 'Lavender',
        quantity: 20,
        total_payment: 493,
        estimated_income: 532.32,
        shipping_fee_paid_by_buyer: 0,
        estimated_shipping_fee: -171,
        shipping_fee_rebate: 171,
        support_program_fee: 0,
        service_fee: -32,
        transaction_fee: -13,
        tax: -2.68,
        merchandise_subtotal: 580,
    };

    console.log('Deleting existing order if any...');
    await supabase.from('shopee_orders').delete().eq('order_id', orderData.order_id);

    console.log('Inserting order...');
    const { error: insertError } = await supabase.from('shopee_orders').insert([orderData]);

    if (insertError) {
        console.error('Insert Error:', insertError);
    } else {
        console.log('✅ Successfully imported order 251031HVHGQH1T!');
        console.log('   - Product: Lavender (Geena Fabric)');
        console.log('   - Quantity: 20');
        console.log('   - Net Income: ₱532.32');
        console.log('   - Status: Completed (Transferred)');
    }
}

run();
