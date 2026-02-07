const { createClient } = require('@supabase/supabase-js');
require('dotenv').config({ path: '.env.local' });

const supabase = createClient(process.env.NEXT_PUBLIC_SUPABASE_URL, process.env.SUPABASE_SERVICE_ROLE_KEY);

async function absoluteClear() {
    console.log('--- STARTING ABSOLUTE CLEAR ---');

    // Disable triggers or just let them run? CASCADE should handle most things.
    // Order matters because of FKs.

    console.log('Deleting restock_history...');
    const { error: hErr } = await supabase.from('restock_history').delete().neq('id', '00000000-0000-0000-0000-000000000000');
    if (hErr) console.warn('History clear failed (might be empty):', hErr.message);

    console.log('Deleting expenses...');
    const { error: eErr } = await supabase.from('expenses').delete().neq('id', '00000000-0000-0000-0000-000000000000');
    if (eErr) console.warn('Expenses clear failed:', eErr.message);

    console.log('Deleting products...');
    const { error: pErr } = await supabase.from('products').delete().neq('id', '00000000-0000-0000-0000-000000000000');
    if (pErr) console.error('Products clear failed:', pErr.message);

    console.log('--- PURGE COMPLETE ---');
}

absoluteClear();
