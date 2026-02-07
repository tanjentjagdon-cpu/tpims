
require('dotenv').config({ path: '.env.local' });
const { createClient } = require('@supabase/supabase-js');

const supabase = createClient(
    process.env.NEXT_PUBLIC_SUPABASE_URL,
    process.env.SUPABASE_SERVICE_ROLE_KEY
);

async function checkFabrics() {
    const { data, error } = await supabase
        .from('products')
        .select('fabric_name')
        .order('fabric_name');
    
    if (error) {
        console.error(error);
    } else {
        const fabrics = [...new Set(data.map(p => p.fabric_name))];
        console.log('Available Fabrics:', fabrics);
        
        // Also check if table is empty
        const { count } = await supabase.from('products').select('*', { count: 'exact', head: true });
        console.log('Total Products:', count);
    }
}

checkFabrics();
