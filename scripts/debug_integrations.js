
const { createClient } = require('@supabase/supabase-js');
require('dotenv').config({ path: '.env.local' });

async function checkIntegrations() {
    const supabase = createClient(
        process.env.NEXT_PUBLIC_SUPABASE_URL,
        process.env.NEXT_PUBLIC_SUPABASE_ANON_KEY
    );

    console.log('Checking tiktok_integrations table...');
    const { data, error } = await supabase
        .from('tiktok_integrations')
        .select('*');

    if (error) {
        console.error('Error fetching integrations:', error);
        return;
    }

    console.log(`Found ${data.length} integration(s).`);
    data.forEach((int, i) => {
        console.log(`Integration ${i + 1}:`);
        console.log(`  ID: ${int.id}`);
        console.log(`  User ID: ${int.user_id}`);
        console.log(`  Shop ID: ${int.shop_id}`);
        console.log(`  Seller Name: ${int.seller_name}`);
        console.log(`  Has Access Token: ${!!int.access_token}`);
    });

    const { data: users, error: userError } = await supabase.auth.getUser();
    console.log('Current Auth User State:', userError ? 'Error: ' + userError.message : (users?.user?.id || 'No user logged in (anon)'));
}

checkIntegrations();
