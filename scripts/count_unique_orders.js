require('dotenv').config({ path: '.env.local' });
const { createClient } = require('@supabase/supabase-js');

const supabase = createClient(process.env.NEXT_PUBLIC_SUPABASE_URL, process.env.SUPABASE_SERVICE_ROLE_KEY);

async function countUniqueOrders() {
    const { data, error } = await supabase
        .from('shopee_orders')
        .select('order_id');

    if (error) {
        console.error(error);
        return;
    }

    const uniqueIds = new Set(data.map(o => o.order_id));
    console.log('Total Rows:', data.length);
    console.log('Unique Orders:', uniqueIds.size);
}

countUniqueOrders();
