
require('dotenv').config({ path: '.env.local' });
const { createClient } = require('@supabase/supabase-js');

const supabase = createClient(
    process.env.NEXT_PUBLIC_SUPABASE_URL,
    process.env.SUPABASE_SERVICE_ROLE_KEY
);

async function checkProduct() {
    const { data, error } = await supabase
        .from('products')
        .select('id, variation, fabric_name, fabric_type')
        .ilike('variation', '%Geena%')
        .limit(5);
    
    if (error) {
        console.error(error);
    } else {
        console.table(data);
    }
}

checkProduct();
