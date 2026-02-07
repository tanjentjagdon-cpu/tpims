const { createClient } = require('@supabase/supabase-js');
require('dotenv').config({ path: '.env.local' });

// Use service role key to bypass RLS
const supabaseUrl = process.env.NEXT_PUBLIC_SUPABASE_URL;
const supabaseKey = process.env.SUPABASE_SERVICE_ROLE_KEY;
const supabase = createClient(supabaseUrl, supabaseKey);

async function populate() {
    console.log('Populating inventory stock...');

    // 1. Get products
    const { data: products, error: pError } = await supabase
        .from('products')
        .select('*');

    if (pError) {
        console.error('Error fetching products:', pError);
        return;
    }

    console.log(`Found ${products.length} products to check.`);

    // 2. Get User ID (fallback to first available if needed)
    let userId = products[0]?.user_id;
    if (!userId) {
        const { data: { users } } = await supabase.auth.admin.listUsers();
        if (users?.[0]) userId = users[0].id;
    }

    if (!userId) {
        console.error('No user_id found for records.');
        return;
    }

    const today = new Date().toISOString().split('T')[0];

    for (const p of products) {
        // Only if stock is 0 or very low
        if ((p.available_stock || 0) < 10) {
            const qty = Math.floor(Math.random() * 150) + 50; // 50-200y
            const cost = p.cost_price || (p.fabric_type === 'Printed' ? 25.0 : 16.3);

            console.log(`Restocking ${p.fabric_name} - ${p.variation} (+${qty}y)`);

            // Use .from('restock_history') but be careful about the table name
            // I will try to see if I can just insert into products first to be sure

            try {
                // a. Restock history
                const { error: hErr } = await supabase.from('restock_history').insert({
                    product_id: p.id,
                    quantity: qty,
                    cost_at_restock: cost,
                    restock_date: today,
                    user_id: userId
                });
                if (hErr) console.warn(`History failed for ${p.variation}: ${hErr.message}`);

                // b. Expenses
                const { error: eErr } = await supabase.from('expenses').insert({
                    category: p.fabric_name,
                    description: `Restock: ${p.variation}`,
                    amount: qty * cost,
                    quantity: qty,
                    unit_cost: cost,
                    expense_date: today,
                    product_id: p.id,
                    user_id: userId
                });
                if (eErr) console.warn(`Expense failed for ${p.variation}: ${eErr.message}`);

                // c. Final update to product
                const { error: uErr } = await supabase.from('products').update({
                    total_stock: (p.total_stock || 0) + qty,
                    available_stock: (p.available_stock || 0) + qty,
                    cost_price: cost
                }).eq('id', p.id);

                if (uErr) console.error(`Product update failed for ${p.variation}: ${uErr.message}`);
            } catch (err) {
                console.error(`Unexpected error for ${p.variation}:`, err);
            }
        }
    }

    console.log('Population script finished!');
}

populate();
