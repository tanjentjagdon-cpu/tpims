'use client'

import * as React from 'react'
import { supabase } from '@/lib/supabase'
import {
    Table,
    TableBody,
    TableCell,
    TableHead,
    TableHeader,
    TableRow,
} from '@/components/ui/table'
import { Badge } from '@/components/ui/badge'
import { Input } from '@/components/ui/input'
import { Search, ShoppingBag, Download, Plus, Eye, ChevronDown, ChevronUp, User, Edit, Trash2 } from 'lucide-react'
import { cn } from '@/lib/utils'
import { Button } from '@/components/ui/button'
import { ShopeeOrderDetailsPanel } from '@/components/shopee/order-details-panel'
import { ShopeeStatusBadge } from '@/components/shopee/status-badge'

import { ShopeeSyncButton } from '@/components/shopee/shopee-sync-button'

interface ShopeeOrder {
    id: string
    order_id: string
    order_date: string
    product_name: string
    variation: string
    quantity: number
    status: string
    total_payment: number
    estimated_income: number

    // Fee columns
    buyers_address?: string
    shipping_fee_paid_by_buyer?: number
    estimated_shipping_fee?: number
    shipping_fee_rebate?: number
    commission_fee?: number
    support_program_fee?: number
    service_fee?: number
    transaction_fee?: number
    tax?: number
    merchandise_subtotal?: number

    // New Fields
    tracking_number?: string
    shipping_provider?: string
    buyer_username?: string
    payment_method?: string
    shopee_voucher?: number
    voucher_code?: string
    date_paid?: string
    date_shipped?: string
    date_completed?: string
    date_released?: string

    order_history?: {
        title: string
        description: string | null
        timestamp: string
    }[]
}

import { Tabs, TabsContent, TabsList, TabsTrigger } from "@/components/ui/tabs"

// Helper to group items by Order ID
interface GroupedOrder {
    order_id: string
    items: ShopeeOrder[]
    total_payment: number
    estimated_income: number
    status: string
    date: string
    item_count: number
}

