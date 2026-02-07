'use server'

import { createSupabaseServerClient } from '@/lib/supabase-server'
import { getTikTokAuthUrl, getTikTokOrders, exchangeTikTokToken, getAuthorizedShops, getTikTokProducts, getTikTokSettlements, getTikTokStatements, getTikTokPayments } from '@/lib/tiktok-api'
import { createClient } from '@supabase/supabase-js'

async function getSupabaseUser(token?: string) {
    try {
        const supabase = await createSupabaseServerClient()
        const { data: { user }, error } = await supabase.auth.getUser()

        if (error) {
            console.error('Session error:', error.message)
        }

        if (user) {
            console.log('✅ Session valid for user:', user.email)
            return { user, supabase }
        } else {
            console.warn('⚠️ No user found in server session')
        }
    } catch (e: any) {
        console.error('Error getting server session:', e.message)
    }

    if (token) {
        console.log('Trying token-based auth...')
        const supabase = createClient(
            process.env.NEXT_PUBLIC_SUPABASE_URL!,
            process.env.NEXT_PUBLIC_SUPABASE_ANON_KEY!,
            { global: { headers: { Authorization: `Bearer ${token}` } } }
        )
        const { data: { user } } = await supabase.auth.getUser()
        if (user) return { user, supabase }
    }

    console.error('❌ No valid session or token found')
    return { user: null, supabase: null }
}

export async function getAuthUrl() {
    return getTikTokAuthUrl()
}

export async function checkTikTokIntegration(token?: string) {
    const { user, supabase } = await getSupabaseUser(token)
    if (!user || !supabase) return null

    try {
        const { data, error } = await supabase
            .from('tiktok_integrations')
            .select('*')
            .eq('user_id', user.id)
            .single()

        if (error) return null
        return data
    } catch (e) {
        return null
    }
}

