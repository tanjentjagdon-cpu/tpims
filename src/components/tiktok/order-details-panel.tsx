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
import { Truck, CreditCard, HelpCircle, Trash2, Loader2, Edit, X, Package, MapPin, User, Phone, CalendarClock, Save, RotateCcw } from "lucide-react"
import { supabase } from "@/lib/supabase"

interface TiktokOrder {
    id: string
    order_id: string
    order_date: string
    product_name: string
    variation: string
    quantity: number
    status: string
    total_payment: number
    estimated_income: number
    buyers_address?: string
    shipping_fee_paid_by_buyer?: number
    estimated_shipping_fee?: number
    shipping_fee_rebate?: number
    support_program_fee?: number
    service_fee?: number
    transaction_fee?: number
    tax?: number
    merchandise_subtotal?: number
    
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

interface TiktokOrderDetailsPanelProps {
    items: TiktokOrder[]
    productImages?: Record<string, string>
    products?: any[]
    onOrderUpdate?: () => void
}

function ProductVariationSelector({ 
    currentVariation, 
    products, 
    onSelect, 
    onCancel 
}: { 
    currentVariation: string
    products: any[]
    onSelect: (variation: string) => void
    onCancel: () => void
}) {
    const initialProduct = React.useMemo(() => 
        products.find(p => p.variation === currentVariation), 
        [currentVariation, products]
    )

    const [fabricName, setFabricName] = React.useState(initialProduct?.fabric_name || "")
    const [fabricType, setFabricType] = React.useState(initialProduct?.fabric_type || "")
    
    const uniqueFabricNames = React.useMemo(() => 
        Array.from(new Set(products.map(p => p.fabric_name || "Others"))).sort(),
        [products]
    )

    const availableFabricTypes = React.useMemo(() => {
        if (!fabricName) return []
        return Array.from(new Set(
            products
                .filter(p => (p.fabric_name || "Others") === fabricName)
                .map(p => p.fabric_type || "Standard")
        )).sort()
    }, [products, fabricName])

    const availableVariations = React.useMemo(() => {
        if (!fabricName || !fabricType) return []
        return products
            .filter(p => 
                (p.fabric_name || "Others") === fabricName && 
                (p.fabric_type || "Standard") === fabricType
            )
            .sort((a, b) => a.variation.localeCompare(b.variation))
    }, [products, fabricName, fabricType])

    return (
        <div className="flex flex-col gap-2 p-3 border rounded-lg bg-card shadow-sm border-border mt-2">
            <div className="space-y-1.5">
                <span className="text-[10px] uppercase text-muted-foreground font-bold tracking-wider px-1">Fabric Name</span>
                <Select value={fabricName} onValueChange={(val) => {
                    setFabricName(val)
                    setFabricType("") 
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

export function TiktokOrderDetailsPanel({
    items,
    productImages = {},
    products = [],
    onOrderUpdate,
}: TiktokOrderDetailsPanelProps) {
    if (!items || items.length === 0) return null
    
    const [editingVariationId, setEditingVariationId] = React.useState<string | null>(null)
    const [loading, setLoading] = React.useState(false)
    const [isEditing, setIsEditing] = React.useState(false)
    const [formData, setFormData] = React.useState({
        status: items[0]?.status || '',
        tracking_number: items[0]?.tracking_number || '',
        shipping_provider: items[0]?.shipping_provider || '',
        buyer_username: items[0]?.buyer_username || '',
        buyers_address: items[0]?.buyers_address || '',
        date_shipped: items[0]?.date_shipped ? new Date(items[0].date_shipped).toISOString().split('T')[0] : '',
        date_completed: items[0]?.date_completed ? new Date(items[0].date_completed).toISOString().split('T')[0] : '',
        date_paid: items[0]?.date_paid ? new Date(items[0].date_paid).toISOString().split('T')[0] : '',
    })

    React.useEffect(() => {
        if (items[0]) {
            setFormData({
                status: items[0].status || '',
                tracking_number: items[0].tracking_number || '',
                shipping_provider: items[0].shipping_provider || '',
                buyer_username: items[0].buyer_username || '',
                buyers_address: items[0].buyers_address || '',
                date_shipped: items[0].date_shipped ? new Date(items[0].date_shipped).toISOString().split('T')[0] : '',
                date_completed: items[0].date_completed ? new Date(items[0].date_completed).toISOString().split('T')[0] : '',
                date_paid: items[0].date_paid ? new Date(items[0].date_paid).toISOString().split('T')[0] : '',
            })
        }
    }, [items])

    const handleSaveOrder = async () => {
        setLoading(true)
        try {
            const { error } = await supabase
                .from('tiktok_orders')
                .update({
                    status: formData.status,
                    tracking_number: formData.tracking_number || null,
                    shipping_provider: formData.shipping_provider || null,
                    buyer_username: formData.buyer_username || null,
                    buyers_address: formData.buyers_address || null,
                    date_shipped: formData.date_shipped ? new Date(formData.date_shipped).toISOString() : null,
                    date_completed: formData.date_completed ? new Date(formData.date_completed).toISOString() : null,
                    date_paid: formData.date_paid ? new Date(formData.date_paid).toISOString() : null,
                })
                .eq('order_id', items[0].order_id)

            if (error) throw error

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
            for (const item of items) {
                const targetVar = item.variation.trim().toLowerCase();
                const product = products.find(p => {
                    const dbVar = p.variation.trim().toLowerCase();
                    if (dbVar === targetVar) return true;
                    const cleanDbVar = dbVar.split('#')[0].trim();
                    if (cleanDbVar === targetVar) return true;
                    return false;
                });

                if (product) {
                    const { data: freshProduct } = await supabase
                        .from('products')
                        .select('available_stock, sold_tiktok')
                        .eq('id', product.id)
                        .single();
                    
                    if (freshProduct) {
                        await supabase.from('products').update({
                            available_stock: (freshProduct.available_stock || 0) + item.quantity,
                            sold_tiktok: Math.max(0, (freshProduct.sold_tiktok || 0) - item.quantity)
                        }).eq('id', product.id);

                        const { error: deleteByOrderError } = await supabase
                            .from('sales_orders')
                            .delete()
                            .eq('order_id', items[0].order_id);
                        
                        if (deleteByOrderError || true) {
                            const saleDate = new Date(item.order_date).toISOString().split('T')[0];
                            const { data: salesRecord } = await supabase
                                .from('sales_orders')
                                .select('id')
                                .eq('product_id', product.id)
                                .eq('quantity', item.quantity)
                                .eq('platform', 'Tiktok')
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

            const { error } = await supabase
                .from('tiktok_orders')
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

    const handleVariationChange = async (item: TiktokOrder, newVariation: string) => {
        if (item.variation === newVariation) return
        
        const confirmChange = window.confirm(`Change variation to "${newVariation}"? This will update inventory.`)
        if (!confirmChange) return

        try {
            const oldVariation = item.variation
            
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
            const newProductInfo = products.find(p => p.variation === newVariation);

            if (!newProductInfo) {
                alert("Selected variation not found in products database.")
                return;
            }

            if (oldProductInfo) {
                 const { data: freshOld } = await supabase
                    .from('products')
                    .select('available_stock, sold_tiktok')
                    .eq('id', oldProductInfo.id)
                    .single()

                 if (freshOld) {
                     const { error } = await supabase.from('products').update({
                         available_stock: (freshOld.available_stock || 0) + item.quantity,
                         sold_tiktok: Math.max(0, (freshOld.sold_tiktok || 0) - item.quantity)
                     }).eq('id', oldProductInfo.id)
                     if (error) throw error
                 }
            }

            const { data: freshNew } = await supabase
                .from('products')
                .select('available_stock, sold_tiktok')
                .eq('id', newProductInfo.id)
                .single()

            if (freshNew) {
                const { error: newError } = await supabase.from('products').update({
                     available_stock: Math.max(0, (freshNew.available_stock || 0) - item.quantity),
                     sold_tiktok: (freshNew.sold_tiktok || 0) + item.quantity
                }).eq('id', newProductInfo.id)
                if (newError) throw newError
            }

            const { error: orderError } = await supabase.from('tiktok_orders').update({
                variation: newVariation
            }).eq('id', item.id)
            if (orderError) throw orderError

            if (oldProductInfo && newProductInfo) {
                const saleDate = new Date(item.order_date).toISOString().split('T')[0];

                const { data: salesRecord } = await supabase
                    .from('sales_orders')
                    .select('id')
                    .eq('product_id', oldProductInfo.id)
                    .eq('quantity', item.quantity)
                    .eq('platform', 'Tiktok')
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

            if (onOrderUpdate) onOrderUpdate()
            
        } catch (error: any) {
            console.error('Update Error:', error)
            alert("Failed to update variation: " + error.message)
        }
    }

    const merchandiseSubtotal = items.reduce((sum, item) => sum + (item.total_payment || 0), 0)
    const shippingPaid = items.reduce((sum, item) => sum + (item.shipping_fee_paid_by_buyer || 0), 0)
    const shippingCharged = items.reduce((sum, item) => sum + (item.estimated_shipping_fee || 0), 0)
    const shippingRebate = items.reduce((sum, item) => sum + (item.shipping_fee_rebate || 0), 0)

    const commissionFee = 0 
    const supportFee = items.reduce((sum, item) => sum + (item.support_program_fee || 0), 0)
    const serviceFee = items.reduce((sum, item) => sum + (item.service_fee || 0), 0)
    const transactionFee = items.reduce((sum, item) => sum + (item.transaction_fee || 0), 0)
    const withholdingTax = items.reduce((sum, item) => sum + (item.tax || 0), 0)

    const totalFees = commissionFee + supportFee + serviceFee + transactionFee + withholdingTax

    const estimatedOrderIncome = items.reduce((sum, item) => sum + (item.estimated_income || 0), 0)

    // Reuse the layout from ShopeeOrderDetailsPanel but adapted
    return (
        <div className="bg-card rounded-lg border shadow-sm p-6 animate-in slide-in-from-top-2 duration-200">
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
                    
                    <div className="flex items-center gap-2">
                        {isEditing ? (
                            <>
                                <Button size="sm" variant="ghost" onClick={() => setIsEditing(false)}>
                                    <X className="w-4 h-4 mr-2" /> Cancel
                                </Button>
                                <Button size="sm" onClick={handleSaveOrder} disabled={loading} className="bg-orange-600 text-white hover:bg-orange-700">
                                    {loading ? <Loader2 className="w-4 h-4 animate-spin" /> : <Save className="w-4 h-4 mr-2" />}
                                    Save Changes
                                </Button>
                            </>
                        ) : (
                            <Button variant="outline" size="sm" onClick={() => setIsEditing(true)}>
                                <Edit className="w-4 h-4 mr-2" /> Edit Order
                            </Button>
                        )}
                        <Button 
                            variant="destructive" 
                            size="sm" 
                            className="bg-red-50 text-red-600 hover:bg-red-100 border-red-200"
                            onClick={handleDeleteOrder}
                            disabled={loading}
                        >
                            <Trash2 className="w-4 h-4" />
                        </Button>
                    </div>
                </div>

                <TabsContent value="product" className="mt-0">
                    <div className="bg-card rounded-lg border p-6 shadow-sm">
                        <Table>
                            <TableHeader className="bg-muted/50">
                                <TableRow>
                                    <TableHead className="w-[50px] text-center">No.</TableHead>
                                    <TableHead>Product(s)</TableHead>
                                    <TableHead className="text-right">Unit Price</TableHead>
                                    <TableHead className="text-center">Qty</TableHead>
                                    <TableHead className="text-right">Subtotal</TableHead>
                                </TableRow>
                            </TableHeader>
                            <TableBody>
                                {items.map((item, index) => {
                                    const imageUrl = productImages[item.variation] || 
                                                    productImages[item.variation.split('#')[0].trim()]
                                    
                                    return (
                                        <TableRow key={item.id} className="hover:bg-muted/50">
                                            <TableCell className="text-center text-muted-foreground">{index + 1}</TableCell>
                                            <TableCell>
                                                <div className="flex gap-4">
                                                    <div className="h-16 w-16 rounded-md bg-muted border overflow-hidden flex-shrink-0">
                                                        {imageUrl ? (
                                                            <img src={imageUrl} alt="" className="h-full w-full object-cover" />
                                                        ) : (
                                                            <div className="h-full w-full flex items-center justify-center text-muted-foreground bg-secondary">
                                                                <Package className="h-6 w-6 opacity-20" />
                                                            </div>
                                                        )}
                                                    </div>
                                                    <div className="space-y-1">
                                                        <div className="font-medium text-foreground">{item.product_name}</div>
                                                        <div className="text-xs text-muted-foreground flex items-center gap-2">
                                                            <span className="bg-secondary px-1.5 py-0.5 rounded text-secondary-foreground">
                                                                {item.variation}
                                                            </span>
                                                            <Button 
                                                                variant="ghost" 
                                                                size="icon" 
                                                                className="h-4 w-4 text-muted-foreground hover:text-orange-600"
                                                                onClick={() => setEditingVariationId(editingVariationId === item.id ? null : item.id)}
                                                            >
                                                                <Edit className="h-3 w-3" />
                                                            </Button>
                                                        </div>
                                                        {editingVariationId === item.id && (
                                                            <ProductVariationSelector
                                                                currentVariation={item.variation}
                                                                products={products}
                                                                onSelect={(newVar) => {
                                                                    handleVariationChange(item, newVar)
                                                                    setEditingVariationId(null)
                                                                }}
                                                                onCancel={() => setEditingVariationId(null)}
                                                            />
                                                        )}
                                                    </div>
                                                </div>
                                            </TableCell>
                                            <TableCell className="text-right font-mono text-xs">
                                                ₱{(item.total_payment / item.quantity).toFixed(2)}
                                            </TableCell>
                                            <TableCell className="text-center font-mono text-xs font-bold bg-secondary/30 rounded mx-2">
                                                {item.quantity}
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

                <TabsContent value="payment" className="mt-0 space-y-6">
                    <div className="bg-card rounded-lg border p-6 shadow-sm space-y-4 max-w-3xl">
                        <div className="flex justify-between items-center pb-2 border-b border-dashed">
                            <span className="font-bold text-foreground">Merchandise Subtotal</span>
                            <span className="font-bold text-foreground">₱{merchandiseSubtotal.toFixed(2)}</span>
                        </div>
                        <Separator className="bg-border" />
                        <div className="space-y-3">
                            <div className="flex justify-between items-center text-sm">
                                <div className="flex items-center gap-2 text-muted-foreground">
                                    <Truck className="w-4 h-4" />
                                    <span>Shipping Total</span>
                                </div>
                                <span className="font-medium">₱{(shippingPaid + shippingCharged).toFixed(2)}</span>
                            </div>
                            <div className="pl-6 flex justify-between text-xs text-muted-foreground">
                                <span>Paid by Buyer</span>
                                <span>₱{shippingPaid.toFixed(2)}</span>
                            </div>
                            <div className="pl-6 flex justify-between text-xs text-muted-foreground">
                                <span>Charged to Seller</span>
                                <span className="text-red-500">₱{shippingCharged.toFixed(2)}</span>
                            </div>
                        </div>
                        <Separator className="bg-border" />
                        <div className="flex justify-between items-center font-medium text-foreground">
                            <div className="flex items-center gap-2">
                                <CreditCard className="w-4 h-4 text-muted-foreground/50" />
                                <span>Fees & Charges</span>
                            </div>
                            <span className="text-red-500">₱{totalFees.toFixed(2)}</span>
                        </div>
                        
                        <div className="bg-orange-50/50 p-4 rounded-lg border border-orange-100 flex justify-between items-center mt-4">
                            <div className="flex items-center gap-2 text-orange-700 font-bold">
                                <span>Estimated Income</span>
                                <HelpCircle className="w-4 h-4 text-orange-400" />
                            </div>
                            <span className="font-bold text-2xl text-orange-600">
                                ₱{estimatedOrderIncome.toFixed(2)}
                            </span>
                        </div>
                    </div>
                </TabsContent>

                <TabsContent value="logistic" className="mt-0">
                     <div className="grid grid-cols-1 md:grid-cols-2 gap-6">
                        <div className="bg-card rounded-lg border p-6 shadow-sm space-y-4">
                            <h3 className="font-semibold text-foreground flex items-center gap-2 mb-4">
                                <Truck className="w-4 h-4 text-orange-500" />
                                Delivery Information
                            </h3>
                            <div className="space-y-4">
                                <div className="space-y-1">
                                    <label className="text-xs font-bold text-muted-foreground uppercase tracking-wider">Status</label>
                                    {isEditing ? (
                                        <Select 
                                            value={formData.status} 
                                            onValueChange={(val) => setFormData({...formData, status: val})}
                                        >
                                            <SelectTrigger><SelectValue /></SelectTrigger>
                                            <SelectContent>
                                                <SelectItem value="Completed">Completed</SelectItem>
                                                <SelectItem value="Shipping">Shipping</SelectItem>
                                                <SelectItem value="To Ship">To Ship</SelectItem>
                                                <SelectItem value="Unpaid">Unpaid</SelectItem>
                                                <SelectItem value="Cancelled">Cancelled</SelectItem>
                                                <SelectItem value="Return/Refund">Return/Refund</SelectItem>
                                            </SelectContent>
                                        </Select>
                                    ) : (
                                        <div className="font-medium text-foreground bg-secondary/50 px-3 py-1.5 rounded-md inline-block">
                                            {formData.status}
                                        </div>
                                    )}
                                </div>
                                <div className="space-y-1">
                                    <label className="text-xs font-bold text-muted-foreground uppercase tracking-wider">Tracking Number</label>
                                    {isEditing ? (
                                        <Input value={formData.tracking_number} onChange={e => setFormData({...formData, tracking_number: e.target.value})} />
                                    ) : (
                                        <div className="font-mono text-sm">{formData.tracking_number || '-'}</div>
                                    )}
                                </div>
                                <div className="space-y-1">
                                    <label className="text-xs font-bold text-muted-foreground uppercase tracking-wider">Provider</label>
                                    {isEditing ? (
                                        <Input value={formData.shipping_provider} onChange={e => setFormData({...formData, shipping_provider: e.target.value})} />
                                    ) : (
                                        <div className="font-medium">{formData.shipping_provider || '-'}</div>
                                    )}
                                </div>
                            </div>
                        </div>

                        <div className="bg-card rounded-lg border p-6 shadow-sm space-y-4">
                            <h3 className="font-semibold text-foreground flex items-center gap-2 mb-4">
                                <MapPin className="w-4 h-4 text-blue-500" />
                                Buyer Information
                            </h3>
                             <div className="space-y-4">
                                <div className="space-y-1">
                                    <label className="text-xs font-bold text-muted-foreground uppercase tracking-wider">Username</label>
                                    {isEditing ? (
                                        <Input value={formData.buyer_username} onChange={e => setFormData({...formData, buyer_username: e.target.value})} />
                                    ) : (
                                        <div className="font-medium">{formData.buyer_username || '-'}</div>
                                    )}
                                </div>
                                <div className="space-y-1">
                                    <label className="text-xs font-bold text-muted-foreground uppercase tracking-wider">Address</label>
                                    {isEditing ? (
                                        <Textarea value={formData.buyers_address} onChange={e => setFormData({...formData, buyers_address: e.target.value})} />
                                    ) : (
                                        <div className="text-sm text-muted-foreground">{formData.buyers_address || '-'}</div>
                                    )}
                                </div>
                            </div>
                        </div>

                         <div className="bg-card rounded-lg border p-6 shadow-sm space-y-4 md:col-span-2">
                            <h3 className="font-semibold text-foreground flex items-center gap-2 mb-4">
                                <CalendarClock className="w-4 h-4 text-purple-500" />
                                Timeline
                            </h3>
                            <div className="grid grid-cols-3 gap-4">
                                 <div className="space-y-1">
                                    <label className="text-xs font-bold text-muted-foreground uppercase tracking-wider">Date Paid</label>
                                    {isEditing ? (
                                        <Input type="date" value={formData.date_paid} onChange={e => setFormData({...formData, date_paid: e.target.value})} />
                                    ) : (
                                        <div className="text-sm">{formData.date_paid ? new Date(formData.date_paid).toLocaleDateString() : '-'}</div>
                                    )}
                                </div>
                                <div className="space-y-1">
                                    <label className="text-xs font-bold text-muted-foreground uppercase tracking-wider">Date Shipped</label>
                                    {isEditing ? (
                                        <Input type="date" value={formData.date_shipped} onChange={e => setFormData({...formData, date_shipped: e.target.value})} />
                                    ) : (
                                        <div className="text-sm">{formData.date_shipped ? new Date(formData.date_shipped).toLocaleDateString() : '-'}</div>
                                    )}
                                </div>
                                <div className="space-y-1">
                                    <label className="text-xs font-bold text-muted-foreground uppercase tracking-wider">Date Completed</label>
                                    {isEditing ? (
                                        <Input type="date" value={formData.date_completed} onChange={e => setFormData({...formData, date_completed: e.target.value})} />
                                    ) : (
                                        <div className="text-sm">{formData.date_completed ? new Date(formData.date_completed).toLocaleDateString() : '-'}</div>
                                    )}
                                </div>
                            </div>
                        </div>
                     </div>
                </TabsContent>
            </Tabs>
        </div>
    )
}
