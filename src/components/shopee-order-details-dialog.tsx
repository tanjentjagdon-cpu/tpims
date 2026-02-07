import {
    Dialog,
    DialogContent,
    DialogHeader,
    DialogTitle,
} from "@/components/ui/dialog"
import {
    Select,
    SelectContent,
    SelectItem,
    SelectTrigger,
    SelectValue,
} from "@/components/ui/select"
import { Table, TableBody, TableCell, TableHead, TableHeader, TableRow } from "@/components/ui/table"
import { Separator } from "@/components/ui/separator"
import { ScrollArea } from "@/components/ui/scroll-area"
import { Badge } from "@/components/ui/badge"
import { Receipt, Truck, CreditCard, HelpCircle } from "lucide-react"
import { supabase } from "@/lib/supabase"

interface ShopeeOrder {
    id: string
    order_id: string
    order_date: string
    product_name: string
    variation: string
    quantity: number
    status: string
    total_payment: number // Buyer Payment
    estimated_income: number // Net Income
    buyers_address?: string
    shipping_fee_paid_by_buyer?: number
    estimated_shipping_fee?: number
    shipping_fee_rebate?: number
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
}

interface ShopeeOrderDetailsDialogProps {
    open: boolean
    onOpenChange: (open: boolean) => void
    orderId: string
    items: ShopeeOrder[]
    productImages?: Record<string, string>
    products?: any[]
    onOrderUpdate?: () => void
}

