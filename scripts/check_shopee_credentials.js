const { createClient } = require('@supabase/supabase-js');
require('dotenv').config({ path: '.env.local' });
const fs = require('fs');
const path = require('path');

const supabaseUrl = process.env.NEXT_PUBLIC_SUPABASE_URL;
const supabaseKey = process.env.SUPABASE_SERVICE_ROLE_KEY;
const supabase = createClient(supabaseUrl, supabaseKey);

async function runSql() {
    console.log('Running create_shopee_credentials_table.sql...');

    try {
        const sqlPath = path.join(__dirname, '..', 'create_shopee_credentials_table.sql');
        const sql = fs.readFileSync(sqlPath, 'utf8');

        // Split by statement if needed, but for now try executing as one mock call or use specific function if RPC enabled
        // Supabase-js client doesn't support raw SQL execution directly on standard plan unless using RPC.
        // BUT, I can try creating it via rest interface if I had the query.

        // Actually, the user usually runs SQL in the dashboard.
        // But let's check if we can check if table exists first via Postgrest

        const { error } = await supabase.from('shopee_credentials').select('id').limit(1);

        if (error && error.code === '42P01') { // undefined_table
            console.log('❌ Table "shopee_credentials" does not exist.');
            console.log('👉 Please run the "create_shopee_credentials_table.sql" file in your Supabase SQL Editor.');
        } else {
            console.log('✅ Table "shopee_credentials" seems to exist!');
        }

    } catch (err) {
        console.error('Error:', err);
    }
}

runSql();
