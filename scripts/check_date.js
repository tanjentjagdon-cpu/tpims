require('dotenv').config({ path: '.env.local' });
const { createClient } = require('@supabase/supabase-js');

const supabase = createClient(
    process.env.NEXT_PUBLIC_SUPABASE_URL,
    process.env.SUPABASE_SERVICE_ROLE_KEY
);

async function checkDate() {
    const { data, error } = await supabase
        .from('shopee_orders')
        .select('order_date')
        .limit(5);

    if (error) {
        console.error(error);
        return;
    }
    console.log('Sample dates from DB:', data);
}

checkDate();
