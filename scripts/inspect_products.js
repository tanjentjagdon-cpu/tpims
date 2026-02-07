require('dotenv').config({ path: '.env.local' });
const { createClient } = require('@supabase/supabase-js');

const supabase = createClient(process.env.NEXT_PUBLIC_SUPABASE_URL, process.env.SUPABASE_SERVICE_ROLE_KEY);

async function inspectTable() {
    const { data, error } = await supabase.rpc('get_table_info', { table_name: 'products' });

    // If rpc doesn't exist, use select * limit 0
    if (error) {
        console.log('RPC failed, trying select.');
        const { data: selectData, error: selectError } = await supabase
            .from('products')
            .select('*')
            .limit(1);

        if (selectError) {
            console.log('Select error:', selectError.message);
        } else {
            console.log('Columns:', Object.keys(selectData[0] || {}));
        }
    } else {
        console.log('Table info:', data);
    }
}

inspectTable();
