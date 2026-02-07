'use client'

import * as React from 'react'
import { Plus } from 'lucide-react'
import { useForm } from 'react-hook-form'
import { zodResolver } from '@hookform/resolvers/zod'
import * as z from 'zod'
import { supabase } from '@/lib/supabase'
import {
    Dialog,
    DialogContent,
    DialogDescription,
    DialogFooter,
    DialogHeader,
    DialogTitle,
    DialogTrigger,
} from '@/components/ui/dialog'
import { Button } from '@/components/ui/button'
import { Input } from '@/components/ui/input'
import { Label } from '@/components/ui/label'

const formSchema = z.object({
    quantity: z.preprocess((val) => (val === '' ? undefined : parseFloat(val as string)), z.number().min(0, "Quantity must be positive")),
    cost_price: z.preprocess((val) => (val === '' ? undefined : parseFloat(val as string)), z.number().min(0, "Cost must be positive")),
    restock_date: z.string().min(1, 'Date is required'),
})

type FormInput = z.input<typeof formSchema>
type FormOutput = z.output<typeof formSchema>

interface RestockDialogProps {
    productId: string
    productName: string
    currentCost: number
    onSuccess?: () => void
}

export function RestockDialog({ productId, productName, currentCost, onSuccess }: RestockDialogProps) {
    const [open, setOpen] = React.useState(false)
    const [loading, setLoading] = React.useState(false)

    const form = useForm<FormInput>({
        resolver: zodResolver(formSchema),
        defaultValues: {
            quantity: '0',
            cost_price: currentCost.toString(),
            restock_date: new Date().toISOString().split('T')[0],
        },
    })

    async function onSubmit(data: any) {
        const validatedData = data as FormOutput;
        try {
            setLoading(true)
            const { data: { user } } = await supabase.auth.getUser()

            if (!user) throw new Error('Not authenticated')

            // 1. Add to restock_history
            const { error: historyError } = await supabase.from('restock_history').insert({
                product_id: productId,
                quantity: validatedData.quantity,
                cost_at_restock: validatedData.cost_price,
                restock_date: validatedData.restock_date,
                user_id: user.id
            })

            if (historyError) throw historyError

            // 2. Add to expenses
            const { error: expenseError } = await supabase.from('expenses').insert({
                description: 'RESTOCK SUMMARY', // "RESTOCK SUMMARY" is now the description (Badge)
                amount: validatedData.quantity * validatedData.cost_price,
                quantity: validatedData.quantity,
                unit_cost: validatedData.cost_price,
                category: productName, // Product Name is the category (Bold Title)
                expense_date: validatedData.restock_date,
                product_id: productId,
                user_id: user.id
            })

            if (expenseError) throw expenseError

            // 3. Fetch current stock to update accurately
            const { data: product, error: fetchError } = await supabase
                .from('products')
                .select('total_stock, available_stock')
                .eq('id', productId)
                .single()

            if (fetchError) throw fetchError

            // 3. Update products table
            const { error: updateError } = await supabase.from('products').update({
                total_stock: (product?.total_stock || 0) + validatedData.quantity,
                available_stock: (product?.available_stock || 0) + validatedData.quantity,
                cost_price: validatedData.cost_price // Update current cost to the latest restock cost
            }).eq('id', productId)

            if (updateError) throw updateError

            setOpen(false)
            form.reset()
            onSuccess?.()
        } catch (error) {
            console.error('Error restocking:', error)
            alert('Failed to add stock. Please try again.')
        } finally {
            setLoading(false)
        }
    }

    return (
        <Dialog open={open} onOpenChange={setOpen}>
            <DialogTrigger asChild>
                <Button variant="secondary" className="flex-1 font-bold uppercase tracking-widest text-[11px] h-9 rounded-xl border-2 border-orange-100/50 hover:bg-orange-100 hover:text-orange-900 transition-all">
                    Restock Product
                </Button>
            </DialogTrigger>
            <DialogContent className="sm:max-w-[425px]">
                <DialogHeader>
                    <DialogTitle>Restock Item</DialogTitle>
                    <DialogDescription>
                        Add new stock for <span className="font-bold text-foreground">{productName}</span>.
                    </DialogDescription>
                </DialogHeader>
                <form onSubmit={form.handleSubmit(onSubmit)} className="space-y-6 py-4">
                    <div className="grid gap-2">
                        <Label htmlFor="restock_date" className="font-bold text-xs uppercase tracking-wider text-muted-foreground">Restock Date</Label>
                        <Input
                            id="restock_date"
                            type="date"
                            className="rounded-xl border-2 focus-visible:ring-orange-500"
                            {...form.register('restock_date')}
                        />
                    </div>
                    <div className="grid grid-cols-2 gap-4">
                        <div className="grid gap-2">
                            <Label htmlFor="quantity" className="font-bold text-xs uppercase tracking-wider text-muted-foreground">Qty to Add</Label>
                            <Input
                                id="quantity"
                                type="number"
                                step="0.01"
                                placeholder="0.00"
                                className="rounded-xl border-2 focus-visible:ring-orange-500 font-mono font-bold"
                                {...form.register('quantity')}
                            />
                        </div>
                        <div className="grid gap-2">
                            <Label htmlFor="cost_price" className="font-bold text-xs uppercase tracking-wider text-muted-foreground">Cost per Qty (₱)</Label>
                            <Input
                                id="cost_price"
                                type="number"
                                step="0.01"
                                placeholder="0.00"
                                className="rounded-xl border-2 focus-visible:ring-orange-500 font-mono font-bold"
                                {...form.register('cost_price')}
                            />
                        </div>
                    </div>
                    <DialogFooter>
                        <Button type="submit" disabled={loading} className="w-full h-11 rounded-xl bg-orange-600 hover:bg-orange-700 font-bold uppercase tracking-widest">
                            {loading ? 'Processing...' : 'Confirm Restock'}
                        </Button>
                    </DialogFooter>
                </form>
            </DialogContent>
        </Dialog>
    )
}
