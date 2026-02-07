const { createClient } = require('@supabase/supabase-js');
require('dotenv').config({ path: '.env.local' });

const supabaseUrl = process.env.NEXT_PUBLIC_SUPABASE_URL;
const supabaseKey = process.env.SUPABASE_SERVICE_ROLE_KEY;
const supabase = createClient(supabaseUrl, supabaseKey);

const plainFabrics = [
    { name: 'Apple Green #12', dates: ['2025-10-21', '2025-12-29'] },
    { name: 'Aqua Blue #32', dates: ['2025-10-21', '2025-12-12', '2025-12-29'] },
    { name: 'Black #17', dates: ['2025-10-21', '2025-12-19'] },
    { name: 'Cream #20', dates: ['2025-10-21'] },
    { name: 'Emerald Green #15', dates: ['2025-10-21', '2025-12-12', '2026-01-05'] },
    { name: 'Fucshia Pink #10', dates: ['2025-10-21', '2025-12-19'] },
    { name: 'Green #13', dates: ['2025-10-21', '2025-12-12'] },
    { name: 'Dark Grey #56', dates: ['2025-10-21', '2025-12-19'] },
    { name: 'Lavender #35', dates: ['2025-10-21', '2025-12-19'] },
    { name: 'Light Blue #25', dates: ['2025-10-21', '2025-12-12'] },
    { name: 'Light Pink #04', dates: ['2025-10-21', '2025-12-29'] },
    { name: 'Maroon #61', dates: ['2025-10-21'] },
    { name: 'Off- White #02', dates: ['2025-10-21'] },
    { name: 'Olive Green #29', dates: ['2025-10-21', '2025-11-26', '2025-12-29'] },
    { name: 'Pink #05', dates: ['2025-10-21', '2025-12-12', '2026-01-05'] },
    { name: 'Purple #39', dates: ['2025-10-21', '2025-12-29'] },
    { name: 'Red #15', dates: ['2025-10-21', '2025-11-26', '2025-12-19', '2026-01-05'] },
    { name: 'Royal Blue #18', dates: ['2025-12-12', '2025-12-19'] },
    { name: 'White #01', dates: ['2025-10-21', '2025-11-26'] },
    { name: 'Yellow #08', dates: ['2025-10-21'] },
    { name: 'Yellow Gold #62', dates: ['2025-10-21', '2025-12-12', '2025-12-29'] },
];

