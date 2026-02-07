'use server'

import { config } from 'dotenv'
config({ path: '.env.local' })

import { createClient } from '@supabase/supabase-js'

const SUPABASE_URL = process.env.NEXT_PUBLIC_SUPABASE_URL!
const SUPABASE_KEY = process.env.SUPABASE_SERVICE_ROLE_KEY!

async function main() {
    console.log('🗑️ Clearing tiktok_orders table...')
    const supabase = createClient(SUPABASE_URL, SUPABASE_KEY)

    const { error } = await supabase
        .from('tiktok_orders')
        .delete()
        .neq('id', '00000000-0000-0000-0000-000000000000') // Delete all rows

    if (error) {
        console.error('❌ Failed to clear table:', error)
    } else {
        console.log('✅ tiktok_orders table cleared successfully!')
    }
}

main().catch(console.error)
