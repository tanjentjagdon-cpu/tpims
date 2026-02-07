import { Button } from "@/components/ui/button"
import {
    Dialog,
    DialogContent,
    DialogDescription,
    DialogFooter,
    DialogHeader,
    DialogTitle,
    DialogTrigger,
} from "@/components/ui/dialog"
import { Tabs, TabsContent, TabsList, TabsTrigger } from "@/components/ui/tabs"
import { Loader2, Plus, Package, Receipt, Truck, FileText } from "lucide-react"
import { useState } from "react"
import { parseShopeeOrderText, mergeParsedOrders, ParsedShopeeOrder } from "@/lib/shopee-parser"
import { supabase } from "@/lib/supabase"

interface ImportOrderDialogProps {
    onSuccess: () => void
    triggerClassName?: string
    triggerSize?: "default" | "sm" | "lg" | "icon"
    triggerVariant?: "default" | "destructive" | "outline" | "secondary" | "ghost" | "link"
}

export function ImportOrderDialog({ 
    onSuccess, 
    triggerClassName, 
    triggerSize = "default", 
    triggerVariant 
}: ImportOrderDialogProps) {
    const [open, setOpen] = useState(false)
    const [loading, setLoading] = useState(false)
    
    // Tab States
    const [activeTab, setActiveTab] = useState("product")
    const [productText, setProductText] = useState("")
    const [orderText, setOrderText] = useState("")
    const [paymentText, setPaymentText] = useState("")
    const [logisticText, setLogisticText] = useState("")

    const processSingleOrder = async (parsed: ParsedShopeeOrder, user: any, silent: boolean = false) => {
        // 1. Check if order exists BEFORE deleting
        const { data: existingOrder } = await supabase
            .from('shopee_orders')
            .select('order_id')
            .eq('order_id', parsed.order_id)
            .maybeSingle()
        
        // Check if Inventory was ALREADY deducted (via Sales Orders)
        // This protects against "Manual Delete -> Re-import" double deduction
        const { data: existingSales } = await supabase
            .from('sales_orders')
            .select('id')
            .eq('order_id', parsed.order_id)
            .limit(1)
        
        const isInventoryAlreadyDeducted = existingSales && existingSales.length > 0;

        // Prepare upsert payload
        const rows = parsed.items.map((item, index) => {
            // Only apply order-level financials to the FIRST item to avoid double-counting in aggregations
            const isFirst = index === 0;

            return {
                user_id: user.id, // Required for RLS
                order_id: parsed.order_id,
                status: parsed.status,
                payout_status: parsed.payout_status,
                buyers_address: parsed.buyer_address,
                order_date: parsed.order_date,

                // New Fields
                tracking_number: parsed.tracking_number,
                shipping_provider: parsed.shipping_provider,
                buyer_username: parsed.buyer_username,
                payment_method: parsed.payment_method,
                voucher_code: parsed.voucher_code,
                
                // Order History (Only on first item, as JSONB)
                order_history: isFirst ? parsed.order_history : [],
                shipping_history: isFirst ? parsed.shipping_history : [],

                // Dates
                date_paid: parsed.date_paid,
                date_shipped: parsed.date_shipped,
                date_completed: parsed.date_completed,

                product_name: item.product_name,
                variation: item.variation,
                quantity: item.quantity,

                // Item specific payment (approximate as price * qty)
                total_payment: item.price * item.quantity,

                // Order Level Financials (Only on first item)
                estimated_income: isFirst ? parsed.totals.estimated_income : 0,
                shopee_voucher: isFirst ? parsed.shopee_voucher : 0,

                // Detailed Fees (Only on first item)
                shipping_fee_paid_by_buyer: isFirst ? parsed.fees.shipping_fee_paid_by_buyer : 0,
                estimated_shipping_fee: isFirst ? parsed.fees.estimated_shipping_fee : 0,
                shipping_fee_rebate: isFirst ? parsed.fees.shipping_fee_rebate : 0,
                commission_fee: isFirst ? parsed.fees.commission_fee : 0,
                support_program_fee: isFirst ? parsed.fees.support_program_fee : 0,
                service_fee: isFirst ? parsed.fees.service_fee : 0,
                transaction_fee: isFirst ? parsed.fees.transaction_fee : 0,
                tax: isFirst ? parsed.fees.tax : 0,
                merchandise_subtotal: isFirst ? parsed.totals.merchandise_subtotal : 0,
            }
        })

        // Upsert into Supabase
        const { error: deleteError } = await supabase
            .from('shopee_orders')
            .delete()
            .eq('order_id', parsed.order_id)

        if (deleteError) {
            console.error('Delete Error:', JSON.stringify(deleteError, null, 2))
            throw deleteError
        }

        const { error: insertError } = await supabase
            .from('shopee_orders')
            .insert(rows)

        if (insertError) {
            console.error('Insert Error:', JSON.stringify(insertError, null, 2))
            throw insertError
        }

        // 2. Inventory Deduction Logic
        // Only deduct if:
        // a) Order did not exist previously (New Import)
        // b) Status is NOT 'Cancelled' or 'Return/Refund'
        // c) Inventory was NOT already deducted (Checked via sales_orders)
        
        // Robust Cancellation Detection
        const statusLower = parsed.status?.toLowerCase() || '';
        
        // AGGRESSIVE CHECK
        const isCancelledOrReturn = 
            statusLower.includes('cancelled') || 
            statusLower.includes('return') || 
            statusLower.includes('refund') ||
            statusLower.includes('failed') ||
            parsed.status === 'Cancelled' || 
            parsed.status === 'Return/Refund';

        if (isCancelledOrReturn) {
             if (!silent) alert(`System detected this order as ${parsed.status || 'Cancelled/Return'}. Inventory will NOT be deducted.`);
             return { success: true, message: 'Skipped inventory (Cancelled)' };
        }

        if (!existingOrder && !isCancelledOrReturn && !isInventoryAlreadyDeducted) {
            console.log(`[${parsed.order_id}] New Order detected. Processing inventory deduction...`);
            
            // Fetch all products to match against
            const { data: products } = await supabase
                .from('products')
                .select('id, variation, available_stock, sold_shopee, fabric_name')
            
            if (products) {
                // Aggregate items by product
                const productUpdates = new Map<string, { match: any, quantity: number }>();

                for (const item of parsed.items) {
                     const targetVar = item.variation.trim().toLowerCase();
                     const targetName = item.product_name.toLowerCase();
                     
                     // 1. Find all candidates with matching variation
                     const candidates = products.filter(p => {
                        const dbVar = p.variation.trim().toLowerCase();
                        if (dbVar === targetVar) return true;
                        const cleanDbVar = dbVar.split('#')[0].trim();
                        if (cleanDbVar === targetVar) return true;
                        return false;
                     });

                     let match = null;

                     if (candidates.length === 1) {
                         match = candidates[0];
                     } else if (candidates.length > 1) {
                         match = candidates.find(c => targetName.includes(c.fabric_name.toLowerCase()));
                         if (!match) match = candidates[0];
                     }

                    if (match) {
                        const existing = productUpdates.get(match.id);
                        if (existing) {
                            existing.quantity += item.quantity;
                        } else {
                            productUpdates.set(match.id, { match, quantity: item.quantity });
                        }
                    } else {
                         console.warn(`Product not found for variation: ${item.variation}`);
                    }
                }

                // Execute updates
                const deductionPromises = Array.from(productUpdates.values()).map(async ({ match, quantity }) => {
                        const { data: freshProduct } = await supabase
                            .from('products')
                            .select('available_stock, sold_shopee')
                            .eq('id', match.id)
                            .single();
                        
                        if (!freshProduct) return;

                        const currentStock = freshProduct.available_stock || 0;
                        const currentSold = freshProduct.sold_shopee || 0;
                        const newStock = Math.max(0, currentStock - quantity);
                        const newSold = currentSold + quantity;

                        const { error: updateError } = await supabase
                            .from('products')
                            .update({ 
                                available_stock: newStock,
                                sold_shopee: newSold
                            })
                            .eq('id', match.id);
                            
                        if (!updateError) {
                            await supabase
                                .from('sales_orders')
                                .insert({
                                     product_id: match.id,
                                     quantity: quantity,
                                     platform: 'Shopee',
                                     sale_date: parsed.order_date || new Date().toISOString(),
                                     user_id: user.id,
                                     order_id: parsed.order_id
                                 });
                        }
                });

                await Promise.all(deductionPromises);
            }
        } else {
            if (isInventoryAlreadyDeducted && !silent) {
                alert("Notice: Inventory deduction skipped because this Order ID was already processed in Sales History.");
            }
        }
        
        return { success: true, message: 'Imported successfully' };
    }

    const handleImport = async () => {
        setLoading(true)
        try {
            const { data: { user }, error: userError } = await supabase.auth.getUser()
            if (userError || !user) throw new Error("User not authenticated")

            const orders: ParsedShopeeOrder[] = []
            
            if (productText.trim()) orders.push(parseShopeeOrderText(productText))
            if (orderText.trim()) orders.push(parseShopeeOrderText(orderText))
            if (paymentText.trim()) orders.push(parseShopeeOrderText(paymentText))
            if (logisticText.trim()) orders.push(parseShopeeOrderText(logisticText))
            
            if (orders.length === 0) {
                return;
            }

            const parsed = mergeParsedOrders(orders)

            if (!parsed.order_id) throw new Error("Could not find Order ID in any of the tabs.")
            if (parsed.items.length === 0) throw new Error("Could not find any products in the text.")

            await processSingleOrder(parsed, user, false)
            
            alert(`Successfully imported order ${parsed.order_id} with ${parsed.items.length} items.`)

            // Reset
            setProductText("")
            setOrderText("")
            setPaymentText("")
            setLogisticText("")
            setActiveTab("product")
            setOpen(false)
            onSuccess()

        } catch (error: any) {
            console.error('Import Error:', error)
            alert(error.message || "Something went wrong parsing the order.")
        } finally {
            setLoading(false)
        }
    }
    
    const hasAnyText = productText.trim() || orderText.trim() || paymentText.trim() || logisticText.trim()

    return (
        <Dialog open={open} onOpenChange={setOpen}>
            <DialogTrigger asChild>
                <Button 
                    variant={triggerVariant} 
                    size={triggerSize}
                    className={triggerClassName || "bg-orange-600 hover:bg-orange-700 text-white shadow-lg shadow-orange-200"}
                >
                    <Plus className="mr-2 h-4 w-4" /> Import Orders
                </Button>
            </DialogTrigger>
            <DialogContent className="sm:max-w-[700px] max-h-[90vh] overflow-y-auto">
                <DialogHeader>
                    <DialogTitle>Import Shopee Order</DialogTitle>
                    <DialogDescription>
                        Paste the relevant sections from Shopee Order Details into the tabs below.
                    </DialogDescription>
                </DialogHeader>

                <Tabs value={activeTab} onValueChange={setActiveTab} className="w-full">
                    <TabsList className="grid w-full grid-cols-4">
                        <TabsTrigger value="product" className="gap-2"><Package className="w-4 h-4"/> Products</TabsTrigger>
                        <TabsTrigger value="order" className="gap-2"><FileText className="w-4 h-4"/> Order</TabsTrigger>
                        <TabsTrigger value="payment" className="gap-2"><Receipt className="w-4 h-4"/> Payment</TabsTrigger>
                        <TabsTrigger value="logistic" className="gap-2"><Truck className="w-4 h-4"/> Logistic</TabsTrigger>
                    </TabsList>
                    
                    <div className="mt-4">
                        <TabsContent value="product" className="space-y-2">
                            <p className="text-xs text-muted-foreground">Paste the <strong>Product(s)</strong> table section here.</p>
                            <textarea
                                placeholder="Paste product details..."
                                className="flex min-h-[300px] w-full rounded-md border border-input bg-background px-3 py-2 text-sm font-mono focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-ring"
                                value={productText}
                                onChange={(e) => setProductText(e.target.value)}
                            />
                        </TabsContent>
                        
                        <TabsContent value="order" className="space-y-2">
                             <p className="text-xs text-muted-foreground">Paste <strong>Order ID, Status, Address, and Dates</strong> here.</p>
                            <textarea
                                placeholder="Paste order details..."
                                className="flex min-h-[300px] w-full rounded-md border border-input bg-background px-3 py-2 text-sm font-mono focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-ring"
                                value={orderText}
                                onChange={(e) => setOrderText(e.target.value)}
                            />
                        </TabsContent>

                        <TabsContent value="payment" className="space-y-2">
                             <p className="text-xs text-muted-foreground">Paste <strong>Payment Information</strong> section here.</p>
                            <textarea
                                placeholder="Paste payment info..."
                                className="flex min-h-[300px] w-full rounded-md border border-input bg-background px-3 py-2 text-sm font-mono focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-ring"
                                value={paymentText}
                                onChange={(e) => setPaymentText(e.target.value)}
                            />
                        </TabsContent>
                        
                        <TabsContent value="logistic" className="space-y-2">
                             <p className="text-xs text-muted-foreground">Paste <strong>Logistic Information</strong> section here.</p>
                            <textarea
                                placeholder="Paste logistic info..."
                                className="flex min-h-[300px] w-full rounded-md border border-input bg-background px-3 py-2 text-sm font-mono focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-ring"
                                value={logisticText}
                                onChange={(e) => setLogisticText(e.target.value)}
                            />
                        </TabsContent>
                    </div>
                </Tabs>

                <DialogFooter>
                    <Button variant="outline" onClick={() => setOpen(false)}>
                        Cancel
                    </Button>
                    <Button onClick={handleImport} disabled={loading || !hasAnyText}>
                        {loading ? (
                            <>
                                <Loader2 className="mr-2 h-4 w-4 animate-spin" />
                                Importing...
                            </>
                        ) : (
                            "Import Order"
                        )}
                    </Button>
                </DialogFooter>
            </DialogContent>
        </Dialog>
    )
}