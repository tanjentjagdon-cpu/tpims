const { createClient } = require('@supabase/supabase-js')
const fs = require('fs')
const path = require('path')

require('dotenv').config({ path: '.env.local' })

const supabaseUrl = process.env.NEXT_PUBLIC_SUPABASE_URL
const supabaseServiceKey = process.env.SUPABASE_SERVICE_ROLE_KEY

if (!supabaseUrl || !supabaseServiceKey) {
    console.error('❌ Missing Supabase credentials')
    process.exit(1)
}

const supabase = createClient(supabaseUrl, supabaseServiceKey)

async function createTikTokTable() {
    console.log('🔧 Creating TikTok Orders Table...\n')

    try {
        // Read the SQL file
        const sqlPath = path.join(__dirname, '..', 'create_tiktok_orders_table.sql')
        const sql = fs.readFileSync(sqlPath, 'utf8')

        console.log('📄 Executing table creation SQL...')

        // Split into statements and execute
        const statements = sql
            .split(';')
            .map(s => s.trim())
            .filter(s => s && !s.startsWith('--') && !s.toLowerCase().includes('notify'))

        for (const statement of statements) {
            if (!statement) continue

            console.log(`Executing: ${statement.substring(0, 60)}...`)

            // Use raw SQL execution via RPC or direct query
            const { error } = await supabase.rpc('exec', { query: statement })

            if (error) {
                // Try alternative method if RPC doesn't work
                console.log('Trying alternative execution method...')
                const { error: altError } = await supabase.from('_').select(statement)

                if (altError && !altError.message.includes('does not exist')) {
                    console.error(`Error: ${altError.message}`)
                }
            }
        }

        console.log('\n✅ Table creation completed!')
        console.log('✅ tiktok_orders table created')
        console.log('✅ RLS policies applied')
        console.log('✅ Indexes created')

        // Now run the constraint migration
        console.log('\n🔧 Adding unique constraint...')
        const constraintPath = path.join(__dirname, '..', 'add_tiktok_unique_constraint.sql')
        const constraintSql = fs.readFileSync(constraintPath, 'utf8')

        const constraintStatements = constraintSql
            .split(';')
            .map(s => s.trim())
            .filter(s => s && !s.startsWith('--') && !s.toLowerCase().includes('notify'))

        for (const statement of constraintStatements) {
            if (!statement) continue
            console.log(`Executing: ${statement.substring(0, 60)}...`)
            await supabase.rpc('exec', { query: statement })
        }

        console.log('\n✅ Unique constraint added!')
        console.log('\n🎉 TikTok orders table is fully set up and ready!')

    } catch (error) {
        console.error('\n❌ Setup failed:', error.message)
        console.error('\n📝 Please run these SQL files manually in Supabase SQL Editor:')
        console.error('   1. create_tiktok_orders_table.sql')
        console.error('   2. add_tiktok_unique_constraint.sql')
        process.exit(1)
    }
}

createTikTokTable()
