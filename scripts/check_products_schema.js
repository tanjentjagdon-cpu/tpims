
import { createClient } from '@supabase/supabase-js'
import dotenv from 'dotenv'
import path from 'path'

import { fileURLToPath } from 'url'
import { dirname } from 'path'

const __filename = fileURLToPath(import.meta.url)
const __dirname = dirname(__filename)

// Load env vars
dotenv.config({ path: path.resolve(__dirname, '../.env.local') })

const supabaseUrl = process.env.NEXT_PUBLIC_SUPABASE_URL
const supabaseKey = process.env.SUPABASE_SERVICE_ROLE_KEY || process.env.NEXT_PUBLIC_SUPABASE_ANON_KEY

if (!supabaseUrl || !supabaseKey) {
  console.error('Missing Supabase credentials')
  process.exit(1)
}

const supabase = createClient(supabaseUrl, supabaseKey)

async function checkProducts() {
  const { data, error } = await supabase
    .from('products')
    .select('*')
    .limit(1)

  if (error) {
    console.error('Error fetching products:', error)
    return
  }

  if (data && data.length > 0) {
    console.log('Product keys:', Object.keys(data[0]))
    console.log('Sample product:', data[0])
    
    // Check if fabric_name and fabric_type exist
    console.log('Has fabric_name:', 'fabric_name' in data[0])
    console.log('Has fabric_type:', 'fabric_type' in data[0])
  } else {
    console.log('No products found')
  }
}

checkProducts()
