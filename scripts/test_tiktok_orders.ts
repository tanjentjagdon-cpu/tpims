
import dotenv from 'dotenv'
import path from 'path'
import { createClient } from '@supabase/supabase-js'

// Load environment variables FIRST
dotenv.config({ path: path.resolve(process.cwd(), '.env.local') })

const supabaseUrl = process.env.NEXT_PUBLIC_SUPABASE_URL
const supabaseKey = process.env.SUPABASE_SERVICE_ROLE_KEY

if (!supabaseUrl || !supabaseKey) {
    console.error('Missing Supabase credentials')
    process.exit(1)
}

const supabase = createClient(supabaseUrl, supabaseKey)

async function run() {
    // Dynamic import to ensure env vars are loaded
    const { getTikTokOrders } = await import('../src/lib/tiktok-api')

    console.log('Fetching integrations...')
    const { data: integrations, error } = await supabase
        .from('tiktok_integrations')
        .select('*')
    
    if (error || !integrations || integrations.length === 0) {
        console.error('No integrations found')
        return
    }

    const integration = integrations[0]
    console.log(`Testing with Shop: ${integration.seller_name} (${integration.shop_cipher})`)

    try {
        console.log('Calling getTikTokOrders for COMPLETED status...')
        const result = await getTikTokOrders(integration.access_token, integration.shop_id, integration.shop_cipher, '', 'COMPLETED')
        
        console.log('Result type:', typeof result)
        console.log('Is Array?', Array.isArray(result))
        console.log('Result keys:', Object.keys(result || {}))
        
        if (result && result.order_list) {
             console.log('Orders found (order_list):', result.order_list.length)
        } else if (result && result.orders) {
            console.log('Orders found (orders):', result.orders.length)
        } else {
            console.log('No orders/order_list field in result')
            console.log('Full Result:', JSON.stringify(result, null, 2))
        }
        
    } catch (e: any) {
        console.error('Test Failed:', e.message)
        if (e.cause) console.error('Cause:', e.cause)
    }
}

run()
