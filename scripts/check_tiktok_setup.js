const { createClient } = require('@supabase/supabase-js')
require('dotenv').config({ path: '.env.local' })

const supabaseUrl = process.env.NEXT_PUBLIC_SUPABASE_URL
const supabaseServiceKey = process.env.SUPABASE_SERVICE_ROLE_KEY

if (!supabaseUrl || !supabaseServiceKey) {
    console.error('❌ Missing Supabase credentials')
    process.exit(1)
}

const supabase = createClient(supabaseUrl, supabaseServiceKey)

async function checkTikTokSetup() {
    console.log('🔍 Checking TikTok Orders Setup...\n')

    try {
        // Check if table exists
        const { data: tables, error: tableError } = await supabase
            .from('tiktok_orders')
            .select('*')
            .limit(1)

        if (tableError) {
            console.error('❌ Table access error:', tableError.message)
            return
        }

        console.log('✅ tiktok_orders table exists')

        // Check for records
        const { count } = await supabase
            .from('tiktok_orders')
            .select('*', { count: 'exact', head: true })

        console.log(`📊 Total orders in database: ${count || 0}`)

        // Check unique constraint
        const { data: constraints } = await supabase
            .rpc('exec', {
                query: `
                    SELECT constraint_name, constraint_type 
                    FROM information_schema.table_constraints 
                    WHERE table_name = 'tiktok_orders' 
                    AND constraint_type = 'UNIQUE'
                `
            })

        if (constraints && constraints.length > 0) {
            console.log('✅ Unique constraint exists')
        } else {
            console.log('⚠️  No unique constraint found')
        }

        // Check RLS policies
        console.log('\n🔒 Checking RLS Policies...')
        const { data: policies } = await supabase
            .rpc('exec', {
                query: `
                    SELECT schemaname, tablename, policyname, permissive, roles, cmd, qual
                    FROM pg_policies 
                    WHERE tablename = 'tiktok_orders'
                `
            })

        if (policies && policies.length > 0) {
            console.log(`✅ Found ${policies.length} RLS policies`)
            policies.forEach(p => {
                console.log(`   - ${p.policyname} (${p.cmd})`)
            })
        } else {
            console.log('⚠️  No RLS policies found')
        }

        console.log('\n✅ Setup check complete!')

    } catch (error) {
        console.error('❌ Check failed:', error.message)
    }
}

checkTikTokSetup()
