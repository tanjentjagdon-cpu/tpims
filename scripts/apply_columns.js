
const { createClient } = require('@supabase/supabase-js');
const fs = require('fs');
const path = require('path');
require('dotenv').config({ path: path.join(__dirname, '../.env.local') });

const supabaseUrl = process.env.NEXT_PUBLIC_SUPABASE_URL;
const supabaseKey = process.env.SUPABASE_SERVICE_ROLE_KEY;

if (!supabaseUrl || !supabaseKey) {
    console.error('Missing env vars');
    process.exit(1);
}

const supabase = createClient(supabaseUrl, supabaseKey);

async function runMigration() {
    console.log('Running migration to add missing columns...');
    try {
        const sqlPath = path.join(__dirname, '../add_missing_shopee_columns.sql');
        const sql = fs.readFileSync(sqlPath, 'utf8');
        
        console.log('SQL to execute:');
        console.log(sql);

        const { data, error } = await supabase.rpc('exec_sql', { sql_query: sql });

        if (error) {
            console.error('RPC exec_sql failed. You might need to run the SQL manually.');
            console.error('Error details:', error);
            
            // Fallback: Try to see if we can use a different method? No.
            // Just instruction.
            console.log('\n--- MANUAL INSTRUCTION ---');
            console.log('Please copy the content of "add_missing_shopee_columns.sql" and run it in your Supabase SQL Editor.');
        } else {
            console.log('Migration successful via RPC!');
        }

    } catch (e) {
        console.error('Migration failed:', e);
    }
}

runMigration();
