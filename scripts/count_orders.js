require('dotenv').config({ path: '.env.local' });
const { createClient } = require('@supabase/supabase-js');

const supabase = createClient(
    process.env.NEXT_PUBLIC_SUPABASE_URL,
    process.env.SUPABASE_SERVICE_ROLE_KEY
);

async function count() {
    console.log('Counting rows in shopee_orders...');

    // exact count
    const { count, error } = await supabase
        .from('shopee_orders')
        .select('*', { count: 'exact', head: true });

    if (error) {
        console.error('Error counting:', error);
        return;
    }

    console.log(`Total rows in DB: ${count}`);

    // Check unique order_ids if possible (client side count for now since distinct is tricky with simple count)
    // Actually, let's fetch IDs to count unique orders efficiently if row count is high
    const { data, error: dataError } = await supabase
        .from('shopee_orders')
        .select('order_id');

    if (dataError) {
        console.error('Error fetching IDs:', dataError);
    } else {
        const uniqueOrders = new Set(data.map(r => r.order_id));
        console.log(`Unique Order IDs in DB: ${uniqueOrders.size}`);
        console.log(`Rows returned by simple select: ${data.length}`);
    }
}

count();
