require('dotenv').config({ path: '.env.local' });
const { createClient } = require('@supabase/supabase-js');

const supabase = createClient(process.env.NEXT_PUBLIC_SUPABASE_URL, process.env.SUPABASE_SERVICE_ROLE_KEY);

async function checkNoraisa() {
    const { data, error } = await supabase
        .from('products')
        .select('*')
        .ilike('product_name', '%noraisa%')
        .or('fabric_name.ilike.%noraisa%');

    if (error) console.error(error);
    else console.log(JSON.stringify(data, null, 2));
}

checkNoraisa();
