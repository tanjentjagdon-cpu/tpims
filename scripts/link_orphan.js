
const { createClient } = require('@supabase/supabase-js');
const path = require('path');
require('dotenv').config({ path: path.join(__dirname, '../.env.local') });

const supabase = createClient(process.env.NEXT_PUBLIC_SUPABASE_URL, process.env.SUPABASE_SERVICE_ROLE_KEY);

async function linkOrphanRecord() {
    console.log('--- Linking Orphan Sales Record ---');
    
    // We know the ID from previous run: 166ea76e-e6f1-4104-83e3-91ad0984da37
    // And we know the Order ID: 251031HVHGQH1T
    
    const salesId = '166ea76e-e6f1-4104-83e3-91ad0984da37';
    const orderId = '251031HVHGQH1T';

    const { error } = await supabase
        .from('sales_orders')
        .update({ order_id: orderId })
        .eq('id', salesId);

    if (error) {
        console.error('Failed to link:', error);
    } else {
        console.log(`✅ Successfully linked Sales Record ${salesId} to Order ID ${orderId}`);
    }
}

linkOrphanRecord();