export default function ShopeeOrdersPage() {
    const [orders, setOrders] = React.useState<ShopeeOrder[]>([])
    const [loading, setLoading] = React.useState(true)
    const [activeTab, setActiveTab] = React.useState('all')

    // Filter States
    const [orderIdSearch, setOrderIdSearch] = React.useState('')

    // Pagination
    const [currentPage, setCurrentPage] = React.useState(1)
    const itemsPerPage = 20

    // Dialog State
    const [expandedOrderId, setExpandedOrderId] = React.useState<string | null>(null)
    const [productImages, setProductImages] = React.useState<Record<string, string>>({})
    const [products, setProducts] = React.useState<any[]>([])

    // Fetch product images
    React.useEffect(() => {
        const fetchImages = async () => {
            const { data, error } = await supabase
                .from('products')
                .select('id, variation, image_url, available_stock, sold_shopee')

            if (data) {
                setProducts(data)
                const imageMap: Record<string, string> = {}
                data.forEach((p: any) => {
                    if (p.variation && p.image_url) {
                        // Check for multiple images (comma separated) and prefer the 2nd image
                        const urls = p.image_url.split(',');
                        const targetUrl = urls.length >= 2 ? urls[1].trim() : urls[0].trim();

                        imageMap[p.variation] = targetUrl
                        // Also map the variation name without the color code (e.g., "Lavender #35" -> "Lavender")
                        const cleanName = p.variation.split('#')[0].trim()
                        if (cleanName && cleanName !== p.variation) {
                            imageMap[cleanName] = targetUrl
                        }
                    }
                })
                setProductImages(imageMap)
            }
        }
        fetchImages()
    }, [])

    const fetchOrders = React.useCallback(async () => {
        try {
            setLoading(true)
            let allOrders: ShopeeOrder[] = []
            let from = 0
            let to = 999
            let fetching = true

            while (fetching) {
                const { data, error } = await supabase
                    .from('shopee_orders')
                    .select('*')
                    .order('order_date', { ascending: false })
                    .range(from, to)

                if (error) {
                    console.warn('Error fetching orders:', error.message)
                    fetching = false
                } else {
                    if (data && data.length > 0) {
                        allOrders = [...allOrders, ...data]
                        from += 1000
                        to += 1000
                        // Safety break if needed, or check validity
                        if (data.length < 1000) fetching = false
                    } else {
                        fetching = false
                    }
                }
            }
            setOrders(allOrders)
        } catch (error) {
            console.error('Error fetching orders:', error)
        } finally {
            setLoading(false)
        }
    }, [])

    React.useEffect(() => {
        fetchOrders()
    }, [fetchOrders])

    // Grouping Logic
    const groupedOrders = React.useMemo(() => {
        const groups: Record<string, GroupedOrder> = {}

        orders.forEach(order => {
            if (!groups[order.order_id]) {
                groups[order.order_id] = {
                    order_id: order.order_id,
                    items: [],
                    total_payment: 0,
                    estimated_income: 0,
                    status: order.status,
                    date: order.order_date,
                    item_count: 0
                }
            }

            const group = groups[order.order_id]
            group.items.push(order)
            group.total_payment += (order.total_payment || 0)
            group.estimated_income += (order.estimated_income || 0)
            group.item_count += 1
            // Could assume status/date match first item
        })

        return Object.values(groups).sort((a, b) =>
            new Date(b.date).getTime() - new Date(a.date).getTime()
        )
    }, [orders])

    // Calculate Counts
    const counts = React.useMemo(() => {
        const c = {
            all: 0,
            unpaid: 0,
            to_ship: 0,
            shipping: 0,
            completed: 0,
            return: 0
        }
        groupedOrders.forEach(g => {
            c.all++
            if (g.status === 'Unpaid') c.unpaid++
            if (g.status === 'To Ship' || g.status === 'Ready to Ship' || g.status === 'Processed') c.to_ship++
            if (g.status === 'Shipping') c.shipping++
            if (g.status === 'Completed') c.completed++
            if (g.status === 'Return/Refund' || g.status === 'Cancelled') c.return++
        })
        return c
    }, [groupedOrders])

    const filteredGroups = React.useMemo(() => {
        return groupedOrders.filter(g => {
            // Order ID or Username Search
            if (orderIdSearch) {
                const searchLower = orderIdSearch.toLowerCase()
                const matchesOrderId = g.order_id.toLowerCase().includes(searchLower)
                const matchesUsername = g.items[0]?.buyer_username?.toLowerCase().includes(searchLower)

                if (!matchesOrderId && !matchesUsername) {
                    return false
                }
            }

            // Tab Filter
            if (activeTab === 'all') return true
            if (activeTab === 'unpaid') return g.status === 'Unpaid'
            if (activeTab === 'to_ship') return g.status === 'To Ship' || g.status === 'Ready to Ship' || g.status === 'Processed'
            if (activeTab === 'shipping') return g.status === 'Shipping'
            if (activeTab === 'completed') return g.status === 'Completed'
            if (activeTab === 'cancelled') return g.status === 'Cancelled'
            if (activeTab === 'return') return g.status === 'Return/Refund' || g.status === 'Cancelled' // Group Cancelled with Return/Refund as per screenshot logic usually? 
            // Wait, screenshot has "Return/Refund/Cancel (3)". So yes.

            return true
        })
    }, [groupedOrders, activeTab, orderIdSearch])

    const totalPages = Math.ceil(filteredGroups.length / itemsPerPage)
    const paginatedGroups = filteredGroups.slice(
        (currentPage - 1) * itemsPerPage,
        currentPage * itemsPerPage
    )

    const toggleDetails = (orderId: string) => {
        setExpandedOrderId(current => current === orderId ? null : orderId)
    }

    const handleDeleteOrder = async (orderId: string, items: ShopeeOrder[]) => {
        if (!confirm("Are you sure you want to delete this order? This will restore inventory and remove sales records.")) return;

        setLoading(true);
        try {
            // 1. Restore Inventory & Delete Sales Records
            for (const item of items) {
                // Find Product
                const targetVar = item.variation.trim().toLowerCase();
                const product = products.find(p => {
                    const dbVar = p.variation.trim().toLowerCase();
                    if (dbVar === targetVar) return true;
                    const cleanDbVar = dbVar.split('#')[0].trim();
                    if (cleanDbVar === targetVar) return true;
                    return false;
                });

                if (product) {
                    // Fetch fresh stock
                    const { data: freshProduct } = await supabase
                        .from('products')
                        .select('available_stock, sold_shopee')
                        .eq('id', product.id)
                        .single();

                    if (freshProduct) {
                        // Update Product
                        await supabase.from('products').update({
                            available_stock: (freshProduct.available_stock || 0) + item.quantity,
                            sold_shopee: Math.max(0, (freshProduct.sold_shopee || 0) - item.quantity)
                        }).eq('id', product.id);

                        // Delete Sales Order
                        // First try deleting by Order ID if available (More robust)
                        const { error: deleteByOrderError } = await supabase
                            .from('sales_orders')
                            .delete()
                            .eq('order_id', orderId);

                        if (deleteByOrderError || true) {
                            // Fallback for legacy records without order_id: Match by product/date/qty
                            const saleDate = new Date(item.order_date).toISOString().split('T')[0];
                            const { data: salesRecord } = await supabase
                                .from('sales_orders')
                                .select('id')
                                .eq('product_id', product.id)
                                .eq('quantity', item.quantity)
                                .eq('platform', 'Shopee')
                                .eq('sale_date', saleDate)
                                .limit(1)
                                .maybeSingle();

                            if (salesRecord) {
                                await supabase.from('sales_orders').delete().eq('id', salesRecord.id);
                            }
                        }
                    }
                }
            }

            // 2. Delete Shopee Order
            const { error } = await supabase
                .from('shopee_orders')
                .delete()
                .eq('order_id', orderId);

            if (error) throw error;

            alert("Order deleted and inventory restored.");
            fetchOrders();

        } catch (err: any) {
            console.error('Delete Error:', err);
            alert("Error deleting order: " + err.message);
        } finally {
            setLoading(false);
        }
    }

    const handleOrderUpdate = () => {
        fetchOrders()
    }

    return (
        <div className="space-y-6">
            <Tabs defaultValue="all" className="w-full" onValueChange={setActiveTab}>
                <div className="flex flex-col xl:flex-row xl:items-center justify-between border-b px-1 gap-4 xl:gap-0">
                    <TabsList className="justify-start border-b-0 rounded-none h-auto p-0 bg-transparent gap-6 overflow-x-auto no-scrollbar flex-1">
                        <TabsTrigger
                            value="all"
                            className="rounded-none border-b-2 border-transparent data-[state=active]:border-orange-500 data-[state=active]:text-orange-600 px-1 py-3 hover:text-orange-600 transition-colors"
                        >
                            All My Orders ({counts.all})
                        </TabsTrigger>
                        <TabsTrigger
                            value="unpaid"
                            className="rounded-none border-b-2 border-transparent data-[state=active]:border-orange-500 data-[state=active]:text-orange-600 px-1 py-3 hover:text-orange-600 transition-colors"
                        >
                            Unpaid ({counts.unpaid})
                        </TabsTrigger>
                        <TabsTrigger
                            value="to_ship"
                            className="rounded-none border-b-2 border-transparent data-[state=active]:border-orange-500 data-[state=active]:text-orange-600 px-1 py-3 hover:text-orange-600 transition-colors"
                        >
                            To Ship ({counts.to_ship})
                        </TabsTrigger>
                        <TabsTrigger
                            value="shipping"
                            className="rounded-none border-b-2 border-transparent data-[state=active]:border-orange-500 data-[state=active]:text-orange-600 px-1 py-3 hover:text-orange-600 transition-colors"
                        >
                            Shipping ({counts.shipping})
                        </TabsTrigger>
                        <TabsTrigger
                            value="completed"
                            className="rounded-none border-b-2 border-transparent data-[state=active]:border-orange-500 data-[state=active]:text-orange-600 px-1 py-3 hover:text-orange-600 transition-colors"
                        >
                            Completed ({counts.completed})
                        </TabsTrigger>
                        <TabsTrigger
                            value="return"
                            className="rounded-none border-b-2 border-transparent data-[state=active]:border-orange-500 data-[state=active]:text-orange-600 px-1 py-3 hover:text-orange-600 transition-colors"
                        >
                            Return/Refund/Cancel ({counts.return})
                        </TabsTrigger>
                    </TabsList>

                    <div className="flex items-center gap-2 py-2 pr-2">
                        <div className="relative">
                            <Search className="absolute left-2 top-2.5 h-4 w-4 text-muted-foreground" />
                            <Input
                                placeholder="Order ID or Username"
                                className="pl-8 h-9 w-[200px] text-xs"
                                value={orderIdSearch}
                                onChange={(e) => setOrderIdSearch(e.target.value)}
                            />
                        </div>
                        <Button variant="outline" size="sm" className="h-9 gap-2 text-xs">
                            <Download className="h-3.5 w-3.5" />
                            Export
                        </Button>
                        <Button variant="outline" size="sm" className="h-9 text-xs">
                            Export History
                        </Button>
                        <ShopeeSyncButton
                            onSuccess={fetchOrders}
                            triggerSize="sm"
                            triggerClassName="h-9 text-xs bg-orange-600 hover:bg-orange-700 text-white gap-2"
                        />
                    </div>
                </div>
            </Tabs>

            {/* Pagination Controls */}
            <div className="flex items-center justify-end gap-4 mb-4">
                <div className="flex gap-2">
                    {Array.from({ length: Math.min(5, totalPages) }, (_, i) => {
                        let pageNum = currentPage;
                        if (totalPages > 5 && currentPage > 3) {
                            pageNum = currentPage - 2 + i;
                            if (pageNum > totalPages) pageNum = totalPages - (4 - i);
                        } else {
                            pageNum = i + 1;
                        }

                        if (pageNum <= 0) return null;

                        return (
                            <Button
                                key={pageNum}
                                variant={currentPage === pageNum ? "default" : "outline"}
                                size="sm"
                                onClick={() => setCurrentPage(pageNum)}
                                className={cn(
                                    "h-8 w-8 p-0",
                                    currentPage === pageNum ? "bg-orange-500 hover:bg-orange-600" : "text-muted-foreground"
                                )}
                            >
                                {pageNum}
                            </Button>
                        )
                    })}
                    {totalPages > 5 && currentPage < totalPages - 2 && (
                        <>
                            <span className="text-muted-foreground/50">...</span>
                            <Button
                                variant="outline"
                                size="sm"
                                onClick={() => setCurrentPage(totalPages)}
                                className="h-8 w-8 p-0 text-muted-foreground"
                            >
                                {totalPages}
                            </Button>
                        </>
                    )}
                    <Button
                        variant="outline"
                        size="sm"
                        onClick={() => setCurrentPage(p => Math.min(totalPages, p + 1))}
                        disabled={currentPage === totalPages}
                        className="h-8 w-8 p-0"
                    >
                        <ChevronDown className="h-4 w-4 -rotate-90" />
                    </Button>
                </div>
            </div>

            <div className="flex flex-col">
                <div>
                    {loading ? (
                        <div className="flex items-center justify-center py-20">
                            <div className="flex flex-col items-center gap-3">
                                <div className="h-10 w-10 animate-spin rounded-full border-2 border-orange-500 border-t-transparent" />
                                <p className="text-muted-foreground animate-pulse font-medium">Fetching Shopee Data...</p>
                            </div>
                        </div>
                    ) : filteredGroups.length === 0 ? (
                        <div className="flex flex-col items-center gap-4 py-24">
                            <div className="p-5 rounded-full bg-muted text-muted-foreground">
                                <ShoppingBag className="h-12 w-12" />
                            </div>
                            <div className="space-y-1 text-center">
                                <h3 className="text-lg font-semibold text-foreground">No Shopee orders listed</h3>
                                <p className="text-sm text-muted-foreground max-w-[300px] mx-auto">
                                    Use the <strong>Import Orders</strong> button to populate this list from your Shopee sales data.
                                </p>
                            </div>
                        </div>
                    ) : (
                        <div className="min-w-[1000px]">
                            {/* Order List */}
                            <div className="space-y-4">
                                {paginatedGroups.map((group) => {
                                    const firstItem = group.items[0];
                                    const imageUrl = productImages[firstItem.variation];
                                    const isExpanded = expandedOrderId === group.order_id;

                                    return (
                                        <div
                                            key={group.order_id}
                                            className="bg-card border border-border rounded-sm overflow-hidden shadow-sm"
                                        >
                                            {/* Card Header */}
                                            <div className="flex flex-col px-4 py-3 border-b border-border bg-card gap-2">
                                                <div className="flex items-center justify-between">
                                                    <div className="flex items-center gap-3">
                                                        <ShopeeStatusBadge status={group.status} />
                                                        <div className="h-4 w-px bg-border" />
                                                        <div className="flex items-center gap-2">
                                                            <User className="h-4 w-4 text-muted-foreground" />
                                                            <span className="text-sm font-semibold text-foreground">{firstItem.buyer_username || "Unknown Buyer"}</span>
                                                        </div>
                                                    </div>
                                                    <div className="flex items-center gap-2">
                                                        <Button variant="ghost" size="sm" className="h-8 text-xs hover:bg-muted" onClick={() => toggleDetails(group.order_id)}>
                                                            <Edit className="w-3.5 h-3.5 mr-1.5" /> Edit Details
                                                        </Button>
                                                        <Button variant="ghost" size="sm" className="h-8 text-xs text-red-600 hover:text-red-700 hover:bg-red-50" onClick={() => handleDeleteOrder(group.order_id, group.items)}>
                                                            <Trash2 className="w-3.5 h-3.5 mr-1.5" /> Delete Order & Restore Inventory
                                                        </Button>
                                                        <div className="w-px h-4 bg-border mx-2" />
                                                        <span className="text-sm text-muted-foreground">Order ID</span>
                                                        <span className="text-sm font-medium text-foreground">{group.order_id}</span>
                                                    </div>
                                                </div>
                                            </div>

                                            {/* Card Content Grid */}
                                            <div className="grid grid-cols-12 gap-4 p-4 items-center">
                                                {/* Product Column - Expanded to take Status space */}
                                                <div className="col-span-7">
                                                    <div className="flex flex-col gap-4">
                                                        {group.items.map((item, index) => {
                                                            const itemImageUrl = productImages[item.variation];
                                                            return (
                                                                <div key={index} className="flex gap-3">
                                                                    <div className="h-20 w-20 rounded-sm border border-border overflow-hidden flex-shrink-0">
                                                                        {itemImageUrl ? (
                                                                            // eslint-disable-next-line @next/next/no-img-element
                                                                            <img
                                                                                src={itemImageUrl}
                                                                                alt={item.variation}
                                                                                className="w-full h-full object-cover"
                                                                            />
                                                                        ) : (
                                                                            <div className="w-full h-full flex items-center justify-center text-muted-foreground/50 bg-muted">
                                                                                <ShoppingBag className="h-8 w-8" />
                                                                            </div>
                                                                        )}
                                                                    </div>
                                                                    <div className="flex flex-col justify-center min-w-0">
                                                                        <span className="text-sm font-medium text-foreground line-clamp-2 leading-tight mb-1" title={item.product_name}>
                                                                            {item.product_name}
                                                                        </span>
                                                                        <span className="text-xs text-muted-foreground block mb-1">
                                                                            Variation: {item.variation}
                                                                        </span>
                                                                        <span className="text-xs text-muted-foreground">x{item.quantity}</span>
                                                                    </div>
                                                                </div>
                                                            )
                                                        })}
                                                    </div>
                                                </div>

                                                {/* Price Column */}
                                                <div className="col-span-2 text-center">
                                                    <div className="flex flex-col">
                                                        <span className="text-sm font-medium text-foreground">₱{group.total_payment.toFixed(2)}</span>
                                                        <span className="text-xs text-muted-foreground mt-1">{firstItem.payment_method || "COD"}</span>
                                                    </div>
                                                </div>

                                                {/* Status Column */}
                                                <div className="col-span-2 flex justify-center">
                                                    <ShopeeStatusBadge status={group.status} className="scale-90" />
                                                </div>

                                                {/* Shipping Column */}
                                                <div className="col-span-2">
                                                    <div className="flex flex-col">
                                                        <span className="text-sm text-foreground">{firstItem.shipping_provider || "Standard Local"}</span>
                                                        <span className="text-xs text-muted-foreground mt-0.5">{firstItem.tracking_number}</span>
                                                    </div>
                                                </div>

                                                {/* Actions Column */}
                                                <div className="col-span-1 text-right">
                                                    <button
                                                        className="text-sm text-blue-500 hover:text-blue-600 hover:underline"
                                                        onClick={() => toggleDetails(group.order_id)}
                                                    >
                                                        {isExpanded ? "Hide Details" : "Check Details"}
                                                    </button>
                                                </div>
                                            </div>

                                            {/* Expanded Details */}
                                            {isExpanded && (
                                                <div className="border-t border-border">
                                                    <ShopeeOrderDetailsPanel
                                                        items={group.items}
                                                        products={products}
                                                        productImages={productImages}
                                                        onOrderUpdate={handleOrderUpdate}
                                                    />
                                                </div>
                                            )}
                                        </div>
                                    )
                                })}
                            </div>
                        </div>
                    )}
                </div>
            </div>
        </div>
    )
}
