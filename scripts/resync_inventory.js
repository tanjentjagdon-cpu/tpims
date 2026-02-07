require('dotenv').config({ path: '.env.local' });
const { createClient } = require('@supabase/supabase-js');

const supabaseUrl = process.env.NEXT_PUBLIC_SUPABASE_URL;
const supabaseKey = process.env.SUPABASE_SERVICE_ROLE_KEY;
const supabase = createClient(supabaseUrl, supabaseKey);

async function resyncInventory() {
    console.log('Fetching all products...');
    const { data: products, error } = await supabase.from('products').select('*');

    if (error) {
        console.error('Error fetching products:', error);
        return;
    }

    console.log(`Found ${products.length} products. Recalculating...`);

    for (const p of products) {
        // Calculate expected available stock
        const expectedAvailable = p.total_stock - p.sold_shopee - p.sold_tiktok;

        if (p.available_stock !== expectedAvailable) {
            console.log(`Mismatch for ${p.product_name}: Database ${p.available_stock}, Expected ${expectedAvailable}. Fixing...`);

            const { error: updateError } = await supabase
                .from('products')
                .update({ available_stock: expectedAvailable })
                .eq('id', p.id);

            if (updateError) {
                console.error(`Failed to update ${p.product_name}:`, updateError);
            }
        }
    }
    console.log('Resync complete.');
}

resyncInventory();