const printedFabrics = [
    { name: 'Christmas Eve Cream', restocks: [{ date: '2025-10-21', qty: 150 }] },
    { name: 'Christmas Eve Red', restocks: [{ date: '2025-10-21', qty: 150 }] },
    { name: 'Desiree Lavender', restocks: [{ date: '2025-10-21', qty: 150 }, { date: '2025-12-12', qty: 150 }, { date: '2025-12-19', qty: 150 }, { date: '2025-12-29', qty: 150 }] },
    { name: 'Desiree Red', restocks: [{ date: '2025-10-21', qty: 150 }, { date: '2025-12-12', qty: 150 }] },
    { name: 'Blue Drake', restocks: [{ date: '2025-12-12', qty: 150 }, { date: '2025-12-19', qty: 150 }, { date: '2025-12-29', qty: 150 }, { date: '2026-01-05', qty: 150 }] },
    { name: 'Gray-Drake', restocks: [{ date: '2025-10-21', qty: 150 }, { date: '2025-11-26', qty: 127 }, { date: '2025-12-19', qty: 86 }, { date: '2025-12-29', qty: 77 }, { date: '2026-01-05', qty: 150 }] },
    { name: 'Red- Drake', restocks: [{ date: '2025-10-21', qty: 150 }, { date: '2025-12-19', qty: 150 }, { date: '2025-12-29', qty: 108 }, { date: '2026-01-05', qty: 150 }] },
    { name: 'ER Rose Apple Green', restocks: [{ date: '2025-10-21', qty: 150 }, { date: '2025-11-26', qty: 150 }, { date: '2025-12-12', qty: 150 }, { date: '2025-12-19', qty: 150 }, { date: '2025-12-29', qty: 150 }, { date: '2026-01-05', qty: 300 }] },
    { name: 'ER Rose Blue', restocks: [{ date: '2025-10-21', qty: 150 }, { date: '2025-11-26', qty: 300 }, { date: '2025-12-12', qty: 150 }, { date: '2025-12-19', qty: 150 }, { date: '2025-12-29', qty: 150 }] },
    { name: 'ER Rose Olive', restocks: [{ date: '2026-01-05', qty: 300 }] },
    { name: 'ER Rose Pink', restocks: [{ date: '2025-10-21', qty: 150 }, { date: '2025-11-26', qty: 183 }, { date: '2025-12-19', qty: 150 }, { date: '2025-12-29', qty: 150 }] },
    { name: 'Blue Esther', restocks: [{ date: '2025-12-12', qty: 150 }, { date: '2025-12-29', qty: 150 }] },
    { name: 'Red- Esther', restocks: [{ date: '2025-10-21', qty: 150 }, { date: '2025-12-12', qty: 150 }, { date: '2026-01-05', qty: 150 }] },
    { name: 'Pink- Esther PP', restocks: [{ date: '2025-10-21', qty: 150 }, { date: '2025-11-26', qty: 300 }, { date: '2025-12-19', qty: 150 }, { date: '2025-12-29', qty: 150 }, { date: '2026-01-05', qty: 150 }] },
    { name: 'Olive Green-Noraisa', restocks: [{ date: '2025-10-21', qty: 130 }, { date: '2025-11-26', qty: 150 }, { date: '2025-12-19', qty: 150 }, { date: '2025-12-29', qty: 150 }] },
    { name: 'Red Paloma', restocks: [{ date: '2025-12-12', qty: 150 }, { date: '2026-01-05', qty: 150 }] },
    { name: 'Yellow- Sidnilyn', restocks: [{ date: '2025-10-21', qty: 150 }, { date: '2025-11-26', qty: 150 }, { date: '2025-12-19', qty: 150 }, { date: '2025-12-29', qty: 150 }] },
];

async function seed() {
    console.log('Starting Clean Seed...');

    const { data: { users }, error: userError } = await supabase.auth.admin.listUsers();
    const userId = users?.[0]?.id;

    if (!userId) {
        console.error('No user found to assign records.');
        return;
    }

    // Helper to process fabrics
    const processFabrics = async (fabrics, type, cost) => {
        for (const item of fabrics) {
            const variation = item.name;
            const fabricName = 'Geena Cloth';
            const fabricType = type;

            console.log(`Creating product: ${variation} (${type})`);
            const { data: newProduct, error: insertError } = await supabase
                .from('products')
                .insert({
                    fabric_name: fabricName,
                    fabric_type: fabricType,
                    variation: variation,
                    cost_price: cost,
                    total_stock: 0,
                    available_stock: 0,
                    user_id: userId
                })
                .select()
                .single();

            if (insertError) {
                console.error(`Error creating ${variation}:`, insertError);
                continue;
            }
            const productId = newProduct.id;

            const restocks = item.restocks || item.dates.map(date => ({ date, qty: 150 }));
            let totalStockAdded = 0;

            for (const r of restocks) {
                const amount = r.qty * cost;
                console.log(`   - Restock on ${r.date}: ${r.qty}y`);

                await supabase.from('restock_history').insert({
                    product_id: productId,
                    quantity: r.qty,
                    cost_at_restock: cost,
                    restock_date: r.date,
                    user_id: userId
                });

                await supabase.from('expenses').insert({
                    description: 'RESTOCK SUMMARY',
                    amount: amount,
                    quantity: r.qty,
                    unit_cost: cost,
                    category: `${fabricName} ${type} ${variation}`,
                    expense_date: r.date,
                    product_id: productId,
                    user_id: userId
                });

                totalStockAdded += r.qty;
            }

            // Sync product stock
            await supabase.from('products').update({
                total_stock: totalStockAdded,
                available_stock: totalStockAdded,
                cost_price: cost
            }).eq('id', productId);
        }
    };

    console.log('Processing Plain fabrics...');
    await processFabrics(plainFabrics, 'Plain', 16.30);

    console.log('Processing Printed fabrics...');
    await processFabrics(printedFabrics, 'Printed', 25.00);

    console.log('Seed completed successfully!');
}

seed();
