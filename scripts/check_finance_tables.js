const { createClient } = require('@supabase/supabase-js')
require('dotenv').config({ path: '.env.local' })

const supabaseUrl = process.env.NEXT_PUBLIC_SUPABASE_URL
const supabaseServiceKey = process.env.SUPABASE_SERVICE_ROLE_KEY

if (!supabaseUrl || !supabaseServiceKey) {
    console.error('❌ Missing Supabase credentials')
    process.exit(1)
}

const supabase = createClient(supabaseUrl, supabaseServiceKey)

async function checkFinanceTables() {
    console.log('🔍 Checking TikTok Finance Tables Setup...\n')

    try {
        // Check tiktok_finance_statements
        console.log('Checking tiktok_finance_statements...')
        const { data: statements, error: stmtError } = await supabase
            .from('tiktok_finance_statements')
            .select('*')
            .limit(1)

        if (stmtError) {
            console.error('❌ tiktok_finance_statements error:', stmtError.message)
        } else {
            console.log('✅ tiktok_finance_statements table exists')
            const { count: stmtCount } = await supabase
                .from('tiktok_finance_statements')
                .select('*', { count: 'exact', head: true })
            console.log(`📊 Statements in database: ${stmtCount || 0}`)
        }

        // Check tiktok_finance_payments
        console.log('\nChecking tiktok_finance_payments...')
        const { data: payments, error: payError } = await supabase
            .from('tiktok_finance_payments')
            .select('*')
            .limit(1)

        if (payError) {
            console.error('❌ tiktok_finance_payments error:', payError.message)
        } else {
            console.log('✅ tiktok_finance_payments table exists')
            const { count: payCount } = await supabase
                .from('tiktok_finance_payments')
                .select('*', { count: 'exact', head: true })
            console.log(`📊 Payments in database: ${payCount || 0}`)
        }

        console.log('\n✅ Finance tables check complete!')

    } catch (error) {
        console.error('❌ Check failed:', error.message)
    }
}

checkFinanceTables()
