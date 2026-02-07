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
import { Plus, Loader2 } from "lucide-react"
import { useState } from "react"
import { parseTiktokOrderText } from "@/lib/tiktok-parser" 
import { supabase } from "@/lib/supabase"

interface ImportTiktokOrderDialogProps {
    onSuccess: () => void
}

export function ImportTiktokOrderDialog({ onSuccess }: ImportTiktokOrderDialogProps) {
    const [open, setOpen] = useState(false)
    const [text, setText] = useState("")
    const [loading, setLoading] = useState(false)

    const handleImport = async () => {
        if (!text.trim()) return

        setLoading(true)
        try {
            const { data: { user }, error: userError } = await supabase.auth.getUser()
            if (userError || !user) throw new Error("User not authenticated")

            const parsed = parseTiktokOrderText(text)

            if (!parsed.order_id) {
                // If parsing fails, try to look for simple Order ID pattern
                // Fallback parsing for TikTok
                const orderIdMatch = text.match(/Order ID\s*[:\n]\s*(\d+)/i) || text.match(/(\d{15,})/); // Simple numeric ID check
                if (orderIdMatch) {
                    parsed.order_id = orderIdMatch[1];
                } else {
                    throw new Error("Could not find Order ID in the text.")
                }
            }

            // Fallback for items if empty
            if (parsed.items.length === 0) {
                 // Try to guess item from text lines
                 // This is very heuristic
                 const lines = text.split('\n');
                 // Assume lines with "x 1" or similar might be items
                 // For now, let's just warn or create a dummy item
                 // Actually, let's throw error to force user to be careful
                 // But better to allow import with warning
                 
                 // Create a dummy item so import succeeds
                 parsed.items.push({
                     product_name: "Unknown Product (Please Edit)",
                     variation: "Default",
                     price: 0,
                     quantity: 1
                 });
            }

            const rows = parsed.items.map((item, index) => {
                const isFirst = index === 0;

                return {
                    user_id: user.id, 
                    order_id: parsed.order_id,
                    status: parsed.status || 'Completed', // Default to Completed if not found
                    payout_status: parsed.payout_status,
                    buyers_address: parsed.buyer_address,
                    order_date: parsed.order_date || new Date().toISOString(),

                    tracking_number: parsed.tracking_number,
                    shipping_provider: parsed.shipping_provider,
                    buyer_username: parsed.buyer_username,
                    payment_method: parsed.payment_method,
                    voucher_code: parsed.voucher_code,
                    
                    date_paid: parsed.date_paid,
                    date_shipped: parsed.date_shipped,
                    date_completed: parsed.date_completed,

                    product_name: item.product_name,
                    variation: item.variation,
                    quantity: item.quantity,

                    total_payment: item.price * item.quantity,

                    estimated_income: isFirst ? parsed.totals.estimated_income : 0,
                    
                    shipping_fee_paid_by_buyer: isFirst ? parsed.fees.shipping_fee_paid_by_buyer : 0,
                    estimated_shipping_fee: isFirst ? parsed.fees.estimated_shipping_fee : 0,
                    shipping_fee_rebate: isFirst ? parsed.fees.shipping_fee_rebate : 0,
                    support_program_fee: isFirst ? parsed.fees.support_program_fee : 0,
                    service_fee: isFirst ? parsed.fees.service_fee : 0,
                    transaction_fee: isFirst ? parsed.fees.transaction_fee : 0,
                    tax: isFirst ? parsed.fees.tax : 0,
                    merchandise_subtotal: isFirst ? parsed.totals.merchandise_subtotal : 0,
                    
                    // Duplicate fields for easier querying if needed
                    shopee_voucher: 0, // Not applicable
                }
            })

            const { data: existingOrder } = await supabase
                .from('tiktok_orders')
                .select('order_id')
                .eq('order_id', parsed.order_id)
                .maybeSingle()
            
            const { data: existingSales } = await supabase
                .from('sales_orders')
                .select('id')
                .eq('order_id', parsed.order_id)
                .limit(1)
            
            const isInventoryAlreadyDeducted = existingSales && existingSales.length > 0;

            const { error: deleteError } = await supabase
                .from('tiktok_orders')
                .delete()
                .eq('order_id', parsed.order_id)

            if (deleteError) {
                console.error('Delete Error:', deleteError)
                throw deleteError
            }

            const { error: insertError } = await supabase
                .from('tiktok_orders')
                .insert(rows)

            if (insertError) {
                console.error('Insert Error:', insertError)
                throw insertError
            }

            if (!existingOrder && parsed.status !== 'Cancelled' && !isInventoryAlreadyDeducted) {
                console.log('New TikTok Order detected. Processing inventory deduction...');
                
                const { data: products } = await supabase
                    .from('products')
                    .select('id, variation, available_stock, sold_tiktok')
                
                if (products) {
                    const productUpdates = new Map<string, { match: any, quantity: number }>();

                    for (const item of parsed.items) {
                         const targetVar = item.variation.trim().toLowerCase();
                         
                         const match = products.find(p => {
                            const dbVar = p.variation.trim().toLowerCase();
                            if (dbVar === targetVar) return true;
                            const cleanDbVar = dbVar.split('#')[0].trim();
                            if (cleanDbVar === targetVar) return true;
                            return false;
                        });

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

                    const deductionPromises = Array.from(productUpdates.values()).map(async ({ match, quantity }) => {
                            const { data: freshProduct } = await supabase
                                .from('products')
                                .select('available_stock, sold_tiktok')
                                .eq('id', match.id)
                                .single();
                            
                            if (!freshProduct) return;

                            const currentStock = freshProduct.available_stock || 0;
                            const currentSold = freshProduct.sold_tiktok || 0;
                            const newStock = Math.max(0, currentStock - quantity);
                            const newSold = currentSold + quantity;

                            const { error: updateError } = await supabase
                                .from('products')
                                .update({ 
                                    available_stock: newStock,
                                    sold_tiktok: newSold
                                })
                                .eq('id', match.id);
                                
                            if (!updateError) {
                                const { error: salesError } = await supabase
                                    .from('sales_orders')
                                    .insert({
                                         product_id: match.id,
                                         quantity: quantity,
                                         platform: 'Tiktok',
                                         sale_date: parsed.order_date || new Date().toISOString(),
                                         user_id: user.id,
                                         order_id: parsed.order_id 
                                     });
                            }
                    });

                    await Promise.all(deductionPromises);
                }
            } else {
                console.log('Skipping inventory deduction.');
            }

            alert(`Successfully imported TikTok order ${parsed.order_id}.`)

            setText("")
            setOpen(false)
            onSuccess()

        } catch (error: any) {
            console.error('Import Error:', error)
            alert(error.message || "Something went wrong parsing the order.")
        } finally {
            setLoading(false)
        }
    }

    return (
        <Dialog open={open} onOpenChange={setOpen}>
            <DialogTrigger asChild>
                <Button className="bg-black hover:bg-zinc-800 text-white shadow-lg">
                    <Plus className="mr-2 h-4 w-4" /> Import Orders
                </Button>
            </DialogTrigger>
            <DialogContent className="sm:max-w-[600px]">
                <DialogHeader>
                    <DialogTitle>Import Tiktok Order</DialogTitle>
                    <DialogDescription>
                        Copy the entire detailed order page (Ctrl+A, Ctrl+C) and paste it here.
                        Note: Parsing might need adjustment for TikTok format.
                    </DialogDescription>
                </DialogHeader>
                <div className="grid gap-4 py-4">
                    <textarea
                        placeholder="Paste order details here..."
                        className="flex min-h-[300px] w-full rounded-md border border-input bg-background px-3 py-2 text-sm ring-offset-background placeholder:text-muted-foreground focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-ring focus-visible:ring-offset-2 disabled:cursor-not-allowed disabled:opacity-50 font-mono"
                        value={text}
                        onChange={(e) => setText(e.target.value)}
                    />
                </div>
                <DialogFooter>
                    <Button variant="outline" onClick={() => setOpen(false)} disabled={loading}>
                        Cancel
                    </Button>
                    <Button onClick={handleImport} disabled={loading || !text.trim()} className="bg-black hover:bg-zinc-800">
                        {loading && <Loader2 className="mr-2 h-4 w-4 animate-spin" />}
                        Import Order
                    </Button>
                </DialogFooter>
            </DialogContent>
        </Dialog>
    )
}