export async function fetchOrdersAction(token?: string) {
    const integration = await checkTikTokIntegration(token)
    if (!integration) throw new Error('No integration found')

    let currentCipher = integration.shop_cipher

    // Auto-fix shop_cipher if it seems invalid (e.g. same as shop_id which was a fallback)
    if (!currentCipher || currentCipher === integration.shop_id) {
        try {
            const shopsData = await getAuthorizedShops(integration.access_token)
            const shops = shopsData.shops || shopsData.shop_list || []
            if (shops.length > 0) {
                const shop = shops[0]
                const newCipher = shop.cipher || shop.shop_cipher

                if (newCipher && newCipher !== currentCipher) {
                    // Update DB
                    const { supabase } = await getSupabaseUser(token)
                    if (supabase) {
                        await supabase
                            .from('tiktok_integrations')
                            .update({ shop_cipher: newCipher })
                            .eq('id', integration.id)

                        currentCipher = newCipher
                    }
                }
            }
        } catch (e) {
            console.error('Auto-fix shop_cipher failed:', e)
        }
    }

    // List of statuses to fetch to ensure we get ALL orders
    // Restored all valid statuses
    const statuses = [
        'UNPAID', 'AWAITING_SHIPMENT', 'AWAITING_COLLECTION', 'PARTIALLY_SHIPPING',
        'IN_TRANSIT', 'DELIVERED', 'COMPLETED', 'CANCELLED', 'ON_HOLD',
        // 'RETURNED', 'FAILED', 'EXPIRED', 'TO_RETURN' // These often cause "invalid status" error
    ]
    const logs: string[] = []

    try {
        // Fetch all statuses IN PARALLEL to improve speed and avoid timeouts
        const promises = statuses.map(async (status) => {
            try {
                console.log(`Fetching orders for status: ${status}...`)

                let allOrdersForStatus: any[] = []

                // Monthly Fetch Strategy
                // Start from Oct 1, 2025 (Shop Start)
                const startDate = new Date('2025-10-01T00:00:00Z')
                const now = new Date()
                let currentDate = new Date(startDate)

                const timeWindows: { start: number, end: number }[] = []

                while (currentDate < now) {
                    const startTimestamp = Math.floor(currentDate.getTime() / 1000)

                    // Move to next month
                    const nextMonth = new Date(currentDate)
                    nextMonth.setMonth(nextMonth.getMonth() + 1)

                    // End timestamp is start of next month or now
                    const endTimestamp = Math.floor(Math.min(nextMonth.getTime(), now.getTime()) / 1000)

                    timeWindows.push({ start: startTimestamp, end: endTimestamp })
                    currentDate = nextMonth
                }

                // Fetch for each time window sequentially
                for (const window of timeWindows) {
                    const windowStart = new Date(window.start * 1000).toISOString().split('T')[0]
                    const windowEnd = new Date(window.end * 1000).toISOString().split('T')[0]
                    // console.log(`  Fetching ${status} for ${windowStart} to ${windowEnd}...`)

                    let pageToken = ''
                    let pageCount = 0
                    const maxPages = 50
                    const seenOrderIds = new Set<string>()

                    do {
                        pageCount++

                        const data = await getTikTokOrders(
                            integration.access_token,
                            integration.shop_id,
                            currentCipher,
                            pageToken,
                            status,
                            window.start,
                            window.end
                        )

                        const orders = data?.orders || data?.order_list || []

                        if (Array.isArray(orders) && orders.length > 0) {
                            // Smart Deduplication
                            const newOrders = orders.filter((o: any) => {
                                const id = o.order_id || o.id || o.orderId
                                if (!id) return true
                                if (seenOrderIds.has(id)) return false
                                seenOrderIds.add(id)
                                return true
                            })

                            if (newOrders.length === 0) {
                                // console.warn(`  All orders on page ${pageCount} are duplicates. Stopping fetch for ${status} in window.`)
                                break
                            }

                            allOrdersForStatus.push(...newOrders)
                            // console.log(`  Found ${newOrders.length} new orders in window`)
                        } else {
                            if (!pageToken && pageCount === 1) {
                                // console.log(`  No orders found for ${status} in window`)
                            }
                        }

                        pageToken = data?.next_page_token || data?.page_token || ''

                        if (!pageToken || pageCount >= maxPages) break

                    } while (pageToken)
                }

                console.log(`✅ Total for ${status}: ${allOrdersForStatus.length} orders`)

                return { status, orders: allOrdersForStatus, error: null }
            } catch (e: any) {
                console.error(`Error fetching ${status}:`, e.message)
                return { status, orders: [], error: e }
            }
        })

        const results = await Promise.all(promises)
        const allOrders: any[] = []

        for (const res of results) {
            if (res.error) {
                console.error(`Failed to fetch status ${res.status}:`, res.error.message)
                logs.push(`Error fetching status ${res.status}: ${res.error.message}`)
            } else {
                const orders = res.orders || []

                if (Array.isArray(orders) && orders.length > 0) {
                    const count = orders.length
                    logs.push(`Status ${res.status}: Found ${count} orders`)
                    allOrders.push(...orders)
                } else {
                    logs.push(`Status ${res.status}: No orders found`)
                }
            }
        }

        if (allOrders.length === 0) {
            console.warn('All statuses fetched but returned 0 orders.')
            logs.push('Finished: 0 orders found across all statuses.')
        }

        // Deduplicate orders
        const uniqueOrders = Array.from(new Map(allOrders.map((o: any, index: number) => {
            // Use same robust ID extraction as in page.tsx
            const id = o.order_id || o.id || o.orderId || o.order_number || o.orderNumber || `TEMP_ID_${Date.now()}_${index}`
            // Add the ID to the object if missing so it persists
            if (!o.order_id) o.order_id = id

            // Log if we had to generate a temp ID
            if (id.startsWith('TEMP_ID_')) console.warn(`Generated TEMP ID for order at index ${index}:`, o)

            return [id, o]
        })).values())

        // Sort by create_time desc
        uniqueOrders.sort((a: any, b: any) => {
            const timeA = a.create_time || a.created_at || 0
            const timeB = b.create_time || b.created_at || 0
            return Number(timeB) - Number(timeA)
        })

        return { order_list: uniqueOrders, logs }
    } catch (e: any) {
        // Retry logic for invalid shop_cipher (106011) - Simplified for loop
        // If the first request failed with 106011, we might need to refresh
        if (e.message && e.message.includes('106011')) {
            console.log('Invalid shop_cipher detected. Attempting to refresh...')
            try {
                const shopsData = await getAuthorizedShops(integration.access_token)
                const shops = shopsData.shops || shopsData.shop_list || []
                if (shops.length > 0) {
                    const shop = shops[0]
                    const newCipher = shop.cipher || shop.shop_cipher

                    if (newCipher) {
                        // Update DB
                        const { supabase } = await getSupabaseUser(token)
                        if (supabase) {
                            await supabase
                                .from('tiktok_integrations')
                                .update({ shop_cipher: newCipher })
                                .eq('id', integration.id)
                        }

                        // Retry fetch with new cipher (just try one status to verify)
                        const retryData = await getTikTokOrders(
                            integration.access_token,
                            integration.shop_id,
                            newCipher,
                            '',
                            'COMPLETED' // Try COMPLETED
                        )
                        return {
                            order_list: retryData.orders || retryData.order_list || [],
                            logs: ['Auto-fixed shop_cipher and retried fetch (COMPLETED only)']
                        }
                    }
                }
            } catch (refreshError: any) {
                console.error('Failed to refresh shop_cipher:', refreshError)
                throw new Error(`Auto-fix failed: ${refreshError.message}. Original error: ${e.message}`)
            }
        }

        console.error('Fetch Orders Failed:', e)
        throw new Error(e.message || 'Failed to fetch orders')
    }
}

