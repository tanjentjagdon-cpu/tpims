
'use client'

import * as React from 'react'
import { Badge } from '@/components/ui/badge'
import { Button } from '@/components/ui/button'
import { Music2, RefreshCw, CheckCircle2, AlertCircle } from 'lucide-react'
import { getAuthUrl, checkTikTokIntegration, fetchOrdersAction, exchangeAndSaveToken, fetchProductsAction, disconnectAction } from './actions'
import { useSearchParams, useRouter } from 'next/navigation'
import { supabase } from '@/lib/supabase'

export default function TiktokOrdersPage() {
    const [integration, setIntegration] = React.useState<any>(null)
    const [loading, setLoading] = React.useState(true)
    const [orders, setOrders] = React.useState<any[]>([])
    const [syncing, setSyncing] = React.useState(false)
    const [connecting, setConnecting] = React.useState(false)
    const [activeTab, setActiveTab] = React.useState('All')
    const searchParams = useSearchParams()
    const router = useRouter()

    const status = searchParams.get('status')
    const error = searchParams.get('error')
    const authCode = searchParams.get('auth_code')

    const processingRef = React.useRef(false)

    React.useEffect(() => {
        if (authCode) {
            if (processingRef.current) return
            processingRef.current = true
            handleAuthCode(authCode)
        } else {
            checkStatus()
        }
    }, [authCode])

    // Load orders when integration is available
    React.useEffect(() => {
        if (integration) {
            loadOrders()
        }
    }, [integration])

    const loadOrders = async () => {
        try {
            const token = await getSessionToken()
            if (!token) {
                console.log('No session token, skipping order load')
                return
            }

            // Get current user to ensure we're authenticated
            const { data: { user }, error: userError } = await supabase.auth.getUser()

            if (userError || !user) {
                console.error('User authentication error:', userError)
                return
            }

            console.log('Loading orders for user:', user.id)

            const { data, error } = await supabase
                .from('tiktok_orders')
                .select('*')
                .eq('user_id', user.id)
                .order('order_date', { ascending: false })

            if (error) {
                console.error('Error loading orders:', error)
                console.error('Error details:', JSON.stringify(error, null, 2))
                return
            }

            console.log('Loaded orders:', data?.length || 0)

            if (data) {
                // Transform database records back to display format
                // Include all fields for proper display
                const transformedOrders = data.map((record: any) => ({
                    order_id: record.order_id,
                    order_status: record.status,
                    create_time: new Date(record.order_date).getTime().toString(),
                    product_name: record.product_name,
                    variation: record.variation,
                    quantity: record.quantity,
                    buyer_username: record.buyer_username,
                    shipping_provider: record.shipping_provider,
                    tracking_number: record.tracking_number,
                    payment_info: {
                        total_amount: record.total_payment
                    }
                }))
                setOrders(transformedOrders)
            }
        } catch (e) {
            console.error('Failed to load orders:', e)
        }
    }

    const saveOrdersToDatabase = async (orderList: any[], token?: string) => {
        try {
            if (!token) {
                token = await getSessionToken()
            }
            if (!token) throw new Error('No session token')

            const { data: { session } } = await supabase.auth.getSession()
            if (!session?.user) throw new Error('No user found')

            console.log('📦 Processing orders for database save...')
            console.log('Total orders to process:', orderList.length)

            // Log first order structure to see what fields are available
            if (orderList.length > 0) {
                console.log('Sample order structure:', JSON.stringify(orderList[0], null, 2))
            }

            // Transform TikTok orders to database format
            // Keep 1 row per order - for multi-item orders, concatenate product info
            const ordersToSave = orderList.map((order: any, orderIndex: number) => {
                // TikTok API might use different field names - try all possible variations
                let orderId = order.order_id || order.id || order.orderId || order.order_number || order.orderNumber

                // If still no ID, generate one
                if (!orderId || orderId === '' || orderId === null || orderId === undefined) {
                    orderId = `TIKTOK_${Date.now()}_${orderIndex}`
                    console.warn(`⚠️ Generated order ID for order at index ${orderIndex}:`, orderId)
                }

                // Get ALL line items from the order
                const lineItems = order.line_items || order.items || []

                // Handle timestamp - could be seconds or milliseconds
                const createTime = order.create_time || order.created_at || order.createdAt || Date.now()
                const timestamp = createTime.toString().length > 10 ? Number(createTime) : Number(createTime) * 1000

                // Common order-level data
                const orderStatus = order.order_status || order.status || 'UNKNOWN'
                const buyerAddress = order.recipient_address?.full_address || order.address || ''
                const buyerUsername = order.buyer_user_id || order.buyer_id || order.buyer || ''
                const trackingNumber = order.tracking_number || order.tracking || ''
                const shippingProvider = order.shipping_provider || order.carrier || ''

                // Calculate totals from payment info
                const paymentInfo = order.payment_info || order.payment || {}
                const totalPayment = parseFloat(paymentInfo.total_amount || paymentInfo.total || order.total_amount || '0')
                const shippingFee = parseFloat(paymentInfo.shipping_fee || paymentInfo.shipping || order.shipping_fee || '0')
                const platformFee = parseFloat(paymentInfo.platform_commission || paymentInfo.commission || order.platform_fee || '0')
                const transactionFee = parseFloat(paymentInfo.transaction_fee || paymentInfo.fee || order.transaction_fee || '0')
                const estimatedIncome = totalPayment - platformFee - transactionFee

                // Extract product info - concatenate if multiple items
                let productName = 'Unknown Product'
                let variation = 'No Variation'
                let totalQuantity = 1

                if (lineItems.length > 0) {
                    // Concatenate all product names
                    const productNames = lineItems.map((item: any) =>
                        item.product_name || item.name || item.title || 'Unknown'
                    )
                    productName = productNames.join(' + ')

                    // Concatenate all variations
                    const variations = lineItems.map((item: any) =>
                        item.sku_name || item.variation || item.variant || 'Default'
                    )
                    variation = variations.join(' | ')

                    // Sum quantities
                    totalQuantity = lineItems.reduce((sum: number, item: any) =>
                        sum + (item.quantity || 1), 0
                    )
                }

                return {
                    user_id: session.user.id,
                    order_id: orderId,
                    order_date: new Date(timestamp).toISOString(),
                    product_name: productName.substring(0, 500), // Limit length
                    variation: variation.substring(0, 500), // Limit length
                    quantity: totalQuantity,
                    status: orderStatus,
                    total_payment: totalPayment,
                    estimated_income: estimatedIncome,
                    shipping_fee_paid_by_buyer: shippingFee,
                    platform_commission: platformFee,
                    transaction_fee: transactionFee,
                    buyers_address: buyerAddress,
                    buyer_username: buyerUsername,
                    tracking_number: trackingNumber,
                    shipping_provider: shippingProvider
                }
            })

            console.log(`📦 Processing ${ordersToSave.length} orders...`)

            // CRITICAL: Deduplicate by order_id before upsert
            // The same order can appear in multiple status queries, causing duplicates
            // The Postgres upsert will fail if the same order_id appears twice in one batch
            const uniqueOrdersMap = new Map<string, any>()
            ordersToSave.forEach(order => {
                // Use order_id as key - later entries will overwrite earlier ones (keeping latest)
                uniqueOrdersMap.set(order.order_id, order)
            })
            const uniqueOrdersToSave = Array.from(uniqueOrdersMap.values())

            console.log(`📦 After deduplication: ${uniqueOrdersToSave.length} unique rows (removed ${ordersToSave.length - uniqueOrdersToSave.length} duplicates)`)

            // Upsert orders (insert or update if exists)
            // Process in batches to avoid hitting limits
            const batchSize = 100
            let savedCount = 0

            for (let i = 0; i < uniqueOrdersToSave.length; i += batchSize) {
                const batch = uniqueOrdersToSave.slice(i, i + batchSize)
                console.log(`💾 Saving batch ${Math.floor(i / batchSize) + 1}/${Math.ceil(uniqueOrdersToSave.length / batchSize)} (${batch.length} rows)...`)

                const { error } = await supabase
                    .from('tiktok_orders')
                    .upsert(batch, {
                        onConflict: 'order_id,user_id',
                        ignoreDuplicates: false
                    })

                if (error) {
                    console.error('Error saving orders batch:', error)
                    console.error('Error code:', error.code)
                    console.error('Error message:', error.message)
                    console.error('Error details:', error.details)
                    console.error('Error hint:', error.hint)
                    throw error
                }

                savedCount += batch.length
            }

            console.log(`✅ Successfully saved ${savedCount} rows to database`)
            return savedCount
        } catch (e: any) {
            console.error('Failed to save orders to database:', e)
            console.error('Full error object:', JSON.stringify(e, null, 2))
            throw e
        }
    }

    const getSessionToken = async () => {
        const { data: { session } } = await supabase.auth.getSession()
        return session?.access_token
    }

    const handleAuthCode = async (code: string) => {
        setConnecting(true)
        try {
            const token = await getSessionToken()

            if (!token) {
                console.error('No session token found during callback')
                alert('Session expired. Please log in again to complete the connection.')
                router.push('/login?next=/dashboard/tiktok?auth_code=' + code)
                return
            }

            // Check if already connected to avoid re-using code or loop
            const existing = await checkTikTokIntegration(token)
            if (existing) {
                console.log('Already connected, skipping token exchange')
                router.replace('/dashboard/tiktok?status=connected')
                setIntegration(existing)
                return
            }

            await exchangeAndSaveToken(code, token)
            router.replace('/dashboard/tiktok?status=connected')
            checkStatus()
        } catch (e: any) {
            console.error(e)
            // If error is invalid auth code, check if we are actually connected
            if (e.message && e.message.includes('invalid auth code')) {
                const token = await getSessionToken()
                const existing = await checkTikTokIntegration(token)
                if (existing) {
                    router.replace('/dashboard/tiktok?status=connected')
                    setIntegration(existing)
                    return
                }
            }
            router.replace(`/dashboard/tiktok?error=${encodeURIComponent(e.message)}`)
        } finally {
            setConnecting(false)
        }
    }

    const checkStatus = async () => {
        setLoading(true)
        try {
            const token = await getSessionToken()
            const data = await checkTikTokIntegration(token)
            setIntegration(data)
        } catch (e) {
            console.error(e)
        } finally {
            setLoading(false)
        }
    }

    const handleConnect = async () => {
        try {
            const url = await getAuthUrl()
            window.location.href = url
        } catch (e) {
            console.error(e)
            alert('Failed to initiate connection')
        }
    }

    const handleSync = async () => {
        if (!integration) return
        setSyncing(true)
        try {
            const token = await getSessionToken()

            const data = await fetchOrdersAction(token)
            // TikTok API response structure for order list:
            // { order_list: [...], logs: string[] }

            if (data && data.logs && data.logs.length > 0) {
                console.log('Sync Logs:', data.logs)
                // Filter logs to find counts
                const countLogs = data.logs.filter(l => l.includes('Found') || l.includes('No orders'))
                console.log('Counts:', countLogs)
            }

            console.log('Orders received:', data?.order_list?.length)

            if (data && data.order_list) {
                // Save orders to database
                const savedCount = await saveOrdersToDatabase(data.order_list, token)

                // Load orders from database to display
                await loadOrders()

                const logMessage = data.logs
                    ? '\n\nBreakdown:\n' + data.logs.filter(l => l.includes('Status') && !l.includes('No orders')).join('\n')
                    : ''

                if (savedCount > 0) {
                    alert(`✅ Sync Complete!\n\nFetched: ${data.order_list.length} orders from TikTok API\nSaved: ${savedCount} unique orders to database${logMessage}`)
                } else {
                    alert(`⚠️ Sync Complete but 0 orders saved.\n\nTotal fetched: ${data.order_list.length}${logMessage}`)
                }
            } else {
                console.warn('No orders found or unexpected format:', data)
                const logMessage = data.logs ? '\n\nLogs:\n' + data.logs.join('\n') : ''
                alert('Sync complete but unexpected response format.' + logMessage)
            }
        } catch (e: any) {
            console.error(e)
            alert('Sync failed: ' + e.message)
        } finally {
            setSyncing(false)
        }
    }

    const handleDisconnect = async () => {
        if (!confirm('Are you sure you want to disconnect?')) return
        try {
            const token = await getSessionToken()
            await disconnectAction(token)
            setIntegration(null)
            alert('Disconnected successfully')
        } catch (e: any) {
            console.error(e)
            alert('Disconnect failed: ' + e.message)
        }
    }

    // Filter orders based on active tab
    const filteredOrders = React.useMemo(() => {
        if (!orders) return []
        if (activeTab === 'All') return orders

        const statusMap: Record<string, string[]> = {
            'To ship': ['AWAITING_SHIPMENT', 'AWAITING_COLLECTION'],
            'Shipped': ['PARTIALLY_SHIPPING', 'IN_TRANSIT', 'DELIVERED'],
            'Completed': ['COMPLETED'],
            'Pending': ['UNPAID', 'ON_HOLD'],
            'Canceled': ['CANCELLED'],
            'Failed delivery': ['FAILED', 'RETURNED', 'TO_RETURN', 'EXPIRED']
        }

        const validStatuses = statusMap[activeTab] || []
        return orders.filter(order => validStatuses.includes(order.order_status))
    }, [orders, activeTab])

    return (
        <div className="space-y-8 h-full">
            <div className="flex flex-col gap-4 sm:flex-row sm:items-center sm:justify-between">
                <div>
                    <h2 className="text-3xl font-bold tracking-tight text-foreground font-serif">TikTok Orders</h2>
                    <p className="text-muted-foreground italic">Monitor and manage your Tiktok Shop sales data.</p>
                </div>
                {integration && (
                    <div className="flex items-center gap-4">
                        <div className="flex items-center gap-2 px-3 py-1 bg-green-100 text-green-700 rounded-full text-xs font-medium">
                            <span className="relative flex h-2 w-2">
                                <span className="animate-ping absolute inline-flex h-full w-full rounded-full bg-green-400 opacity-75"></span>
                                <span className="relative inline-flex rounded-full h-2 w-2 bg-green-500"></span>
                            </span>
                            CONNECTED
                        </div>
                        {/* Shop Info Display */}
                        <div className="text-xs text-muted-foreground hidden md:block">
                            Shop: {integration.seller_name} ({integration.shop_id})
                        </div>
                    </div>
                )}

                <div className="flex items-center gap-2">
                    {integration && (
                        <Button
                            variant="outline"
                            className="mr-2 text-red-600 hover:text-red-700 hover:bg-red-50 border-red-200"
                            onClick={handleDisconnect}
                        >
                            Disconnect
                        </Button>
                    )}
                    <Button
                        onClick={handleSync}
                        disabled={syncing || !integration}
                        className={`bg-[#ff9900] hover:bg-[#ffad33] text-white ${syncing ? 'opacity-80' : ''}`}
                    >
                        <RefreshCw className={`mr-2 h-4 w-4 ${syncing ? 'animate-spin' : ''}`} />
                        {syncing ? 'Syncing...' : 'Sync Orders'}
                    </Button>
                </div>
            </div>


            <div className="grid gap-4 md:grid-cols-2 lg:grid-cols-4">

                {status === 'connected' && (
                    <div className="bg-green-50 text-green-700 p-4 rounded-lg border border-green-200 flex items-center gap-2">
                        <CheckCircle2 className="w-5 h-5" />
                        Successfully connected to TikTok Shop!
                    </div>
                )}

                {error && (
                    <div className="bg-red-50 text-red-700 p-4 rounded-lg border border-red-200 flex items-center gap-2">
                        <AlertCircle className="w-5 h-5" />
                        Connection Failed: {error}
                    </div>
                )}

                {connecting && (
                    <div className="fixed inset-0 bg-background/80 backdrop-blur-sm z-50 flex items-center justify-center">
                        <div className="flex flex-col items-center gap-4">
                            <RefreshCw className="h-12 w-12 animate-spin text-primary" />
                            <p className="text-lg font-medium">Finalizing connection...</p>
                        </div>
                    </div>
                )}
            </div>

            {!integration ? (
                <div className="flex-1 flex flex-col items-center justify-center rounded-3xl border-4 border-dashed border-zinc-200 bg-zinc-50/50">
                    <div className="p-6 rounded-full bg-zinc-100 mb-6 group hover:scale-110 transition-transform duration-500">
                        <Music2 className="h-12 w-12 text-zinc-400 group-hover:text-pink-500 transition-colors" />
                    </div>
                    <h3 className="text-2xl font-bold tracking-tight text-zinc-800 mb-2">Connect TikTok Shop</h3>
                    <p className="text-zinc-500 max-w-sm text-center font-medium leading-relaxed mb-6">
                        Link your TikTok Shop account to automatically sync orders and inventory.
                    </p>
                    <Button
                        size="lg"
                        onClick={handleConnect}
                        className="bg-black hover:bg-zinc-800 text-white"
                    >
                        Connect Account
                    </Button>
                </div>
            ) : (
                <div className="flex-1 flex flex-col gap-4">
                    {/* Status Tabs */}
                    <div className="flex items-center gap-6 border-b text-sm font-medium text-muted-foreground overflow-x-auto pb-1">
                        {['All', 'To ship', 'Shipped', 'Completed', 'Pending', 'Canceled', 'Failed delivery'].map((tab) => (
                            <button
                                key={tab}
                                onClick={() => setActiveTab(tab)}
                                className={`pb-3 whitespace-nowrap ${activeTab === tab ? 'text-primary border-b-2 border-primary' : 'hover:text-foreground'}`}
                            >
                                {tab}
                            </button>
                        ))}
                    </div>

                    {/* Filter Bar */}
                    <div className="flex items-center justify-between py-2">
                        <div className="flex items-center gap-2">
                            <Button variant="outline" size="sm" className="h-8 gap-2">
                                <span className="sr-only">Filter</span>
                                <span>Filter</span>
                            </Button>
                            <div className="text-xs text-muted-foreground ml-2">Found {filteredOrders.length} orders</div>
                        </div>
                        <div className="flex items-center gap-2">
                            <Button variant="outline" size="sm" className="h-8">Sort by</Button>
                            <Button variant="outline" size="sm" className="h-8">Export</Button>
                        </div>
                    </div>

                    {filteredOrders.length > 0 ? (
                        <div className="space-y-4">
                            {/* Main Table Headers - Using Flexbox for perfect alignment */}
                            <div className="hidden md:flex items-center gap-4 px-6 py-3 bg-zinc-50 text-xs font-bold text-zinc-500 uppercase tracking-wider border rounded-sm">
                                <div className="flex-1">Product(s)</div>
                                <div className="w-[120px] text-center">Status</div>
                                <div className="w-[160px]">Shipping</div>
                                <div className="w-[100px] text-right">Amount</div>
                                <div className="w-[140px] text-right">Actions</div>
                            </div>

                            {/* Order Cards */}
                            {filteredOrders.map((order: any, i: number) => {
                                return (
                                    <div key={order.order_id || i} className="bg-white border rounded-sm shadow-sm hover:shadow-md transition-shadow group">
                                        {/* Order Header */}
                                        <div className="flex flex-col sm:flex-row sm:items-center justify-between px-6 py-3 border-b bg-gray-50/30 text-xs gap-2">
                                            <div className="flex items-center gap-4">
                                                <div className="flex flex-col sm:flex-row sm:gap-4 items-baseline">
                                                    <span className="font-bold text-gray-900 text-sm">Order ID: {order.order_id || 'N/A'}</span>
                                                    <span className="text-gray-400 hidden sm:inline text-[10px]">|</span>
                                                    <span className="text-gray-500">{new Date(Number(order.create_time)).toLocaleString()}</span>
                                                </div>
                                            </div>
                                            <div className="flex items-center gap-4 text-gray-500">
                                                <div className="flex items-center gap-2">
                                                    <span className="text-gray-600 font-medium">{order.buyer_username || 'user******'}</span>
                                                    <Button variant="ghost" size="icon" className="h-6 w-6 text-teal-600 hover:text-teal-700">
                                                        <span className="text-sm">💬</span>
                                                    </Button>
                                                </div>
                                            </div>
                                        </div>

                                        {/* Order Content */}
                                        <div className="p-4 md:px-6 md:py-4 flex flex-col md:flex-row items-start md:items-center gap-4 text-sm">
                                            {/* Product Section - Flex 1 to fill space */}
                                            <div className="flex-1 flex gap-4 min-w-0 w-full md:w-auto">
                                                {/* Product Image */}
                                                <div className="w-16 h-16 bg-gray-100 rounded-md flex items-center justify-center flex-shrink-0 border overflow-hidden">
                                                    {/* Placeholder or Image */}
                                                    <Music2 className="w-6 h-6 text-gray-300" />
                                                </div>

                                                {/* Product Details */}
                                                <div className="flex-1 min-w-0 flex flex-col justify-center">
                                                    <h4 className="font-medium text-gray-900 mb-1 leading-snug truncate" title={order.product_name}>
                                                        {order.product_name || 'Product Name'}
                                                    </h4>
                                                    <div className="text-xs text-gray-500 space-y-1">
                                                        <p className="truncate text-zinc-600">{order.variation || 'Variation: Default box'}</p>
                                                        <p className="font-mono text-[10px] text-zinc-400">Qty: {order.quantity}</p>
                                                    </div>
                                                </div>
                                            </div>

                                            {/* Status - Fixed Width */}
                                            <div className="w-full md:w-[120px] flex md:flex-col items-center justify-between md:justify-center flex-shrink-0 md:text-center pl-0 md:pl-4 border-t md:border-t-0 pt-3 md:pt-0 mt-2 md:mt-0">
                                                <span className="md:hidden text-xs font-semibold text-gray-500 uppercase">Status</span>
                                                <div className="flex flex-col items-center">
                                                    <Badge variant="outline" className={`
                                                            mb-1 whitespace-nowrap px-2 py-0.5
                                                            ${order.order_status === 'COMPLETED' ? 'text-green-700 bg-green-50 border-green-200' : ''}
                                                            ${order.order_status === 'CANCELLED' ? 'text-red-700 bg-red-50 border-red-200' : ''}
                                                            ${['AWAITING_SHIPMENT', 'AWAITING_COLLECTION'].includes(order.order_status) ? 'text-orange-700 bg-orange-50 border-orange-200' : ''}
                                                            ${!['COMPLETED', 'CANCELLED', 'AWAITING_SHIPMENT', 'AWAITING_COLLECTION'].includes(order.order_status) ? 'text-gray-700 bg-gray-50 border-gray-200' : ''}
                                                        `}>
                                                        {order.order_status?.replace(/_/g, ' ')}
                                                    </Badge>
                                                    {['AWAITING_SHIPMENT', 'AWAITING_COLLECTION'].includes(order.order_status) && (
                                                        <span className="text-[10px] text-orange-600 font-medium">
                                                            To ship
                                                        </span>
                                                    )}
                                                </div>
                                            </div>

                                            {/* Shipping Info - Fixed Width */}
                                            <div className="w-full md:w-[160px] flex md:flex-col justify-between md:justify-center flex-shrink-0 text-xs text-gray-600 pl-0 md:pl-4 border-t md:border-t-0 pt-2 md:pt-0">
                                                <span className="md:hidden font-semibold text-gray-500 uppercase">Shipping</span>
                                                <div className="text-right md:text-left">
                                                    <div className="font-medium text-gray-900 mb-0.5">{order.shipping_provider || 'Standard Shipping'}</div>
                                                    <div className="truncate text-zinc-500" title={order.tracking_number}>
                                                        ID: {order.tracking_number || '-'}
                                                    </div>
                                                </div>
                                            </div>

                                            {/* Amount - Fixed Width */}
                                            <div className="w-full md:w-[100px] flex md:flex-col justify-between md:justify-center flex-shrink-0 text-right pl-0 md:pl-4 border-t md:border-t-0 pt-2 md:pt-0">
                                                <span className="md:hidden text-xs font-semibold text-gray-500 uppercase">Amount</span>
                                                <div>
                                                    <div className="font-bold text-gray-900">₱{order.payment_info?.total_amount?.toLocaleString() || '0.00'}</div>
                                                    <span className="text-[10px] text-gray-400 font-normal">COD</span>
                                                </div>
                                            </div>

                                            {/* Actions - Fixed Width */}
                                            <div className="w-full md:w-[140px] flex md:flex-col gap-2 justify-center items-end flex-shrink-0 pl-0 md:pl-4 border-t md:border-t-0 pt-3 md:pt-0">
                                                <Button size="sm" className="w-full md:w-auto bg-teal-600 hover:bg-teal-700 text-white shadow-sm text-xs h-8">
                                                    Print Label
                                                </Button>
                                                <Button size="sm" variant="outline" className="w-full md:w-auto text-xs h-8 bg-white hover:bg-zinc-50">
                                                    View Details
                                                </Button>
                                            </div>
                                        </div>
                                    </div>
                                )
                            })}
                        </div>
                    ) : (
                        <div className="text-center py-12 bg-white rounded-lg border border-dashed">
                            <div className="mx-auto w-12 h-12 bg-gray-100 rounded-full flex items-center justify-center mb-4">
                                <RefreshCw className="w-5 h-5 text-gray-400" />
                            </div>
                            <h3 className="text-lg font-medium text-gray-900">No orders found</h3>
                            <p className="text-gray-500 mt-1">Try changing the status tab or syncing again.</p>
                        </div>
                    )}
                </div>
            )}
        </div>

    )
}
