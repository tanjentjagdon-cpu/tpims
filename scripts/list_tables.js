
const { createClient } = require('@supabase/supabase-js');
require('dotenv').config({ path: '.env.local' });

async function listTables() {
    const supabase = createClient(
        process.env.NEXT_PUBLIC_SUPABASE_URL,
        process.env.SUPABASE_SERVICE_ROLE_KEY
    );

    console.log('Checking tables...');

    const { count: integrationsCount, error: intError } = await supabase
        .from('tiktok_integrations')
        .select('*', { count: 'exact', head: true });

    console.log('tiktok_integrations count:', integrationsCount, intError ? '(Error: ' + intError.message + ')' : '');

    const { count: ordersCount, error: ordError } = await supabase
        .from('tiktok_orders')
        .select('*', { count: 'exact', head: true });

    console.log('tiktok_orders count:', ordersCount, ordError ? '(Error: ' + ordError.message + ')' : '');

    if (integrationsCount > 0) {
        const { data: integrations } = await supabase.from('tiktok_integrations').select('*');
        console.log('Integrations:', JSON.stringify(integrations, null, 2));
    }
}

listTables();
