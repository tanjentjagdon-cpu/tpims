'use client'

import * as React from 'react'
import { History, ShoppingCart, RefreshCw } from 'lucide-react'
import { supabase } from '@/lib/supabase'
import {
    Dialog,
    DialogContent,
    DialogDescription,
    DialogHeader,
    DialogTitle,
    DialogTrigger,
} from '@/components/ui/dialog'
import {
    Table,
    TableBody,
    TableCell,
    TableHead,
    TableHeader,
    TableRow,
} from '@/components/ui/table'
import { Badge } from '@/components/ui/badge'
import { ScrollArea } from '@/components/ui/scroll-area'
import { cn } from '@/lib/utils'

interface HistoryItem {
    id: string
    type: 'sale' | 'restock'
    date: string
    quantity: number
    platform?: string
    cost?: number
}

interface ProductHistoryDialogProps {
    productId: string
    productName: string
}

export function ProductHistoryDialog({ productId, productName }: ProductHistoryDialogProps) {
    const [open, setOpen] = React.useState(false)
    const [loading, setLoading] = React.useState(false)
    const [history, setHistory] = React.useState<HistoryItem[]>([])

    const fetchHistory = React.useCallback(async () => {
        try {
            setLoading(true)

            // Fetch Sales
            const { data: sales, error: salesError } = await supabase
                .from('sales_orders')
                .select('*')
                .eq('product_id', productId)
                .order('sale_date', { ascending: false })

            if (salesError) throw salesError

            // Fetch Restocks
            const { data: restocks, error: restocksError } = await supabase
                .from('restock_history')
                .select('*')
                .eq('product_id', productId)
                .order('restock_date', { ascending: false })

            if (restocksError) throw restocksError

            // Combine and format
            const combined: HistoryItem[] = [
                ...(sales || []).map(s => ({
                    id: s.id,
                    type: 'sale' as const,
                    date: s.sale_date,
                    quantity: s.quantity,
                    platform: s.platform
                })),
                ...(restocks || []).map(r => ({
                    id: r.id,
                    type: 'restock' as const,
                    date: r.restock_date,
                    quantity: r.quantity,
                    cost: r.cost_at_restock
                }))
            ].sort((a, b) => new Date(b.date).getTime() - new Date(a.date).getTime())

            setHistory(combined)
        } catch (error) {
            console.error('Error fetching history:', error)
        } finally {
            setLoading(false)
        }
    }, [productId])

    React.useEffect(() => {
        if (open) fetchHistory()
    }, [open, fetchHistory])

    return (
        <Dialog open={open} onOpenChange={setOpen}>
            <DialogTrigger asChild>
                <button
                    className="p-2 rounded-xl bg-secondary/50 border border-border text-muted-foreground hover:text-primary hover:border-primary transition-all shadow-sm"
                    title="View History"
                >
                    <History className="h-4 w-4" />
                </button>
            </DialogTrigger>
            <DialogContent className="sm:max-w-[600px] max-h-[80vh] flex flex-col">
                <DialogHeader>
                    <DialogTitle className="flex items-center gap-2">
                        <History className="h-5 w-5 text-primary" />
                        Inventory History
                    </DialogTitle>
                    <DialogDescription>
                        Timeline of sales and restock events for <span className="font-bold text-foreground">{productName}</span>.
                    </DialogDescription>
                </DialogHeader>

                <div className="flex-1 overflow-hidden mt-4 border border-border rounded-xl">
                    <ScrollArea className="h-[400px]">
                        <Table>
                            <TableHeader className="sticky top-0 bg-secondary z-20">
                                <TableRow>
                                    <TableHead className="w-[120px]">Date</TableHead>
                                    <TableHead>Activity</TableHead>
                                    <TableHead className="text-right">Qty</TableHead>
                                </TableRow>
                            </TableHeader>
                            <TableBody>
                                {loading ? (
                                    <TableRow>
                                        <TableCell colSpan={3} className="text-center py-10 animate-pulse">Loading history...</TableCell>
                                    </TableRow>
                                ) : history.length === 0 ? (
                                    <TableRow>
                                        <TableCell colSpan={3} className="text-center py-10 text-muted-foreground italic">No history recorded yet.</TableCell>
                                    </TableRow>
                                ) : (
                                    history.map((item) => (
                                        <TableRow key={item.id} className="group hover:bg-secondary/30 transition-colors">
                                            <TableCell className="text-xs font-mono text-muted-foreground">
                                                {new Date(item.date).toLocaleDateString()}
                                            </TableCell>
                                            <TableCell>
                                                <div className="flex items-center gap-2">
                                                    {item.type === 'sale' ? (
                                                        <div className="flex items-center gap-2">
                                                            <div className="p-1 rounded bg-orange-100 dark:bg-orange-900/30">
                                                                <ShoppingCart className="h-3 w-3 text-orange-600" />
                                                            </div>
                                                            <div className="flex flex-col">
                                                                <span className="text-sm font-semibold">Sale ({item.platform})</span>
                                                                <span className="text-[10px] text-muted-foreground">Deducted from stock</span>
                                                            </div>
                                                        </div>
                                                    ) : (
                                                        <div className="flex items-center gap-2">
                                                            <div className="p-1 rounded bg-emerald-100 dark:bg-emerald-900/30">
                                                                <RefreshCw className="h-3 w-3 text-emerald-600" />
                                                            </div>
                                                            <div className="flex flex-col">
                                                                <span className="text-sm font-semibold">Restock</span>
                                                                <span className="text-[10px] text-muted-foreground">Cost: ₱{item.cost?.toFixed(2)}</span>
                                                            </div>
                                                        </div>
                                                    )}
                                                </div>
                                            </TableCell>
                                            <TableCell className={cn(
                                                "text-right font-bold font-mono",
                                                item.type === 'sale' ? "text-orange-600" : "text-emerald-600"
                                            )}>
                                                {item.type === 'sale' ? "-" : "+"}{item.quantity}y
                                            </TableCell>
                                        </TableRow>
                                    ))
                                )}
                            </TableBody>
                        </Table>
                    </ScrollArea>
                </div>
            </DialogContent>
        </Dialog>
    )
}
