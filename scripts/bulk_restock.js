require('dotenv').config({ path: '.env.local' });
const { createClient } = require('@supabase/supabase-js');

const supabase = createClient(process.env.NEXT_PUBLIC_SUPABASE_URL, process.env.SUPABASE_SERVICE_ROLE_KEY);

async function bulkRestock() {
    console.log('Starting bulk restock...');

    // 1. Fetch all products
    const { data: products, error: productsError } = await supabase
        .from('products')
        .select('*');

    if (productsError) {
        console.error('Error fetching products:', productsError);
        return;
    }

    if (!products || products.length === 0) {
        console.log('No products found to restock.');
        return;
    }

    // 2. Fetch the first user to assign records (fallback logic)
    const { data: { users }, error: userError } = await supabase.auth.admin.listUsers();
    const userId = users && users.length > 0 ? users[0].id : products[0].user_id;

    if (!userId) {
        console.error('No user found to assign restock records.');
        return;
    }

    const restockDate = new Date().toISOString().split('T')[0];

    for (const product of products) {
        // Only restock if stock is low (below 10)
        if (product.available_stock < 10) {
            // Generate random stock between 100 and 300 yards
            const qtyToAdd = Math.floor(Math.random() * (300 - 100 + 1)) + 100;
            const cost = product.cost_price || (product.fabric_type === 'Printed' ? 25.00 : 16.30);
            const totalCost = qtyToAdd * cost;

            console.log(`Restocking ${product.fabric_name} - ${product.variation} adding ${qtyToAdd}y...`);

            // a. Add to restock_history
            const { error: historyError } = await supabase.from('restock_history').insert({
                product_id: product.id,
                quantity: qtyToAdd,
                cost_at_restock: cost,
                restock_date: restockDate,
                user_id: userId
            });

            if (historyError) {
                console.error(`Error adding history for ${product.variation}:`, historyError);
                continue;
            }

            // b. Add to expenses
            const { error: expenseError } = await supabase.from('expenses').insert({
                description: 'RESTOCK SUMMARY',
                amount: totalCost,
                quantity: qtyToAdd,
                unit_cost: cost,
                category: `${product.fabric_name} - ${product.variation}`,
                expense_date: restockDate,
                product_id: product.id,
                user_id: userId
            });

            if (expenseError) {
                console.error(`Error adding expense for ${product.variation}:`, expenseError);
                // Continue anyway to update stock if history succeeded
            }

            // c. Update products table
            const { error: updateError } = await supabase.from('products').update({
                total_stock: (product.total_stock || 0) + qtyToAdd,
                available_stock: (product.available_stock || 0) + qtyToAdd,
                cost_price: cost
            }).eq('id', product.id);

            if (updateError) {
                console.error(`Error updating product ${product.variation}:`, updateError);
            }
        } else {
            console.log(`Skipping ${product.variation} (Stock: ${product.available_stock}y)`);
        }
    }

    console.log('Bulk restock completed!');
}

bulkRestock();