export async function exchangeAndSaveToken(code: string, token?: string) {
    const { user, supabase } = await getSupabaseUser(token)

    if (!user || !supabase) throw new Error('Unauthorized')

    // Exchange code for tokens
    const tokenData = await exchangeTikTokToken(code)

    // Fetch Authorized Shops to get shop_cipher if missing
    let shopCipher = tokenData.shop_cipher
    let shopId = tokenData.shop_id
    let shopName = tokenData.seller_name

    try {
        const shopsData = await getAuthorizedShops(tokenData.access_token)
        // TikTok API response structure for shops often uses 'shops' array
        const shops = shopsData.shops || shopsData.shop_list || []

        if (shops.length > 0) {
            // Use the first shop
            const shop = shops[0]
            shopCipher = shop.cipher || shop.shop_cipher || shopCipher
            shopId = shop.id || shop.shop_id || shopId
            shopName = shop.name || shop.shop_name || shopName
        }
    } catch (e) {
        console.error('Failed to fetch authorized shops:', e)
    }

    // Check if integration already exists
    const { data: existing } = await supabase
        .from('tiktok_integrations')
        .select('id')
        .eq('user_id', user.id)
        .single()

    const payload = {
        user_id: user.id,
        access_token: tokenData.access_token,
        refresh_token: tokenData.refresh_token,
        access_token_expire_in: tokenData.access_token_expire_in,
        refresh_token_expire_in: tokenData.refresh_token_expire_in,
        seller_name: shopName || 'TikTok Shop',
        shop_cipher: shopCipher || shopId || null,
        shop_id: shopId || null,
        updated_at: new Date().toISOString()
    }

    // Force DELETE existing integration to ensure clean slate
    if (existing) {
        console.log('Deleting existing integration for clean slate...')
        await supabase
            .from('tiktok_integrations')
            .delete()
            .eq('id', existing.id)
    }

    // Always INSERT new record
    const { error } = await supabase
        .from('tiktok_integrations')
        .insert(payload)

    if (error) {
        console.error('Insert Error:', error)
        throw new Error('Failed to save integration')
    }

    return { success: true }
}

export async function disconnectAction(token?: string) {
    const { user, supabase } = await getSupabaseUser(token)
    if (!user || !supabase) throw new Error('Unauthorized')

    await supabase
        .from('tiktok_integrations')
        .delete()
        .eq('user_id', user.id)

    return true
}

