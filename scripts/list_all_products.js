require('dotenv').config({ path: '.env.local' });
const { createClient } = require('@supabase/supabase-js');

const supabase = createClient(process.env.NEXT_PUBLIC_SUPABASE_URL, process.env.SUPABASE_SERVICE_ROLE_KEY);

async function listProducts() {
    const { data, error } = await supabase
        .from('products')
        .select('variation, fabric_name')
        .limit(100);

    if (error) console.error(error);
    else {
        console.log('Total Products (Sample):', data.length);
        data.forEach(p => console.log(`${p.fabric_name} - ${p.variation}`));
    }
}

listProducts();
