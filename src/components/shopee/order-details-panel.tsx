import * as React from "react"
import {
    Table,
    TableBody,
    TableCell,
    TableHead,
    TableHeader,
    TableRow,
} from "@/components/ui/table"
import {
    Tabs,
    TabsContent,
    TabsList,
    TabsTrigger,
} from "@/components/ui/tabs"
import {
    Select,
    SelectContent,
    SelectItem,
    SelectTrigger,
    SelectValue,
} from "@/components/ui/select"
import { Button } from "@/components/ui/button"
import { Input } from "@/components/ui/input"
import { Textarea } from "@/components/ui/textarea"
import { Separator } from "@/components/ui/separator"
import { Truck, CreditCard, HelpCircle, Trash2, Loader2, Edit, X, Package, MapPin, User, Phone, CalendarClock, Save, RotateCcw, Receipt } from "lucide-react"
import { ShopeeStatusBadge } from "@/components/shopee/status-badge"
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
    commission_fee?: number
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

    shipping_history?: {
        description: string
        timestamp: string
    }[]
}

interface ShopeeOrderDetailsPanelProps {
    items: ShopeeOrder[]
    productImages?: Record<string, string>
    products?: any[]
    onOrderUpdate?: () => void
}

function ProductVariationSelector({ 
    currentVariation, 
    currentProductName,
    products, 
    onSelect, 
    onCancel 
}: { 
    currentVariation: string
    currentProductName?: string
    products: any[]
    onSelect: (variation: string) => void
    onCancel: () => void
}) {
    // Initialize state based on current variation if it matches a product
    const initialProduct = React.useMemo(() => {
        if (!currentVariation) return null;
        
        // 1. Exact Match
        let match = products.find(p => p.variation === currentVariation);
        if (match) return match;

        // 2. Soft Match (Ignore case and whitespace)
        const cleanCurrent = currentVariation.toLowerCase().trim();
        match = products.find(p => p.variation.toLowerCase().trim() === cleanCurrent);
        if (match) return match;

        // 3. Substring Match (e.g. "Geena Cloth Plain White (1 Yard)" matches "Geena Cloth Plain White")
        // Sort products by length descending to match longest variation first
        const sortedProducts = [...products].sort((a, b) => b.variation.length - a.variation.length);
        match = sortedProducts.find(p => cleanCurrent.includes(p.variation.toLowerCase().trim()));
        if (match) return match;

        return null;
    }, [currentVariation, products])

    // Derived lists
    const uniqueFabricNames = React.useMemo(() => 
        Array.from(new Set(products.map(p => p.fabric_name || "Geena"))).sort(),
        [products]
    )

    // Helper to guess fabric name if product not found
    const guessedFabricName = React.useMemo(() => {
        // 1. If product is found, use its fabric name (or default Geena)
        if (initialProduct) return initialProduct.fabric_name || "Geena";
        
        const lowerVar = currentVariation?.toLowerCase() || "";
        const lowerName = currentProductName?.toLowerCase() || "";
        
        // 2. Try to find a matching fabric name from available ones
        // Sort by length desc to match specific names first (e.g. "Cotton Spandex" before "Cotton")
        const sortedNames = [...uniqueFabricNames].sort((a, b) => b.length - a.length);

        // Check Variation first
        for (const name of sortedNames) {
             if (lowerVar.includes(name.toLowerCase())) return name;
        }

        // Check Product Name
        for (const name of sortedNames) {
             if (lowerName.includes(name.toLowerCase())) return name;
        }

        // 3. Fallback: If "geena" is in text, or if uniqueFabricNames contains "Geena" and nothing else matches
        if (lowerVar.includes("geena") || lowerName.includes("geena")) return "Geena";

        return "";
    }, [initialProduct, currentVariation, currentProductName, uniqueFabricNames]);

    const [fabricName, setFabricName] = React.useState(guessedFabricName || "")
    const [fabricType, setFabricType] = React.useState(initialProduct?.fabric_type || "")
    
    // Update state when guessedFabricName changes (e.g. if currentVariation prop changes)
    React.useEffect(() => {
        if (guessedFabricName) {
            setFabricName(guessedFabricName);
        }
        if (initialProduct) {
            setFabricType(initialProduct.fabric_type || "Plain");
        }
    }, [guessedFabricName, initialProduct]);
    
    const availableFabricTypes = React.useMemo(() => {
        if (!fabricName) return []
        return Array.from(new Set(
            products
                .filter(p => (p.fabric_name || "Geena") === fabricName)
                .map(p => p.fabric_type || "Plain")
        )).sort()
    }, [products, fabricName])

    const availableVariations = React.useMemo(() => {
        if (!fabricName || !fabricType) return []
        return products
            .filter(p => 
                (p.fabric_name || "Geena") === fabricName && 
                (p.fabric_type || "Plain") === fabricType
            )
            .sort((a, b) => a.variation.localeCompare(b.variation))
    }, [products, fabricName, fabricType])

    return (
        <div className="flex flex-col gap-2 p-3 border rounded-lg bg-card shadow-sm border-border mt-2">
            <div className="space-y-1.5">
                <span className="text-[10px] uppercase text-muted-foreground font-bold tracking-wider px-1">Fabric Name</span>
                <Select value={fabricName} onValueChange={(val) => {
                    setFabricName(val)
                    setFabricType("") // Reset type
                }}>
                    <SelectTrigger className="h-8 text-xs w-full">
                        <SelectValue placeholder="Select Fabric" />
                    </SelectTrigger>
                    <SelectContent>
                        {uniqueFabricNames.map((name: any) => (
                            <SelectItem key={name} value={name} className="text-xs">
                                {name}
                            </SelectItem>
                        ))}
                    </SelectContent>
                </Select>
            </div>

            {fabricName && (
                <div className="space-y-1.5 animate-in slide-in-from-top-1 fade-in duration-200">
                    <span className="text-[10px] uppercase text-muted-foreground font-bold tracking-wider px-1">Fabric Type</span>
                    <Select value={fabricType} onValueChange={(val) => {
                        setFabricType(val)
                    }}>
                        <SelectTrigger className="h-8 text-xs w-full">
                            <SelectValue placeholder="Select Type" />
                        </SelectTrigger>
                        <SelectContent>
                            {availableFabricTypes.map((type: any) => (
                                <SelectItem key={type} value={type} className="text-xs">
                                    {type}
                                </SelectItem>
                            ))}
                        </SelectContent>
                    </Select>
                </div>
            )}

            {fabricType && (
                <div className="space-y-1.5 animate-in slide-in-from-top-1 fade-in duration-200">
                    <span className="text-[10px] uppercase text-muted-foreground font-bold tracking-wider px-1">Variation</span>
                    <Select onValueChange={onSelect}>
                        <SelectTrigger className="h-8 text-xs w-full bg-orange-50 border-orange-200 text-orange-700 font-medium">
                            <SelectValue placeholder="Select Variation" />
                        </SelectTrigger>
                        <SelectContent>
                            {availableVariations.map(p => (
                                <SelectItem key={p.id} value={p.variation} className="text-xs">
                                    {p.variation}
                                </SelectItem>
                            ))}
                        </SelectContent>
                    </Select>
                </div>
            )}
            
            <Button 
                variant="ghost" 
                size="sm" 
                onClick={onCancel}
                className="h-7 text-[10px] text-muted-foreground/50 hover:text-muted-foreground w-full mt-1 hover:bg-muted"
            >
                Cancel Selection
            </Button>
        </div>
    )
}

