'use server'

// This script fetches ALL orders from TikTok API and logs detailed counts
// Run: npx tsx scripts/debug_tiktok_orders.ts

import { config } from 'dotenv'
config({ path: '.env.local' })

import { createClient } from '@supabase/supabase-js'
import crypto from 'crypto'

const TIKTOK_APP_KEY = process.env.TIKTOK_APP_KEY
const TIKTOK_APP_SECRET = process.env.TIKTOK_APP_SECRET!

const SUPABASE_URL = process.env.NEXT_PUBLIC_SUPABASE_URL!
const SUPABASE_KEY = process.env.SUPABASE_SERVICE_ROLE_KEY! // Use service role to bypass RLS

function generateSignatureV2(path: string, params: Record<string, string>, body: string, appSecret: string) {
    const keys = Object.keys(params)
        .filter(k => k !== 'sign' && k !== 'access_token')
        .sort()

    let paramStr = ''
    for (const key of keys) {
        paramStr += key + params[key]
    }

    const stringToSign = appSecret + path + paramStr + body + appSecret
    return crypto.createHmac('sha256', appSecret).update(stringToSign).digest('hex')
}

async function fetchOrdersForStatus(accessToken: string, shopCipher: string, status: string) {
    const path = '/order/202309/orders/search'
    const baseUrl = `https://open-api.tiktokglobalshop.com${path}`

    let allOrders: any[] = []
    let pageToken = ''
    let pageCount = 0

    do {
        pageCount++
        const timestamp = Math.floor(Date.now() / 1000).toString()

        const params: Record<string, string> = {
            app_key: TIKTOK_APP_KEY!,
            timestamp: timestamp,
            shop_cipher: shopCipher,
            page_size: '50'
        }

        const body: any = {
            create_time_ge: Math.floor(new Date('2025-10-01T00:00:00Z').getTime() / 1000)
        }
        if (pageToken) body.page_token = pageToken
        if (status) body.order_status = status

        const bodyStr = JSON.stringify(body)
        const sign = generateSignatureV2(path, params, bodyStr, TIKTOK_APP_SECRET)

        const url = new URL(baseUrl)
        Object.entries(params).forEach(([k, v]) => url.searchParams.append(k, v))
        url.searchParams.append('sign', sign)

        const response = await fetch(url.toString(), {
            method: 'POST',
            headers: {
                'Content-Type': 'application/json',
                'x-tts-access-token': accessToken
            },
            body: bodyStr
        })

        const data = await response.json()

        if (data.code !== 0) {
            console.log(`❌ Error for ${status}: ${data.message}`)
            break
        }

        const orders = data.data?.orders || []
        allOrders.push(...orders)

        // Get next page token
        pageToken = data.data?.next_page_token || ''

        console.log(`  Page ${pageCount}: ${orders.length} orders (total so far: ${allOrders.length})`)

    } while (pageToken && pageCount < 100)

    return { status, orders: allOrders, pages: pageCount }
}

async function main() {
    console.log('🔍 Debug TikTok Orders Fetch\n')

    // Get integration from Supabase
    const supabase = createClient(SUPABASE_URL, SUPABASE_KEY)

    const { data: integrations, error } = await supabase
        .from('tiktok_integrations')
        .select('*')
        .limit(1)

    if (error || !integrations?.length) {
        console.error('❌ No TikTok integration found. Please connect first.')
        return
    }

    const integration = integrations[0]
    console.log(`📱 Shop: ${integration.seller_name} (${integration.shop_id})\n`)

    // First, try fetching WITHOUT status filter to get all orders
    console.log('\n📦 Fetching ALL orders (no status filter)...')
    const allOrdersNoFilter = await fetchOrdersForStatus(
        integration.access_token,
        integration.shop_cipher,
        '' // No status filter
    )
    console.log(`✅ ALL (no filter): ${allOrdersNoFilter.orders.length} orders (${allOrdersNoFilter.pages} pages)`)

    // Valid statuses only (from TikTok API error message)
    const statuses = [
        'UNPAID',
        'ON_HOLD',
        'AWAITING_SHIPMENT',
        'AWAITING_COLLECTION',
        'PARTIALLY_SHIPPING',
        'IN_TRANSIT',
        'DELIVERED',
        'COMPLETED',
        'CANCELLED'
    ]

    const allOrders: any[] = [...allOrdersNoFilter.orders]
    const statusCounts: Record<string, number> = { 'ALL (no filter)': allOrdersNoFilter.orders.length }

    for (const status of statuses) {
        console.log(`\n📦 Fetching ${status}...`)

        try {
            const result = await fetchOrdersForStatus(
                integration.access_token,
                integration.shop_cipher,
                status
            )

            statusCounts[status] = result.orders.length
            allOrders.push(...result.orders)

            console.log(`✅ ${status}: ${result.orders.length} orders (${result.pages} pages)`)
        } catch (e: any) {
            console.log(`❌ ${status}: Error - ${e.message}`)
            statusCounts[status] = 0
        }
    }

    console.log('\n' + '='.repeat(50))
    console.log('📊 SUMMARY')
    console.log('='.repeat(50))

    console.log('\nBy Status:')
    for (const [status, count] of Object.entries(statusCounts)) {
        if (count > 0) {
            console.log(`  ${status}: ${count}`)
        }
    }

    // Count unique orders
    const uniqueOrderIds = new Set(allOrders.map(o => o.order_id || o.id))

    console.log(`\nTotal orders fetched: ${allOrders.length}`)
    console.log(`Unique order IDs: ${uniqueOrderIds.size}`)

    // Count total line items
    let totalLineItems = 0
    for (const order of allOrders) {
        const items = order.line_items || order.items || []
        totalLineItems += items.length || 1
    }
    console.log(`Total line items (products): ${totalLineItems}`)

    // Show sample order structure
    if (allOrders.length > 0) {
        console.log('\n📝 Sample order structure:')
        const sample = allOrders[0]
        console.log(`  Order ID: ${sample.order_id || sample.id}`)
        console.log(`  Status: ${sample.order_status || sample.status}`)
        console.log(`  Line items count: ${(sample.line_items || sample.items || []).length}`)
    }
}

main().catch(console.error)
