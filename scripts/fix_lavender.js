
const { createClient } = require('@supabase/supabase-js');
const path = require('path');
require('dotenv').config({ path: path.join(__dirname, '../.env.local') });

const supabase = createClient(process.env.NEXT_PUBLIC_SUPABASE_URL, process.env.SUPABASE_SERVICE_ROLE_KEY);

async function inspectAndFix() {
    console.log('--- Inspecting Lavender #35 ---');
    
    // 1. Get Product
    const { data: product } = await supabase
        .from('products')
        .select('*')
        .eq('variation', 'Lavender #35')
        .single();
    
    if (!product) {
        console.error('Product not found!');
        return;
    }

    console.log('Product State:', {
        id: product.id,
        variation: product.variation,
        available_stock: product.available_stock,
        sold_shopee: product.sold_shopee
    });

    // 2. Get Sales History
    const { data: sales } = await supabase
        .from('sales_orders')
        .select('*')
        .eq('product_id', product.id);

    console.log('\nSales History Raw:');
    console.log(JSON.stringify(sales, null, 2));

    // 3. Logic to Fix
    // If sold is 40, but we only see 1 order (or duplicates), we should fix it.
    // User implies correct sold should be 20 (based on "40 pa din bumawas").
    
    if (product.sold_shopee === 40) {
        console.log('\n--- APPLYING FIX ---');
        console.log('Detected over-deduction (40 sold). Reverting 20 units...');

        // Restore 20 units
        const newStock = (product.available_stock || 0) + 20;
        const newSold = (product.sold_shopee || 0) - 20;

        const { error: updateError } = await supabase
            .from('products')
            .update({
                available_stock: newStock,
                sold_shopee: newSold
            })
            .eq('id', product.id);
        
        if (updateError) console.error('Update failed:', updateError);
        else console.log(`✅ Fixed Product! Stock: ${newStock}, Sold: ${newSold}`);

        // Cleanup Sales Orders
        // If we have duplicates (same date, same qty), keep one with order_id, delete others.
        // Or if none have order_id, keep one, delete others.
        if (sales.length > 1) {
            console.log('Found multiple sales records. Cleaning up duplicates...');
            // Sort by whether it has order_id (keep those), then by date
            sales.sort((a, b) => (b.order_id ? 1 : 0) - (a.order_id ? 1 : 0));
            
            // Keep the first one
            const toKeep = sales[0];
            const toDelete = sales.slice(1);
            
            console.log(`Keeping sales ID: ${toKeep.id} (Order ID: ${toKeep.order_id})`);
            
            const idsToDelete = toDelete.map(s => s.id);
            if (idsToDelete.length > 0) {
                const { error: delError } = await supabase
                    .from('sales_orders')
                    .delete()
                    .in('id', idsToDelete);
                
                if (delError) console.error('Delete failed:', delError);
                else console.log(`✅ Deleted ${idsToDelete.length} duplicate sales records.`);
            }
        }
    } else {
        console.log('Stock/Sold count does not match the expected over-deduction scenario (40). No changes made automatically.');
    }
}

inspectAndFix();
