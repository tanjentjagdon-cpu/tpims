const { createClient } = require('@supabase/supabase-js');
require('dotenv').config({ path: '.env.local' });

const supabase = createClient(process.env.NEXT_PUBLIC_SUPABASE_URL, process.env.SUPABASE_SERVICE_ROLE_KEY);

async function clean() {
    console.log('Cleaning database from duplicates and mock data...');

    // 1. Fetch all products
    const { data: products, error } = await supabase.from('products').select('*');
    if (error) {
        console.error('Error fetching products:', error);
        return;
    }

    console.log(`Total products current: ${products.length}`);

    // Identify duplicates. We'll group by variation, but case-insensitively or looking for ALL CAPS vs Title Case.
    const variationMap = {};
    const toDelete = [];

    products.forEach(p => {
        const key = p.variation.toLowerCase().trim();
        if (!variationMap[key]) {
            variationMap[key] = [];
        }
        variationMap[key].push(p);
    });

    for (const key in variationMap) {
        const group = variationMap[key];
        if (group.length > 1) {
            console.log(`Found duplicates for variation: ${key}`);
            // Keep the one that looks "original" (Title Case or older ID)
            // Usually my messed up ones are ALL CAPS.
            const original = group.find(p => p.variation !== p.variation.toUpperCase()) || group[0];
            group.forEach(p => {
                if (p.id !== original.id) {
                    toDelete.push(p.id);
                }
            });
        }
    }

    if (toDelete.length > 0) {
        console.log(`Deleting ${toDelete.length} duplicate/incorrect products...`);
        const { error: delError } = await supabase.from('products').delete().in('id', toDelete);
        if (delError) console.error('Error deleting products:', delError);
        else console.log('Deleted successfully.');
    } else {
        console.log('No duplicates found.');
    }

    // 2. Also clear all records in restock_history and expenses that I might have added in error
    // (Optional: Only if user wants to start over)

    console.log('Clean complete. Remaining products:', products.length - toDelete.length);
}

clean();
