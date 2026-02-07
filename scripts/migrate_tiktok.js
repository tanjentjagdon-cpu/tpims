const { createClient } = require('@supabase/supabase-js')
const fs = require('fs')
const path = require('path')

// Load environment variables
require('dotenv').config({ path: '.env.local' })

const supabaseUrl = process.env.NEXT_PUBLIC_SUPABASE_URL
const supabaseServiceKey = process.env.SUPABASE_SERVICE_ROLE_KEY

if (!supabaseUrl || !supabaseServiceKey) {
    console.error('❌ Missing Supabase credentials in .env.local')
    process.exit(1)
}

const supabase = createClient(supabaseUrl, supabaseServiceKey)

async function runMigration() {
    console.log('🔧 Running TikTok Orders Migration...\n')

    try {
        // Read the SQL file from root directory
        const sqlPath = path.join(__dirname, '..', 'add_tiktok_unique_constraint.sql')
        const sql = fs.readFileSync(sqlPath, 'utf8')

        console.log('📄 Executing SQL migration...')

        // Execute the SQL
        const { data, error } = await supabase.rpc('exec_sql', { sql_query: sql })

        if (error) {
            // If exec_sql doesn't exist, try direct query
            console.log('⚠️  exec_sql not available, trying direct execution...')

            // Split SQL into individual statements
            const statements = sql
                .split(';')
                .map(s => s.trim())
                .filter(s => s && !s.startsWith('--'))

            for (const statement of statements) {
                if (statement.toLowerCase().includes('notify')) continue // Skip NOTIFY

                console.log(`Executing: ${statement.substring(0, 50)}...`)
                const { error: stmtError } = await supabase.rpc('exec', {
                    query: statement
                })

                if (stmtError) {
                    console.error(`❌ Error: ${stmtError.message}`)
                    throw stmtError
                }
            }
        }

        console.log('\n✅ Migration completed successfully!')
        console.log('✅ Unique constraint added to tiktok_orders table')
        console.log('✅ Duplicate orders removed (if any)')
        console.log('\n🎉 TikTok order sync is now ready to use!')

    } catch (error) {
        console.error('\n❌ Migration failed:', error.message)
        console.error('\n📝 Please run the SQL manually in Supabase SQL Editor:')
        console.error('   File: add_tiktok_unique_constraint.sql')
        process.exit(1)
    }
}

runMigration()