export function ShopeeOrderDetailsDialog({
    open,
    onOpenChange,
    orderId,
    items,
    productImages = {},
    products = [],
    onOrderUpdate,
}: ShopeeOrderDetailsDialogProps) {
    if (!items || items.length === 0) return null

    const handleVariationChange = async (item: ShopeeOrder, newVariation: string) => {
        if (item.variation === newVariation) return
        
        const confirmChange = window.confirm(`Change variation to "${newVariation}"? This will update inventory.`)
        if (!confirmChange) return

        try {
            const oldVariation = item.variation
            
            // 1. Find Old Product (to revert stock)
            // We use the same matching logic as import: Exact or Fuzzy
            const findProduct = (varName: string) => {
                 const targetVar = varName.trim().toLowerCase();
                 return products.find(p => {
                    const dbVar = p.variation.trim().toLowerCase();
                    if (dbVar === targetVar) return true;
                    const cleanDbVar = dbVar.split('#')[0].trim();
                    if (cleanDbVar === targetVar) return true;
                    return false;
                 });
            }

            const oldProductInfo = findProduct(oldVariation);
            
            // 2. Find New Product (to deduct stock)
            const newProductInfo = products.find(p => p.variation === newVariation);

            if (!newProductInfo) {
                alert("Selected variation not found in products database.")
                return;
            }

            // 3. Database Updates
            // Update Old Product Stock (Revert)
            if (oldProductInfo) {
                 // Fetch fresh data to avoid race conditions
                 const { data: freshOld } = await supabase
                    .from('products')
                    .select('available_stock, sold_shopee')
                    .eq('id', oldProductInfo.id)
                    .single()

                 if (freshOld) {
                     const { error } = await supabase.from('products').update({
                         available_stock: (freshOld.available_stock || 0) + item.quantity,
                         sold_shopee: Math.max(0, (freshOld.sold_shopee || 0) - item.quantity)
                     }).eq('id', oldProductInfo.id)
                     if (error) throw error
                 }
            }

            // Update New Product Stock (Deduct)
            const { data: freshNew } = await supabase
                .from('products')
                .select('available_stock, sold_shopee')
                .eq('id', newProductInfo.id)
                .single()

            if (freshNew) {
                const { error: newError } = await supabase.from('products').update({
                     // Fix: Prevent negative stock
                     available_stock: Math.max(0, (freshNew.available_stock || 0) - item.quantity),
                     sold_shopee: (freshNew.sold_shopee || 0) + item.quantity
                }).eq('id', newProductInfo.id)
                if (newError) throw newError
            }

            // Update Shopee Order Record
            const { error: orderError } = await supabase.from('shopee_orders').update({
                variation: newVariation
            }).eq('id', item.id)
            if (orderError) throw orderError

            // 4. Update Sales Orders (Analytics)
            if (oldProductInfo && newProductInfo) {
                const saleDate = new Date(item.order_date).toISOString().split('T')[0];

                // Find one matching record
                const { data: salesRecord } = await supabase
                    .from('sales_orders')
                    .select('id')
                    .eq('product_id', oldProductInfo.id)
                    .eq('quantity', item.quantity)
                    .eq('platform', 'Shopee')
                    .eq('sale_date', saleDate)
                    .limit(1)
                    .maybeSingle()
                
                if (salesRecord) {
                     const { error: salesUpdateError } = await supabase
                        .from('sales_orders')
                        .update({ product_id: newProductInfo.id })
                        .eq('id', salesRecord.id)
                    
                    if (salesUpdateError) {
                        console.warn("Failed to update sales_orders:", salesUpdateError)
                    }
                }
            }

            // Success
            if (onOrderUpdate) onOrderUpdate()
            
        } catch (error: any) {
            console.error('Update Error:', error)
            alert("Failed to update variation: " + error.message)
        }
    }

    // Calculate Totals
    const merchandiseSubtotal = items.reduce((sum, item) => sum + (item.total_payment || 0), 0)
    // Fees are roughly per row, so sum them up
    const shippingPaid = items.reduce((sum, item) => sum + (item.shipping_fee_paid_by_buyer || 0), 0)
    const shippingCharged = items.reduce((sum, item) => sum + (item.estimated_shipping_fee || 0), 0)
    const shippingRebate = items.reduce((sum, item) => sum + (item.shipping_fee_rebate || 0), 0)

    // Fees & Charges Breakdown
    const commissionFee = 0 // Not mapped yet or usually 0
    const supportFee = items.reduce((sum, item) => sum + (item.support_program_fee || 0), 0)
    const serviceFee = items.reduce((sum, item) => sum + (item.service_fee || 0), 0)
    const transactionFee = items.reduce((sum, item) => sum + (item.transaction_fee || 0), 0)
    const withholdingTax = items.reduce((sum, item) => sum + (item.tax || 0), 0)

    const totalFees = commissionFee + supportFee + serviceFee + transactionFee + withholdingTax

    const estimatedOrderIncome = items.reduce((sum, item) => sum + (item.estimated_income || 0), 0)

    // First item for shared details
    const firstItem = items[0]

    return (
        <Dialog open={open} onOpenChange={onOpenChange}>
            <DialogContent className="max-w-2xl max-h-[90vh] p-0 overflow-hidden bg-zinc-50/50">
                <DialogHeader className="p-6 pb-2 bg-white">
                    <DialogTitle className="flex items-center gap-2 text-xl font-bold text-orange-600">
                        <Receipt className="w-5 h-5" />
                        Payment Information
                    </DialogTitle>
                    <p className="text-sm text-muted-foreground">
                        Order ID: <span className="font-mono font-bold text-foreground">{orderId}</span>
                        <span className="mx-2">•</span>
                        {new Date(firstItem.order_date).toLocaleDateString()}
                    </p>
                </DialogHeader>

                <ScrollArea className="h-full max-h-[calc(90vh-100px)]">
                    <div className="p-6 pt-2 space-y-6">

                        {/* Products Table */}
                        <div className="rounded-lg border bg-white overflow-hidden shadow-sm">
                            <Table>
                                <TableHeader className="bg-zinc-50">
                                    <TableRow>
                                        <TableHead className="w-[10px] text-center">No.</TableHead>
                                        <TableHead>Product(s)</TableHead>
                                        <TableHead className="text-right">Unit Price</TableHead>
                                        <TableHead className="text-center">Qty</TableHead>
                                        <TableHead className="text-right">Subtotal</TableHead>
                                    </TableRow>
                                </TableHeader>
                                <TableBody>
                                    {items.map((item, index) => {
                                        // Calculate Unit Price approx (Total / Qty)
                                        const unitPrice = item.quantity ? (item.total_payment / item.quantity) : 0;
                                        return (
                                            <TableRow key={item.id}>
                                                <TableCell className="text-center text-muted-foreground">{index + 1}</TableCell>
                                                <TableCell>
                                                    <div className="flex items-center gap-3">
                                                        {productImages[item.variation] && (
                                                            <div className="h-10 w-10 flex-shrink-0 rounded bg-zinc-100 overflow-hidden border border-zinc-200">
                                                                {/* eslint-disable-next-line @next/next/no-img-element */}
                                                                <img 
                                                                    src={productImages[item.variation]} 
                                                                    alt={item.variation} 
                                                                    className="h-full w-full object-cover"
                                                                />
                                                            </div>
                                                        )}
                                                        <div className="flex flex-col gap-1">
                                                            <span className="font-medium text-sm text-zinc-800 line-clamp-2" title={item.product_name || "Product"}>
                                                                {item.product_name || "Unknown Product"}
                                                            </span>
                                                            <div className="flex items-center gap-2">
                                                                <span className="text-xs text-zinc-500">Variation:</span>
                                                                <Select 
                                                                    defaultValue={item.variation} 
                                                                    onValueChange={(value) => handleVariationChange(item, value)}
                                                                >
                                                                    <SelectTrigger className="h-6 w-[180px] text-xs">
                                                                        <SelectValue placeholder={item.variation} />
                                                                    </SelectTrigger>
                                                                    <SelectContent>
                                                                        {products.map((p) => (
                                                                            <SelectItem key={p.id} value={p.variation}>
                                                                                {p.variation}
                                                                            </SelectItem>
                                                                        ))}
                                                                    </SelectContent>
                                                                </Select>
                                                            </div>
                                                        </div>
                                                    </div>
                                                </TableCell>
                                                <TableCell className="text-right font-mono text-xs">
                                                    ₱{unitPrice.toFixed(2)}
                                                </TableCell>
                                                <TableCell className="text-center font-mono text-xs">
                                                    {item.quantity}
                                                </TableCell>
                                                <TableCell className="text-right font-mono font-bold text-zinc-800">
                                                    ₱{item.total_payment.toFixed(2)}
                                                </TableCell>
                                            </TableRow>
                                        )
                                    })}
                                </TableBody>
                            </Table>
                        </div>

                        {/* Logistics & Payment Info */}
                        <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
                            <div className="bg-white rounded-lg border p-4 shadow-sm space-y-3">
                                <h3 className="font-semibold text-sm text-zinc-900 flex items-center gap-2">
                                    <Truck className="w-4 h-4 text-orange-500" />
                                    Delivery Info
                                </h3>
                                <div className="space-y-2 text-xs">
                                    <div className="flex justify-between">
                                        <span className="text-zinc-500">Shipping Provider</span>
                                        <span className="font-medium">{firstItem.shipping_provider || '-'}</span>
                                    </div>
                                    <div className="flex justify-between">
                                        <span className="text-zinc-500">Tracking Number</span>
                                        <span className="font-mono">{firstItem.tracking_number || '-'}</span>
                                    </div>
                                    <div className="flex justify-between">
                                        <span className="text-zinc-500">Date Shipped</span>
                                        <span>{firstItem.date_shipped ? new Date(firstItem.date_shipped).toLocaleDateString() : '-'}</span>
                                    </div>
                                    <div className="flex justify-between">
                                        <span className="text-zinc-500">Date Completed</span>
                                        <span>{firstItem.date_completed ? new Date(firstItem.date_completed).toLocaleDateString() : '-'}</span>
                                    </div>
                                </div>
                            </div>

                            <div className="bg-white rounded-lg border p-4 shadow-sm space-y-3">
                                <h3 className="font-semibold text-sm text-zinc-900 flex items-center gap-2">
                                    <CreditCard className="w-4 h-4 text-orange-500" />
                                    Payment & Buyer
                                </h3>
                                <div className="space-y-2 text-xs">
                                    <div className="flex justify-between">
                                        <span className="text-zinc-500">Buyer Username</span>
                                        <span className="font-medium">{firstItem.buyer_username || '-'}</span>
                                    </div>
                                    <div className="flex justify-between">
                                        <span className="text-zinc-500">Payment Method</span>
                                        <span className="font-medium">{firstItem.payment_method || '-'}</span>
                                    </div>
                                    <div className="flex justify-between">
                                        <span className="text-zinc-500">Voucher Code</span>
                                        <span className="font-mono">{firstItem.voucher_code || '-'}</span>
                                    </div>
                                    <div className="flex justify-between">
                                        <span className="text-zinc-500">Shopee Voucher</span>
                                        <span className="font-medium text-emerald-600">
                                            {firstItem.shopee_voucher ? `-₱${Number(firstItem.shopee_voucher).toFixed(2)}` : '-'}
                                        </span>
                                    </div>
                                </div>
                            </div>
                        </div>

                        {/* Financial Breakdown */}
                        <div className="bg-white rounded-lg border p-6 shadow-sm space-y-4">
                            <div className="flex justify-between items-center pb-2 border-b border-dashed">
                                <span className="font-bold text-zinc-700">Merchandise Subtotal</span>
                                <span className="font-bold text-zinc-900">₱{merchandiseSubtotal.toFixed(2)}</span>
                            </div>

                            {/* Shipping Section */}
                            <div className="space-y-2 text-sm">
                                <div className="flex justify-between items-center text-zinc-600">
                                    <div className="flex items-center gap-2">
                                        <Truck className="w-4 h-4 text-zinc-400" />
                                        <span>Estimated Shipping Subtotal</span>
                                    </div>
                                    <span>₱{(shippingPaid + shippingCharged).toFixed(2)}</span>
                                    {/* Note: In screenshot, Estimated Shipping Subtotal is usually 0 if rebate covers it? 
                                        Or maybe just sum of positive shipping paid? 
                                        Screenshot shows: 
                                        Est Shipping Subtotal: P0.00
                                        Shipping Paid by Buyer: P0.00
                                        Est Shipping Fee Charged: -130.00
                                        Est Rebate: P130.00
                                        Let's just list them.
                                    */}
                                </div>
                                <div className="pl-6 flex justify-between text-zinc-500 text-xs">
                                    <span>Shipping Fee Paid by Buyer</span>
                                    <span>₱{shippingPaid.toFixed(2)}</span>
                                </div>
                                <div className="pl-6 flex justify-between text-zinc-500 text-xs">
                                    <span>Estimated Shipping Fee Charged</span>
                                    <span className="text-red-500">₱{shippingCharged.toFixed(2)}</span>
                                </div>
                                <div className="pl-6 flex justify-between text-zinc-500 text-xs">
                                    <span>Estimated Shipping Fee Rebate</span>
                                    <span className="text-emerald-600">₱{shippingRebate.toFixed(2)}</span>
                                </div>
                            </div>

                            <Separator className="bg-zinc-100" />

                            {/* Fees Section */}
                            <div className="space-y-2 text-sm">
                                <div className="flex justify-between items-center font-medium text-zinc-800">
                                    <div className="flex items-center gap-2">
                                        <CreditCard className="w-4 h-4 text-zinc-400" />
                                        <span>Fees & Charges</span>
                                    </div>
                                    <span className="text-red-500">₱{totalFees.toFixed(2)}</span>
                                </div>
                                <div className="pl-6 space-y-1">
                                    <div className="flex justify-between text-zinc-500 text-xs">
                                        <span>Commission Fee</span>
                                        <span>₱{commissionFee.toFixed(2)}</span>
                                    </div>
                                    <div className="flex justify-between text-zinc-500 text-xs">
                                        <span>Support Program Fee</span>
                                        <span>{supportFee < 0 ? `-₱${Math.abs(supportFee).toFixed(2)}` : `₱${supportFee.toFixed(2)}`}</span>
                                    </div>
                                    <div className="flex justify-between text-zinc-500 text-xs">
                                        <span>Service Fee</span>
                                        <span>{serviceFee < 0 ? `-₱${Math.abs(serviceFee).toFixed(2)}` : `₱${serviceFee.toFixed(2)}`}</span>
                                    </div>
                                    <div className="flex justify-between text-zinc-500 text-xs">
                                        <span>Transaction Fee</span>
                                        <span>{transactionFee < 0 ? `-₱${Math.abs(transactionFee).toFixed(2)}` : `₱${transactionFee.toFixed(2)}`}</span>
                                    </div>
                                    <div className="flex justify-between text-zinc-500 text-xs">
                                        <span>Withholding Tax</span>
                                        <span>{withholdingTax < 0 ? `-₱${Math.abs(withholdingTax).toFixed(2)}` : `₱${withholdingTax.toFixed(2)}`}</span>
                                    </div>
                                </div>
                            </div>

                            <Separator className="my-2" />

                            <div className="flex justify-between items-center pt-2">
                                <div className="flex items-center gap-2 text-orange-600 font-bold text-lg">
                                    <span>Estimated Order Income</span>
                                    <HelpCircle className="w-4 h-4 text-orange-300" />
                                </div>
                                <span className="font-bold text-2xl text-orange-600">
                                    ₱{estimatedOrderIncome.toFixed(2)}
                                </span>
                            </div>

                        </div>
                    </div>
                </ScrollArea>
            </DialogContent>
        </Dialog>
    )
}
