const { createClient } = require('@supabase/supabase-js');
require('dotenv').config({ path: '.env.local' });

const supabaseUrl = process.env.NEXT_PUBLIC_SUPABASE_URL;
const supabaseKey = process.env.SUPABASE_SERVICE_ROLE_KEY;
const supabase = createClient(supabaseUrl, supabaseKey);

async function populate() {
    console.log('Populating inventory stock (Direct Products Update)...');

    const { data: products, error: pError } = await supabase
        .from('products')
        .select('*');

    if (pError) {
        console.error('Error fetching products:', pError);
        return;
    }

    console.log(`Found ${products.length} products.`);

    for (const p of products) {
        const qty = Math.floor(Math.random() * 150) + 50; // 50-200y
        const cost = p.cost_price || (p.fabric_type === 'Printed' ? 25.0 : 16.3);

        console.log(`Restocking ${p.fabric_name} - ${p.variation} (+${qty}y)`);

        const { error: uErr } = await supabase.from('products').update({
            total_stock: qty,
            available_stock: qty,
            cost_price: cost
        }).eq('id', p.id);

        if (uErr) {
            console.error(`Failed to update ${p.variation}:`, uErr.message);
        }
    }

    console.log('Population finished! Check the dashboard.');
}

populate();