export async function fetchProductsAction(token?: string) {
    const integration = await checkTikTokIntegration(token)
    if (!integration) throw new Error('No integration found')

    // Auto-fix shop_cipher logic similar to fetchOrdersAction
    let currentCipher = integration.shop_cipher
    if (!currentCipher || currentCipher === integration.shop_id) {
        try {
            const shopsData = await getAuthorizedShops(integration.access_token)
            const shops = shopsData.shops || shopsData.shop_list || []
            if (shops.length > 0) {
                const shop = shops[0]
                const newCipher = shop.cipher || shop.shop_cipher
                if (newCipher && newCipher !== currentCipher) {
                    currentCipher = newCipher
                }
            }
        } catch (e) {
            console.error('Auto-fix shop_cipher failed in products:', e)
        }
    }

    try {
        return await getTikTokProducts(
            integration.access_token,
            integration.shop_id,
            currentCipher
        )
    } catch (e: any) {
        console.error('Fetch Products Failed:', e)
        throw new Error(e.message || 'Failed to fetch products')
    }
}

export async function fetchFinanceAction(token?: string) {
    try {
        const { user, supabase } = await getSupabaseUser(token)
        if (!user || !supabase) {
            return { success: false, error: 'Session expired or not found. Please log in again.' }
        }

        const { data: integration, error: intError } = await supabase
            .from('tiktok_integrations')
            .select('*')
            .eq('user_id', user.id)
            .single()

        if (intError || !integration) {
            return { success: false, error: 'NO_INTEGRATION', message: 'No TikTok integration found for this account.' }
        }

        let currentCipher = integration.shop_cipher
        if (!currentCipher || currentCipher === integration.shop_id) {
            try {
                const shopsData = await getAuthorizedShops(integration.access_token)
                const shops = shopsData.shops || shopsData.shop_list || []
                if (shops.length > 0) {
                    const shop = shops[0]
                    const newCipher = shop.cipher || shop.shop_cipher
                    if (newCipher && newCipher !== currentCipher) {
                        currentCipher = newCipher
                        // Update in background
                        await supabase
                            .from('tiktok_integrations')
                            .update({ shop_cipher: newCipher })
                            .eq('id', integration.id)
                    }
                }
            } catch (e) {
                console.error('Auto-fix shop_cipher failed in finance:', e)
            }
        }

        console.log('🔄 Fetching finance data from TikTok API...')
        const [settledData, unsettledData, paymentsData] = await Promise.all([
            getTikTokStatements(integration.access_token, currentCipher),
            getTikTokSettlements(integration.access_token, currentCipher),
            getTikTokPayments(integration.access_token, currentCipher)
        ])

        console.log('📊 API Responses:')
        console.log('  - Statements:', settledData.code, settledData.message || 'OK')
        console.log('  - Settlements:', unsettledData.code, unsettledData.message || 'OK')
        console.log('  - Payments:', paymentsData.code, paymentsData.message || 'OK')

        // Fetch recent active orders to mock "To Settle"
        const { data: recentOrders } = await supabase
            .from('tiktok_orders')
            .select('*')
            .eq('shop_id', integration.shop_id)
            .in('start_status', ['DELIVERED', 'COMPLETED', 'SHIPPED', 'AWAITING_COLLECTION'])
            .order('create_time', { ascending: false })
            .limit(50)

        // --- PERSISTENCE: Save to Database ---
        let savedStatements = 0
        let savedPayments = 0
        let dbErrors: string[] = []

        try {
            const statements = settledData.code === 0 ? settledData.data?.statements : []
            console.log(`💾 Processing ${statements?.length || 0} statements...`)

            if (statements && statements.length > 0) {
                const statementRecords = statements.map((st: any) => ({
                    id: st.id || st.statement_id,
                    shop_id: integration.shop_id,
                    statement_time: st.statement_time,
                    payment_status: typeof st.payment_status === 'string' ? st.payment_status : String(st.payment_status),
                    revenue_amount: st.revenue_amount,
                    fee_amount: st.fee_amount,
                    adjustment_amount: st.adjustment_amount,
                    settlement_amount: st.settlement_amount || st.statement_amount?.amount,
                    currency: st.currency || st.statement_amount?.currency || 'PHP',
                    raw_data: st,
                    updated_at: new Date().toISOString()
                }))

                console.log('  First statement record:', JSON.stringify(statementRecords[0], null, 2))

                const { error: stmtError, count } = await supabase
                    .from('tiktok_finance_statements')
                    .upsert(statementRecords, { onConflict: 'id' })

                if (stmtError) {
                    console.error('❌ Error saving statements:', stmtError)
                    dbErrors.push(`Statements: ${stmtError.message}`)
                } else {
                    savedStatements = statements.length
                    console.log(`✅ Saved ${savedStatements} statements`)
                }
            } else {
                console.log('  No statements to save')
                if (settledData.code !== 0) {
                    dbErrors.push(`Statements API error: ${settledData.message}`)
                }
            }

            const payments = paymentsData.code === 0 ? paymentsData.data?.payments : []
            console.log(`💾 Processing ${payments?.length || 0} payments...`)

            if (payments && payments.length > 0) {
                const paymentRecords = payments.map((pm: any) => ({
                    id: pm.payment_id || pm.id,
                    shop_id: integration.shop_id,
                    create_time: pm.create_time,
                    amount: pm.amount?.amount,
                    currency: pm.amount?.currency || 'PHP',
                    status: pm.status,
                    bank_account_number: pm.bank_account_number,
                    raw_data: pm,
                    updated_at: new Date().toISOString()
                }))

                console.log('  First payment record:', JSON.stringify(paymentRecords[0], null, 2))

                const { error: payError } = await supabase
                    .from('tiktok_finance_payments')
                    .upsert(paymentRecords, { onConflict: 'id' })

                if (payError) {
                    console.error('❌ Error saving payments:', payError)
                    dbErrors.push(`Payments: ${payError.message}`)
                } else {
                    savedPayments = payments.length
                    console.log(`✅ Saved ${savedPayments} payments`)
                }
            } else {
                console.log('  No payments to save')
                if (paymentsData.code !== 0) {
                    dbErrors.push(`Payments API error: ${paymentsData.message}`)
                }
            }

        } catch (saveError: any) {
            console.error('❌ Failed to save finance data to DB:', saveError)
            dbErrors.push(`Database error: ${saveError.message}`)
        }
        // -------------------------------------

        console.log(`\n📈 Sync Summary: Saved ${savedStatements} statements, ${savedPayments} payments`)
        
        // Query orders from database
        console.log('\n?? Fetching orders from database...')
        let settledOrdersData = []
        let recentOrdersData = []
        try {
            const sRes = await supabase.from('tiktok_orders').select('*').eq('user_id', user.id).eq('status', 'COMPLETED').order('order_date', { ascending: false }).limit(100)
            const rRes = await supabase.from('tiktok_orders').select('*').eq('user_id', user.id).in('status', ['DELIVERED', 'SHIPPED', 'IN_TRANSIT']).order('order_date', { ascending: false }).limit(100)
            settledOrdersData = sRes.data || []
            recentOrdersData = rRes.data || []
            console.log("? Found " + settledOrdersData.length + " settled, " + recentOrdersData.length + " unsettled orders")
        } catch (e) { console.error('Error fetching orders:', e) }

        return {
            success: true,
            settled: settledData.code === 0 ? settledData.data : { statements: [] },
            unsettled: unsettledData.code === 0 ? unsettledData.data : { settlements: [] },
            settledOrders: settledOrdersData || [],
            recentOrders: recentOrdersData || [],
            payments: paymentsData.code === 0 ? paymentsData.data : { payments: [] },
            syncStats: {
                savedStatements,
                savedPayments,
                errors: dbErrors
            }
        }
    } catch (e: any) {
        console.error('Fetch Finance Failed:', e)
        return { success: false, error: e.message || 'Failed to fetch finance data' }
    }
}