export function ShopeeOrderDetailsPanel({
    items,
    productImages = {},
    products = [],
    onOrderUpdate,
}: ShopeeOrderDetailsPanelProps) {
    if (!items || items.length === 0) return null
    
    const [editingVariationId, setEditingVariationId] = React.useState<string | null>(null)
    const [loading, setLoading] = React.useState(false)
    const [isEditing, setIsEditing] = React.useState(false)
    
    // Items State (for editing Qty/Price)
    const [itemsData, setItemsData] = React.useState<ShopeeOrder[]>([])

    // Order Level State
    const [formData, setFormData] = React.useState({
        status: '',
        tracking_number: '',
        shipping_provider: '',
        buyer_username: '',
        buyers_address: '',
        date_shipped: '',
        date_completed: '',
        date_paid: '',
        
        // Financials
        shipping_fee_paid_by_buyer: 0,
        estimated_shipping_fee: 0,
        shipping_fee_rebate: 0,
        commission_fee: 0,
        support_program_fee: 0,
        service_fee: 0,
        transaction_fee: 0,
        tax: 0,
        shopee_voucher: 0,
        voucher_code: '',
    })

    // Reset form data when items change
    React.useEffect(() => {
        if (items.length > 0) {
            setItemsData(JSON.parse(JSON.stringify(items)))

            // Calculate initial totals for form
            const sum = (key: keyof ShopeeOrder) => items.reduce((acc, item) => acc + (Number(item[key]) || 0), 0)

            setFormData({
                status: items[0].status || '',
                tracking_number: items[0].tracking_number || '',
                shipping_provider: items[0].shipping_provider || '',
                buyer_username: items[0].buyer_username || '',
                buyers_address: items[0].buyers_address || '',
                date_shipped: items[0].date_shipped ? new Date(items[0].date_shipped).toISOString().split('T')[0] : '',
                date_completed: items[0].date_completed ? new Date(items[0].date_completed).toISOString().split('T')[0] : '',
                date_paid: items[0].date_paid ? new Date(items[0].date_paid).toISOString().split('T')[0] : '',
                
                shipping_fee_paid_by_buyer: sum('shipping_fee_paid_by_buyer'),
                estimated_shipping_fee: sum('estimated_shipping_fee'),
                shipping_fee_rebate: sum('shipping_fee_rebate'),
                commission_fee: sum('commission_fee'),
                support_program_fee: sum('support_program_fee'),
                service_fee: sum('service_fee'),
                transaction_fee: sum('transaction_fee'),
                tax: sum('tax'),
                shopee_voucher: sum('shopee_voucher'),
                voucher_code: items[0].voucher_code || '',
            })
        }
    }, [items])

    const handleSaveOrder = async () => {
        setLoading(true)
        try {
            // 1. Update Common Order Fields
            const commonUpdates = {
                status: formData.status,
                tracking_number: formData.tracking_number || null,
                shipping_provider: formData.shipping_provider || null,
                buyer_username: formData.buyer_username || null,
                buyers_address: formData.buyers_address || null,
                date_shipped: formData.date_shipped ? new Date(formData.date_shipped).toISOString() : null,
                date_completed: formData.date_completed ? new Date(formData.date_completed).toISOString() : null,
                date_paid: formData.date_paid ? new Date(formData.date_paid).toISOString() : null,
                voucher_code: formData.voucher_code || null,
            }
            
            const { error: commonError } = await supabase
                .from('shopee_orders')
                .update(commonUpdates)
                .eq('order_id', items[0].order_id)
            
            if (commonError) throw commonError

            // 2. Update Item Specifics
            for (const item of itemsData) {
                const { error: itemError } = await supabase
                    .from('shopee_orders')
                    .update({
                        quantity: item.quantity,
                        total_payment: item.total_payment,
                    })
                    .eq('id', item.id)
                
                if (itemError) throw itemError
            }

            // 3. Update Fees (First item gets fees, others get 0)
            const firstItemId = items[0].id
            const { error: feeError1 } = await supabase
                .from('shopee_orders')
                .update({
                    shipping_fee_paid_by_buyer: formData.shipping_fee_paid_by_buyer,
                    estimated_shipping_fee: formData.estimated_shipping_fee,
                    shipping_fee_rebate: formData.shipping_fee_rebate,
                    commission_fee: formData.commission_fee,
                    support_program_fee: formData.support_program_fee,
                    service_fee: formData.service_fee,
                    transaction_fee: formData.transaction_fee,
                    tax: formData.tax,
                    shopee_voucher: formData.shopee_voucher,
                })
                .eq('id', firstItemId)
            
            if (feeError1) throw feeError1

            if (items.length > 1) {
                const otherIds = items.slice(1).map(i => i.id)
                const { error: feeError2 } = await supabase
                    .from('shopee_orders')
                    .update({
                        shipping_fee_paid_by_buyer: 0,
                        estimated_shipping_fee: 0,
                        shipping_fee_rebate: 0,
                        commission_fee: 0,
                        support_program_fee: 0,
                        service_fee: 0,
                        transaction_fee: 0,
                        tax: 0,
                        shopee_voucher: 0,
                    })
                    .in('id', otherIds)
                
                if (feeError2) throw feeError2
            }

            setIsEditing(false)
            if (onOrderUpdate) onOrderUpdate()
        } catch (error: any) {
            console.error('Error updating order:', error)
            alert('Failed to update order: ' + error.message)
        } finally {
            setLoading(false)
        }
    }

    const handleDeleteOrder = async () => {
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
                            .eq('order_id', items[0].order_id);
                        
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
                .eq('order_id', items[0].order_id);
            
            if (error) throw error;

            alert("Order deleted and inventory restored.");
            if (onOrderUpdate) onOrderUpdate();

        } catch (err: any) {
            console.error('Delete Error:', err);
            alert("Error deleting order: " + err.message);
        } finally {
            setLoading(false);
        }
    }

    const handleVariationChange = async (item: ShopeeOrder, newVariation: string) => {
        if (item.variation === newVariation) return
        
        // Check if order is Cancelled/Return
        const isCancelledOrReturn = 
            item.status?.includes('Cancelled') || 
            item.status?.includes('Return') || 
            item.status?.includes('Refund') || 
            item.status?.includes('Failed');

        const message = isCancelledOrReturn 
            ? `Change variation to "${newVariation}"? Order is ${item.status || 'Cancelled'}, so inventory will NOT be changed.`
            : `Change variation to "${newVariation}"? This will update inventory.`;

        const confirmChange = window.confirm(message)
        if (!confirmChange) return

        try {
            const oldVariation = item.variation
            
            // Only touch inventory if valid order
            if (!isCancelledOrReturn) {
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
            }

            // Update Shopee Order Record (ALWAYS)
            const { error: orderError } = await supabase.from('shopee_orders').update({
                variation: newVariation
            }).eq('id', item.id)
            if (orderError) throw orderError

            // Success
            if (onOrderUpdate) onOrderUpdate()
            
        } catch (error: any) {
            console.error('Update Error:', error)
            alert("Failed to update variation: " + error.message)
        }
    }

    // Calculate Totals
    const displayItems = itemsData.length > 0 ? itemsData : items
    const merchandiseSubtotal = displayItems.reduce((sum, item) => sum + (item.total_payment || 0), 0)

    // Fees from formData (Assuming they carry their sign from DB, e.g. -36.00)
    const shippingPaid = formData.shipping_fee_paid_by_buyer
    const shippingCharged = formData.estimated_shipping_fee
    const shippingRebate = formData.shipping_fee_rebate

    const commissionFee = formData.commission_fee
    const supportFee = formData.support_program_fee
    const serviceFee = formData.service_fee
    const transactionFee = formData.transaction_fee
    const withholdingTax = formData.tax

    const totalFees = commissionFee + supportFee + serviceFee + transactionFee + withholdingTax

    const estimatedOrderIncome = merchandiseSubtotal + shippingPaid + shippingCharged + shippingRebate + totalFees

    return (
        <div className="p-4 animate-in slide-in-from-top-2 duration-200">
            <div className="mb-4 flex items-center justify-between">
                <ShopeeStatusBadge status={formData.status} />
            </div>
            <Tabs defaultValue="product" className="w-full">
                <div className="flex justify-between items-center border-b mb-6">
                    <TabsList className="justify-start border-b-0 rounded-none h-auto p-0 bg-transparent gap-6">
                        <TabsTrigger 
                            value="product" 
                            className="rounded-none border-b-2 border-transparent data-[state=active]:border-orange-500 data-[state=active]:text-orange-600 px-2 py-3"
                        >
                            Product Details
                        </TabsTrigger>
                        <TabsTrigger 
                            value="order_details" 
                            className="rounded-none border-b-2 border-transparent data-[state=active]:border-orange-500 data-[state=active]:text-orange-600 px-2 py-3"
                        >
                            Order Details
                        </TabsTrigger>
                        <TabsTrigger 
                            value="payment" 
                            className="rounded-none border-b-2 border-transparent data-[state=active]:border-orange-500 data-[state=active]:text-orange-600 px-2 py-3"
                        >
                            Payment Information
                        </TabsTrigger>
                        <TabsTrigger 
                            value="logistic" 
                            className="rounded-none border-b-2 border-transparent data-[state=active]:border-orange-500 data-[state=active]:text-orange-600 px-2 py-3"
                        >
                            Logistic Information
                        </TabsTrigger>
                    </TabsList>
                    
                    <div className="pb-1">
                        {isEditing ? (
                            <div className="flex gap-2">
                                <Button variant="outline" size="sm" onClick={() => setIsEditing(false)} disabled={loading}>
                                    Cancel
                                </Button>
                                <Button size="sm" onClick={handleSaveOrder} disabled={loading} className="bg-orange-600 hover:bg-orange-700">
                                    {loading && <Loader2 className="mr-2 h-4 w-4 animate-spin" />}
                                    Save
                                </Button>
                            </div>
                        ) : (
                            <div className="flex items-center gap-2">
                                <Button variant="outline" size="sm" className="gap-2" onClick={() => setIsEditing(true)}>
                                    <Edit className="h-3 w-3" />
                                    Edit Details
                                </Button>
                                <Button 
                                    variant="destructive" 
                                    size="sm" 
                                    className="gap-2"
                                    onClick={handleDeleteOrder}
                                    disabled={loading}
                                >
                                    {loading ? <Loader2 className="h-4 w-4 animate-spin" /> : <Trash2 className="h-4 w-4" />}
                                    Delete Order & Restore Inventory
                                </Button>
                            </div>
                        )}
                    </div>
                </div>

                {/* Product Details Tab */}
                <TabsContent value="product" className="mt-0">
                    <div className="rounded-sm border border-border overflow-hidden">
                        <Table>
                            <TableHeader className="bg-muted/40">
                                <TableRow>
                                    <TableHead className="w-[50px] text-center">No.</TableHead>
                                    <TableHead>Product(s)</TableHead>
                                    <TableHead className="text-right">Unit Price</TableHead>
                                    <TableHead className="text-center">Qty</TableHead>
                                    <TableHead className="text-right">Subtotal</TableHead>
                                </TableRow>
                            </TableHeader>
                            <TableBody>
                                {displayItems.map((item, index) => {
                                    const unitPrice = item.quantity ? (item.total_payment / item.quantity) : 0;
                                    return (
                                        <TableRow key={item.id}>
                                            <TableCell className="text-center text-muted-foreground">{index + 1}</TableCell>
                                            <TableCell>
                                                <div className="flex items-center gap-3">
                                                    {productImages[item.variation] && (
                                                        <div className="h-10 w-10 flex-shrink-0 rounded bg-muted overflow-hidden border border-border">
                                                            {/* eslint-disable-next-line @next/next/no-img-element */}
                                                            <img 
                                                                src={productImages[item.variation]} 
                                                                alt={item.variation} 
                                                                className="h-full w-full object-cover"
                                                            />
                                                        </div>
                                                    )}
                                                    <div className="flex flex-col gap-1">
                                                        <span className="font-medium text-sm text-foreground line-clamp-2" title={item.product_name || "Product"}>
                                                            {item.product_name || "Unknown Product"}
                                                        </span>
                                                        <div className="flex items-center gap-2">
                                                            <span className="text-xs text-muted-foreground">Variation:</span>
                                                            {editingVariationId === item.id ? (
                                                                <div className="flex flex-col gap-2 min-w-[250px]">
                                                                    <ProductVariationSelector 
                                                                        currentVariation={item.variation}
                                                                        currentProductName={item.product_name}
                                                                        products={products}
                                                                        onSelect={(value) => {
                                                                            handleVariationChange(item, value);
                                                                            setEditingVariationId(null);
                                                                        }}
                                                                        onCancel={() => setEditingVariationId(null)}
                                                                    />
                                                                </div>
                                                            ) : (
                                                                <div className="flex items-center gap-2">
                                                                    <span className="text-sm font-medium">{item.variation || "No Variation"}</span>
                                                                    <Button 
                                                                        variant="ghost" 
                                                                        size="icon" 
                                                                        className="h-6 w-6 text-muted-foreground/50 hover:text-foreground" 
                                                                        onClick={() => setEditingVariationId(item.id)}
                                                                    >
                                                                        <Edit className="h-3 w-3" />
                                                                    </Button>
                                                                </div>
                                                            )}
                                                        </div>
                                                    </div>
                                                </div>
                                            </TableCell>
                                            <TableCell className="text-right font-mono text-xs">
                                                {isEditing ? (
                                                    <Input 
                                                        type="number" 
                                                        className="h-8 w-24 text-right ml-auto"
                                                        value={unitPrice}
                                                        onChange={(e) => {
                                                            const newPrice = parseFloat(e.target.value) || 0;
                                                            const newData = [...itemsData];
                                                            newData[index].total_payment = newPrice * newData[index].quantity;
                                                            setItemsData(newData);
                                                        }}
                                                    />
                                                ) : (
                                                    `₱${unitPrice.toFixed(2)}`
                                                )}
                                            </TableCell>
                                            <TableCell className="text-center font-mono text-xs">
                                                {isEditing ? (
                                                    <Input 
                                                        type="number"
                                                        className="h-8 w-20 text-center mx-auto"
                                                        value={item.quantity}
                                                        onChange={(e) => {
                                                            const newQty = parseInt(e.target.value) || 0;
                                                            const newData = [...itemsData];
                                                            const currentUnitPrice = newData[index].quantity ? (newData[index].total_payment / newData[index].quantity) : 0;
                                                            newData[index].quantity = newQty;
                                                            newData[index].total_payment = currentUnitPrice * newQty;
                                                            setItemsData(newData);
                                                        }}
                                                    />
                                                ) : (
                                                    item.quantity
                                                )}
                                            </TableCell>
                                            <TableCell className="text-right font-mono font-bold text-foreground">
                                                ₱{item.total_payment.toFixed(2)}
                                            </TableCell>
                                        </TableRow>
                                    )
                                })}
                            </TableBody>
                        </Table>
                    </div>
                </TabsContent>

                {/* Order Details Tab */}
                <TabsContent value="order_details" className="mt-0">
                    <div className="grid grid-cols-1 md:grid-cols-2 gap-6">
                        <div className="space-y-6">
                             {/* General Info */}
                            <div className="rounded-sm border border-border p-6">
                                <div className="flex justify-between items-center mb-4">
                                    <h3 className="font-semibold text-foreground flex items-center gap-2">
                                        <Receipt className="h-4 w-4 text-orange-600" />
                                        General Information
                                    </h3>
                                    {!isEditing && (
                                        <Button variant="ghost" size="sm" onClick={() => setIsEditing(true)} className="h-6 text-xs text-orange-600 hover:text-orange-700 hover:bg-orange-500/10">
                                            Edit
                                        </Button>
                                    )}
                                </div>
                                <div className="space-y-4">
                                    <div className="flex justify-between py-2 border-b border-dashed">
                                        <span className="text-sm text-muted-foreground">Order ID</span>
                                        <span className="text-sm font-mono text-muted-foreground">{items[0].order_id}</span>
                                    </div>
                                    <div className="flex flex-col py-2 border-b border-dashed gap-2 group cursor-pointer" onClick={() => !isEditing && setIsEditing(true)}>
                                        <span className="text-sm text-muted-foreground group-hover:text-orange-600 transition-colors">Status</span>
                                        {isEditing ? (
                                            <Select 
                                                value={formData.status} 
                                                onValueChange={(val) => setFormData(prev => ({ ...prev, status: val }))}
                                            >
                                                <SelectTrigger className="h-8">
                                                    <SelectValue placeholder="Select status" />
                                                </SelectTrigger>
                                                <SelectContent>
                                                    <SelectItem value="To Ship">To Ship</SelectItem>
                                                    <SelectItem value="Shipping">Shipping</SelectItem>
                                                    <SelectItem value="Completed">Completed</SelectItem>
                                                    <SelectItem value="Cancelled">Cancelled</SelectItem>
                                                    <SelectItem value="Returned">Returned</SelectItem>
                                                </SelectContent>
                                            </Select>
                                        ) : (
                                            <div className="group-hover:bg-muted p-1 -ml-1 rounded transition-colors w-fit">
                                                <ShopeeStatusBadge status={items[0].status || "N/A"} />
                                            </div>
                                        )}
                                    </div>
                                    
                                    {/* Dates moved from Payment */}
                                    <div className="flex justify-between py-2 border-b border-dashed">
                                        <span className="text-sm text-muted-foreground">Date Placed</span>
                                        <span className="text-sm font-medium text-foreground">{items[0].order_date ? new Date(items[0].order_date).toLocaleDateString() : '-'}</span>
                                    </div>
                                    <div className="flex flex-col py-2 border-b border-dashed gap-2 group cursor-pointer" onClick={() => !isEditing && setIsEditing(true)}>
                                        <span className="text-sm text-muted-foreground group-hover:text-orange-600 transition-colors">Date Paid</span>
                                        {isEditing ? (
                                            <Input 
                                                type="date"
                                                value={formData.date_paid}
                                                onChange={(e) => setFormData(prev => ({ ...prev, date_paid: e.target.value }))}
                                                className="h-8"
                                            />
                                        ) : (
                                            <span className="text-sm font-medium text-foreground group-hover:bg-muted p-1 -ml-1 rounded transition-colors">
                                                {formData.date_paid ? new Date(formData.date_paid).toLocaleDateString() : '-'}
                                            </span>
                                        )}
                                    </div>
                                </div>
                            </div>
                        </div>

                        <div className="space-y-6">
                            {/* Recipient Info (Moved from Logistic) */}
                            <div className="rounded-sm border border-border p-6">
                                <div className="flex justify-between items-center mb-4">
                                    <h3 className="font-semibold text-foreground flex items-center gap-2">
                                        <User className="h-4 w-4 text-blue-600" />
                                        Recipient Details
                                    </h3>
                                    {!isEditing && (
                                        <Button variant="ghost" size="sm" onClick={() => setIsEditing(true)} className="h-6 text-xs text-blue-600 hover:text-blue-700 hover:bg-blue-500/10">
                                            Edit
                                        </Button>
                                    )}
                                </div>
                                <div className="space-y-4">
                                    <div className="flex items-start gap-3 group cursor-pointer" onClick={() => !isEditing && setIsEditing(true)}>
                                        <User className="h-4 w-4 text-muted-foreground/50 mt-0.5 group-hover:text-blue-600 transition-colors" />
                                        <div className="flex-1 space-y-2">
                                            {isEditing ? (
                                                <Input 
                                                    value={formData.buyer_username} 
                                                    onChange={(e) => setFormData(prev => ({ ...prev, buyer_username: e.target.value }))}
                                                    placeholder="Buyer Username"
                                                    className="h-8"
                                                />
                                            ) : (
                                                <div className="text-sm font-medium text-foreground group-hover:bg-muted p-1 -ml-1 rounded transition-colors">{items[0].buyer_username || "Unknown Buyer"}</div>
                                            )}
                                        </div>
                                    </div>
                                    <div className="flex items-start gap-3 group cursor-pointer" onClick={() => !isEditing && setIsEditing(true)}>
                                        <MapPin className="h-4 w-4 text-muted-foreground/50 mt-0.5 group-hover:text-blue-600 transition-colors" />
                                        <div className="flex-1 space-y-2">
                                            {isEditing ? (
                                                <Textarea 
                                                    value={formData.buyers_address} 
                                                    onChange={(e) => setFormData(prev => ({ ...prev, buyers_address: e.target.value }))}
                                                    className="min-h-[80px]"
                                                    placeholder="Buyer Address"
                                                />
                                            ) : (
                                                items[0].buyers_address && (
                                                    <div className="text-sm text-muted-foreground leading-relaxed whitespace-pre-wrap group-hover:bg-muted p-1 -ml-1 rounded transition-colors">
                                                        {items[0].buyers_address}
                                                    </div>
                                                )
                                            )}
                                        </div>
                                    </div>
                                </div>
                            </div>
                        </div>
                    </div>

                    {/* Order History & Shipping History */}
                    <div className="grid grid-cols-1 md:grid-cols-2 gap-6 mt-6">
                         {items[0].order_history && items[0].order_history.length > 0 && (
                            <div className="rounded-sm border border-border p-6">
                                <h3 className="font-semibold text-foreground flex items-center gap-2 mb-4">
                                    <CalendarClock className="h-4 w-4 text-purple-600" />
                                    Order History
                                </h3>
                                <div className="relative pl-4 border-l border-muted space-y-6">
                                    {items[0].order_history.map((event, idx) => (
                                        <div key={idx} className="relative">
                                            <div className={`absolute -left-[21px] top-1 h-2.5 w-2.5 rounded-full ring-4 ring-background ${idx === 0 ? 'bg-purple-600' : 'bg-muted-foreground/30'}`} />
                                            <div className="flex flex-col gap-1">
                                                <span className={`text-sm ${idx === 0 ? 'font-medium text-foreground' : 'text-muted-foreground'}`}>{event.title}</span>
                                                {event.description && <span className="text-xs text-muted-foreground">{event.description}</span>}
                                                <span className="text-[10px] text-muted-foreground/70">{event.timestamp}</span>
                                            </div>
                                        </div>
                                    ))}
                                </div>
                            </div>
                        )}

                        {items[0].shipping_history && items[0].shipping_history.length > 0 && (
                            <div className="rounded-sm border border-border p-6">
                                <h3 className="font-semibold text-foreground flex items-center gap-2 mb-4">
                                    <Truck className="h-4 w-4 text-blue-600" />
                                    Shipping History
                                </h3>
                                <div className="relative pl-4 border-l border-muted space-y-6">
                                    {items[0].shipping_history.map((event, idx) => (
                                        <div key={idx} className="relative">
                                            <div className={`absolute -left-[21px] top-1 h-2.5 w-2.5 rounded-full ring-4 ring-background ${idx === 0 ? 'bg-blue-600' : 'bg-muted-foreground/30'}`} />
                                            <div className="flex flex-col gap-1">
                                                <span className={`text-sm ${idx === 0 ? 'font-medium text-foreground' : 'text-muted-foreground'}`}>{event.description}</span>
                                                <span className="text-[10px] text-muted-foreground/70">{event.timestamp}</span>
                                            </div>
                                        </div>
                                    ))}
                                </div>
                            </div>
                        )}
                    </div>
                </TabsContent>

                {/* Payment Information Tab */}
                <TabsContent value="payment" className="mt-0">
                    <div className="rounded-sm border border-border p-6 space-y-4 max-w-3xl">
                        <div className="flex justify-between items-center pb-2 border-b border-dashed">
                            <span className="font-bold text-foreground">Merchandise Subtotal</span>
                            <span className="font-bold text-foreground">₱{merchandiseSubtotal.toFixed(2)}</span>
                        </div>

                        {/* Shipping Section */}
                        <div className="space-y-2 text-sm">
                            <div className="flex justify-between items-center text-muted-foreground">
                                <div className="flex items-center gap-2">
                                    <Truck className="w-4 h-4 text-muted-foreground/50" />
                                    <span>Estimated Shipping Subtotal</span>
                                </div>
                                <span>₱{(shippingPaid + shippingCharged).toFixed(2)}</span>
                            </div>
                            <div className="pl-6 flex justify-between text-muted-foreground text-xs items-center">
                                <span>Shipping Fee Paid by Buyer</span>
                                {isEditing ? (
                                    <Input 
                                        type="number"
                                        className="h-7 w-24 text-right"
                                        value={formData.shipping_fee_paid_by_buyer}
                                        onChange={(e) => setFormData(prev => ({ ...prev, shipping_fee_paid_by_buyer: parseFloat(e.target.value) || 0 }))}
                                    />
                                ) : (
                                    <span>₱{shippingPaid.toFixed(2)}</span>
                                )}
                            </div>
                            <div className="pl-6 flex justify-between text-muted-foreground text-xs items-center">
                                <span>Estimated Shipping Fee Charged</span>
                                {isEditing ? (
                                    <Input 
                                        type="number"
                                        className="h-7 w-24 text-right"
                                        value={formData.estimated_shipping_fee}
                                        onChange={(e) => setFormData(prev => ({ ...prev, estimated_shipping_fee: parseFloat(e.target.value) || 0 }))}
                                    />
                                ) : (
                                    <span className="text-red-500">₱{shippingCharged.toFixed(2)}</span>
                                )}
                            </div>
                            <div className="pl-6 flex justify-between text-muted-foreground text-xs items-center">
                                <span>Estimated Shipping Fee Rebate</span>
                                {isEditing ? (
                                    <Input 
                                        type="number"
                                        className="h-7 w-24 text-right"
                                        value={formData.shipping_fee_rebate}
                                        onChange={(e) => setFormData(prev => ({ ...prev, shipping_fee_rebate: parseFloat(e.target.value) || 0 }))}
                                    />
                                ) : (
                                    <span className="text-emerald-600">₱{shippingRebate.toFixed(2)}</span>
                                )}
                            </div>
                        </div>

                        <Separator className="bg-border" />

                        {/* Fees Section */}
                        <div className="space-y-2 text-sm">
                            <div className="flex justify-between items-center font-medium text-foreground">
                                <div className="flex items-center gap-2">
                                    <CreditCard className="w-4 h-4 text-muted-foreground/50" />
                                    <span>Fees & Charges</span>
                                </div>
                                <span className="text-red-500">{totalFees < 0 ? `-₱${Math.abs(totalFees).toFixed(2)}` : `₱${totalFees.toFixed(2)}`}</span>
                            </div>
                            <div className="pl-6 space-y-1">
                                <div className="flex justify-between text-muted-foreground text-xs items-center">
                                    <span>Commission Fee</span>
                                    {isEditing ? (
                                        <Input 
                                            type="number"
                                            className="h-7 w-24 text-right"
                                            value={formData.commission_fee}
                                            onChange={(e) => setFormData(prev => ({ ...prev, commission_fee: parseFloat(e.target.value) || 0 }))}
                                        />
                                    ) : (
                                        <span>₱{commissionFee.toFixed(2)}</span>
                                    )}
                                </div>
                                <div className="flex justify-between text-muted-foreground text-xs items-center">
                                    <span>Support Program Fee</span>
                                    {isEditing ? (
                                        <Input 
                                            type="number"
                                            className="h-7 w-24 text-right"
                                            value={formData.support_program_fee}
                                            onChange={(e) => setFormData(prev => ({ ...prev, support_program_fee: parseFloat(e.target.value) || 0 }))}
                                        />
                                    ) : (
                                        <span>{supportFee < 0 ? `-₱${Math.abs(supportFee).toFixed(2)}` : `₱${supportFee.toFixed(2)}`}</span>
                                    )}
                                </div>
                                <div className="flex justify-between text-muted-foreground text-xs items-center">
                                    <span>Service Fee</span>
                                    {isEditing ? (
                                        <Input 
                                            type="number"
                                            className="h-7 w-24 text-right"
                                            value={formData.service_fee}
                                            onChange={(e) => setFormData(prev => ({ ...prev, service_fee: parseFloat(e.target.value) || 0 }))}
                                        />
                                    ) : (
                                        <span>{serviceFee < 0 ? `-₱${Math.abs(serviceFee).toFixed(2)}` : `₱${serviceFee.toFixed(2)}`}</span>
                                    )}
                                </div>
                                <div className="flex justify-between text-muted-foreground text-xs items-center">
                                    <span>Transaction Fee</span>
                                    {isEditing ? (
                                        <Input 
                                            type="number"
                                            className="h-7 w-24 text-right"
                                            value={formData.transaction_fee}
                                            onChange={(e) => setFormData(prev => ({ ...prev, transaction_fee: parseFloat(e.target.value) || 0 }))}
                                        />
                                    ) : (
                                        <span>{transactionFee < 0 ? `-₱${Math.abs(transactionFee).toFixed(2)}` : `₱${transactionFee.toFixed(2)}`}</span>
                                    )}
                                </div>
                                <div className="flex justify-between text-muted-foreground text-xs items-center">
                                    <span>Withholding Tax</span>
                                    {isEditing ? (
                                        <Input 
                                            type="number"
                                            className="h-7 w-24 text-right"
                                            value={formData.tax}
                                            onChange={(e) => setFormData(prev => ({ ...prev, tax: parseFloat(e.target.value) || 0 }))}
                                        />
                                    ) : (
                                        <span>{withholdingTax < 0 ? `-₱${Math.abs(withholdingTax).toFixed(2)}` : `₱${withholdingTax.toFixed(2)}`}</span>
                                    )}
                                </div>
                            </div>
                        </div>

                        <Separator className="bg-border" />

                        {/* Vouchers Section */}
                        <div className="space-y-2 text-sm">
                            <div className="flex justify-between items-center font-medium text-foreground">
                                <div className="flex items-center gap-2">
                                    <Receipt className="w-4 h-4 text-muted-foreground/50" />
                                    <span>Vouchers</span>
                                </div>
                            </div>
                            <div className="pl-6 flex justify-between text-muted-foreground text-xs items-center">
                                <span>Shopee Voucher</span>
                                {isEditing ? (
                                    <Input 
                                        type="number"
                                        className="h-7 w-24 text-right"
                                        value={formData.shopee_voucher}
                                        onChange={(e) => setFormData(prev => ({ ...prev, shopee_voucher: parseFloat(e.target.value) || 0 }))}
                                    />
                                ) : (
                                    <span>₱{formData.shopee_voucher?.toFixed(2) || '0.00'}</span>
                                )}
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
                        
                        <Separator className="bg-border" />
                    </div>
                </TabsContent>

                {/* Logistic Information Tab */}
                <TabsContent value="logistic" className="mt-0">
                    <div className="grid grid-cols-1 md:grid-cols-2 gap-6">
                        <div className="space-y-6">
                            {/* Shipping Details */}
                            <div className="rounded-sm border border-border p-6">
                                <div className="flex justify-between items-center mb-4">
                                    <h3 className="font-semibold text-foreground flex items-center gap-2">
                                        <Package className="h-4 w-4 text-orange-600" />
                                        Shipping Details
                                    </h3>
                                    {!isEditing && (
                                        <Button variant="ghost" size="sm" onClick={() => setIsEditing(true)} className="h-6 text-xs text-orange-600 hover:text-orange-700 hover:bg-orange-500/10">
                                            Edit
                                        </Button>
                                    )}
                                </div>
                                <div className="space-y-4">
                                    <div className="flex flex-col py-2 border-b border-dashed gap-2 group cursor-pointer" onClick={() => !isEditing && setIsEditing(true)}>
                                        <span className="text-sm text-muted-foreground group-hover:text-orange-600 transition-colors">Courier</span>
                                        {isEditing ? (
                                            <Input 
                                                value={formData.shipping_provider} 
                                                onChange={(e) => setFormData(prev => ({ ...prev, shipping_provider: e.target.value }))}
                                                className="h-8"
                                            />
                                        ) : (
                                            <span className="text-sm font-medium text-foreground group-hover:bg-muted p-1 -ml-1 rounded transition-colors">{items[0].shipping_provider || "Standard Local"}</span>
                                        )}
                                    </div>
                                    <div className="flex flex-col py-2 border-b border-dashed gap-2 group cursor-pointer" onClick={() => !isEditing && setIsEditing(true)}>
                                        <span className="text-sm text-muted-foreground group-hover:text-orange-600 transition-colors">Tracking Number</span>
                                        {isEditing ? (
                                            <Input 
                                                value={formData.tracking_number} 
                                                onChange={(e) => setFormData(prev => ({ ...prev, tracking_number: e.target.value }))}
                                                className="h-8"
                                            />
                                        ) : (
                                            <div className="flex items-center gap-2 group-hover:bg-muted p-1 -ml-1 rounded transition-colors">
                                                <span className="text-sm font-mono font-bold text-foreground">{items[0].tracking_number || "N/A"}</span>
                                            </div>
                                        )}
                                    </div>
                                </div>
                            </div>
                        </div>

                        {/* Timeline / Status */}
                        <div className="rounded-sm border border-border p-6">
                            <div className="flex justify-between items-center mb-4">
                                <h3 className="font-semibold text-foreground flex items-center gap-2">
                                    <CalendarClock className="h-4 w-4 text-emerald-600" />
                                    Delivery Status
                                </h3>
                                {!isEditing && (
                                    <Button variant="ghost" size="sm" onClick={() => setIsEditing(true)} className="h-6 text-xs text-emerald-600 hover:text-emerald-700 hover:bg-emerald-500/10">
                                        Edit
                                    </Button>
                                )}
                            </div>
                            
                            <div className="relative pl-4 border-l-2 border-border space-y-8 my-4">
                                <div className="relative group cursor-pointer" onClick={() => !isEditing && setIsEditing(true)}>
                                    <div className="absolute -left-[21px] top-1 h-3 w-3 rounded-full bg-emerald-500 border-2 border-background ring-2 ring-emerald-500/20" />
                                    <div className="flex flex-col gap-2">
                                        <span className="text-sm font-medium text-foreground group-hover:text-emerald-600 transition-colors">Order Completed</span>
                                        {isEditing ? (
                                            <Input 
                                                type="date"
                                                value={formData.date_completed}
                                                onChange={(e) => setFormData(prev => ({ ...prev, date_completed: e.target.value }))}
                                                className="h-8 w-[150px]"
                                            />
                                        ) : (
                                            items[0].date_completed && (
                                                <span className="text-xs text-muted-foreground group-hover:bg-muted p-1 -ml-1 rounded transition-colors">
                                                    {new Date(items[0].date_completed).toLocaleString()}
                                                </span>
                                            )
                                        )}
                                    </div>
                                </div>

                                <div className="relative group cursor-pointer" onClick={() => !isEditing && setIsEditing(true)}>
                                    <div className="absolute -left-[21px] top-1 h-3 w-3 rounded-full bg-orange-500 border-2 border-background ring-2 ring-orange-500/20" />
                                    <div className="flex flex-col gap-2">
                                        <span className="text-sm font-medium text-foreground group-hover:text-orange-600 transition-colors">Parcel is out for delivery / In Transit</span>
                                        {isEditing ? (
                                            <Input 
                                                type="date"
                                                value={formData.date_shipped}
                                                onChange={(e) => setFormData(prev => ({ ...prev, date_shipped: e.target.value }))}
                                                className="h-8 w-[150px]"
                                            />
                                        ) : (
                                            items[0].date_shipped && (
                                                <span className="text-xs text-muted-foreground group-hover:bg-muted p-1 -ml-1 rounded transition-colors">
                                                    {new Date(items[0].date_shipped).toLocaleString()}
                                                </span>
                                            )
                                        )}
                                    </div>
                                </div>
                            </div>
                        </div>
                    </div>
                </TabsContent>
            </Tabs>

            {isEditing && (
                <div className="flex justify-end pt-6 gap-2 border-t border-zinc-200 mt-6">
                    <Button variant="outline" onClick={() => setIsEditing(false)} disabled={loading}>
                        Cancel
                    </Button>
                    <Button onClick={handleSaveOrder} disabled={loading} className="bg-orange-600 hover:bg-orange-700">
                        {loading && <Loader2 className="mr-2 h-4 w-4 animate-spin" />}
                        Save Changes
                    </Button>
                </div>
            )}
        </div>
    )
}
