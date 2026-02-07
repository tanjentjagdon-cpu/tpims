
import { createClient } from '@supabase/supabase-js'
import dotenv from 'dotenv'

dotenv.config({ path: '.env.local' })

const supabaseUrl = process.env.NEXT_PUBLIC_SUPABASE_URL
const supabaseKey = process.env.SUPABASE_SERVICE_ROLE_KEY || process.env.NEXT_PUBLIC_SUPABASE_ANON_KEY

if (!supabaseUrl || !supabaseKey) {
    console.error('Missing Supabase credentials')
    process.exit(1)
}

const supabase = createClient(supabaseUrl, supabaseKey)

async function check() {
    const { data: integrations, error } = await supabase
        .from('tiktok_integrations')
        .select('*')
    
    if (error) {
        console.error('Error fetching integrations:', error)
        return
    }
    
    console.log(`Found ${integrations.length} integrations`)
    
    for (const integration of integrations) {
        console.log('--- Integration ---')
        console.log('User ID:', integration.user_id)
        console.log('Shop ID:', integration.shop_id)
        console.log('Shop Name:', integration.seller_name)
        console.log('Shop Cipher:', integration.shop_cipher)
        console.log('Access Token:', integration.access_token ? 'Present' : 'Missing')
        
        if (integration.shop_cipher === integration.shop_id) {
             console.warn('WARNING: shop_cipher is identical to shop_id. This is likely incorrect for V2 API.')
        }
    }
}

check()
