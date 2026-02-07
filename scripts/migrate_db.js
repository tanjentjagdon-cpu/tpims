const { createClient } = require('@supabase/supabase-js');
const fs = require('fs');
require('dotenv').config({ path: '.env.local' });

const supabaseUrl = process.env.NEXT_PUBLIC_SUPABASE_URL;
const supabaseKey = process.env.SUPABASE_SERVICE_ROLE_KEY;

if (!supabaseUrl || !supabaseKey) {
    console.error('Missing env vars');
    process.exit(1);
}

const supabase = createClient(supabaseUrl, supabaseKey);

async function runMigration() {
    console.log('Running migration...');
    try {
        const sql = fs.readFileSync('migration_add_item_key.sql', 'utf8');
        const { error } = await supabase.rpc('exec_sql', { sql_query: sql }); // Try RPC first if exists

        // If RPC doesn't exist (common), we might need to use direct query if supported or just warn the user.
        // Actually, Supabase JS client doesn't support raw SQL query directly without an RPC function unless completely open.
        // BUT, for structure changes, usually users run it in dashboard.
        // Let's try to assume there might be no exec_sql RPC.

        if (error) {
            console.log('RPC exec_sql failed (expected if not set up). Trying alternate or manual method.');
            console.error(error);
            console.log('\nIMPORTANT: Please run the const MIGRATION_FILE = \'migration_add_all_columns.sql\'; in your Supabase SQL Editor manually.');
        } else {
            console.log('Migration successful via RPC!');
        }

    } catch (e) {
        console.error('Migration failed:', e);
    }
}

// Since we can't reliably run DDL via JS client without a helper function on the server,
// Checking if we can use a simpler approach or if we should just ask the user.
// However, I can try to use the REST API to post to a table? No, DDL needs SQL Editor.
// Wait, I can try to use a Postgres client if I had the connection string, but I only have the API URL.
// Actually, let's just log the instruction if RPC fails.

runMigration();
