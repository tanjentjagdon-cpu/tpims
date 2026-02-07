require('dotenv').config({ path: '.env.local' });
const { createClient } = require('@supabase/supabase-js');

const supabase = createClient(
    process.env.NEXT_PUBLIC_SUPABASE_URL,
    process.env.SUPABASE_SERVICE_ROLE_KEY
);

async function clearOrders() {
    console.log('Clearing all data from shopee_orders...');
    const { error } = await supabase
        .from('shopee_orders')
        .delete()
        .neq('id', '00000000-0000-0000-0000-000000000000'); // Delete all rows where ID is distinct from a dummy UUID (effectively all)

    if (error) {
        console.error('Error clearing data:', error);
    } else {
        console.log('All orders deleted successfully.');
    }
}

clearOrders();
