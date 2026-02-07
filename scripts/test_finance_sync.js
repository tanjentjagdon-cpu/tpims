const { createClient } = require('@supabase/supabase-js')
require('dotenv').config({ path: '.env.local' })

const supabaseUrl = process.env.NEXT_PUBLIC_SUPABASE_URL
const supabaseServiceKey = process.env.SUPABASE_SERVICE_ROLE_KEY

if (!supabaseUrl || !supabaseServiceKey) {
    console.error('❌ Missing Supabase credentials')
    process.exit(1)
}

const supabase = createClient(supabaseUrl, supabaseServiceKey)

async function testFinanceSync() {
    console.log('🧪 Testing TikTok Finance Sync...\n')

    try {
        // Get the integration
        const { data: integration, error: intError } = await supabase
            .from('tiktok_integrations')
            .select('*')
            .single()

        if (intError || !integration) {
            console.error('❌ No TikTok integration found:', intError?.message)
            console.log('\n⚠️  Please connect your TikTok Shop first by visiting the TikTok Orders page.')
            process.exit(1)
        }

        console.log('✅ Found TikTok integration for shop:', integration.seller_name)
        console.log('   Shop ID:', integration.shop_id)
        console.log('   Shop Cipher:', integration.shop_cipher?.substring(0, 10) + '...')

        console.log('\nℹ️  To test the finance sync properly:')
        console.log('   1. Go to http://localhost:3000/dashboard/tiktok/finance')
        console.log('   2. Click the "Sync Data" button')
        console.log('   3. Check the console logs for any errors')
        console.log('   4. Run this script again to see if data was saved')

        console.log('\n📊 Current data in database:')
        const { count: stmtCount } = await supabase
            .from('tiktok_finance_statements')
            .select('*', { count: 'exact', head: true })
        console.log(`   Statements: ${stmtCount || 0}`)

        const { count: payCount } = await supabase
            .from('tiktok_finance_payments')
            .select('*', { count: 'exact', head: true })
        console.log(`   Payments: ${payCount || 0}`)

    } catch (error) {
        console.error('❌ Test failed:', error.message)
        console.error(error)
    }
}

testFinanceSync()

