require('dotenv').config({ path: '.env.local' });
const { createClient } = require('@supabase/supabase-js');

const supabase = createClient(process.env.NEXT_PUBLIC_SUPABASE_URL, process.env.SUPABASE_SERVICE_ROLE_KEY);

async function countOrders() {
    const { count, error } = await supabase
        .from('shopee_orders')
        .select('*', { count: 'exact', head: true });

    if (error) console.error(error);
    else console.log('Total Orders in DB:', count);
}

countOrders();
