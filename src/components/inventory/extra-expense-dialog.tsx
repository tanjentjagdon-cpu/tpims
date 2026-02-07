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
import {
    Select,
    SelectContent,
    SelectItem,
    SelectTrigger,
    SelectValue,
} from "@/components/ui/select"

const formSchema = z.object({
    description: z.string().min(1, 'Description is required'),
    amount: z.preprocess((val) => (val === '' ? undefined : parseFloat(val as string)), z.number().min(0, "Amount must be positive")),
    category: z.string().min(1, 'Category is required'),
    expense_date: z.string().min(1, 'Date is required'),
})

type FormInput = z.input<typeof formSchema>
type FormOutput = z.output<typeof formSchema>

interface ExtraExpenseDialogProps {
    onSuccess?: () => void
}

const CATEGORIES = [
    "Utilities",
    "Rent",
    "Supplies",
    "Marketing",
    "Shipping Fees",
    "Others"
]

export function ExtraExpenseDialog({ onSuccess }: ExtraExpenseDialogProps) {
    const [open, setOpen] = React.useState(false)
    const [loading, setLoading] = React.useState(false)

    const form = useForm<FormInput>({
        resolver: zodResolver(formSchema),
        defaultValues: {
            description: '',
            amount: '0' as any,
            category: 'Others',
            expense_date: new Date().toISOString().split('T')[0],
        },
    })

    async function onSubmit(data: any) {
        const validatedData = data as FormOutput;
        try {
            setLoading(true)
            const { data: { user } } = await supabase.auth.getUser()

            if (!user) throw new Error('Not authenticated')

            const { error } = await supabase.from('expenses').insert({
                description: validatedData.description,
                amount: validatedData.amount,
                category: validatedData.category,
                expense_date: validatedData.expense_date,
                user_id: user.id,
                quantity: 0,
                unit_cost: 0,
                product_id: null
            })

            if (error) throw error

            setOpen(false)
            form.reset()
            onSuccess?.()
        } catch (error) {
            console.error('Error logging expense:', error)
            alert('Failed to log expense. Please try again.')
        } finally {
            setLoading(false)
        }
    }

    return (
        <Dialog open={open} onOpenChange={setOpen}>
            <DialogTrigger asChild>
                <Button className="bg-primary hover:bg-primary/90 text-[11px] font-bold uppercase" size="sm">
                    <Plus className="mr-2 h-4 w-4" /> Log Extra Expense
                </Button>
            </DialogTrigger>
            <DialogContent className="sm:max-w-[425px]">
                <DialogHeader>
                    <DialogTitle>Log Extra Expense</DialogTitle>
                    <DialogDescription>
                        Record non-fabric business expenditures.
                    </DialogDescription>
                </DialogHeader>
                <form onSubmit={form.handleSubmit(onSubmit)} className="space-y-4 py-4">
                    <div className="grid gap-2">
                        <Label htmlFor="description">Expense Name / Description</Label>
                        <Input
                            id="description"
                            placeholder="e.g. January Electricity Bill"
                            {...form.register('description')}
                        />
                    </div>

                    <div className="grid grid-cols-2 gap-4">
                        <div className="grid gap-2">
                            <Label htmlFor="category">Category</Label>
                            <Select
                                onValueChange={(value) => form.setValue('category', value)}
                                defaultValue={form.getValues('category')}
                            >
                                <SelectTrigger>
                                    <SelectValue placeholder="Select category" />
                                </SelectTrigger>
                                <SelectContent>
                                    {CATEGORIES.map(cat => (
                                        <SelectItem key={cat} value={cat}>{cat}</SelectItem>
                                    ))}
                                </SelectContent>
                            </Select>
                        </div>
                        <div className="grid gap-2">
                            <Label htmlFor="expense_date">Date</Label>
                            <Input
                                id="expense_date"
                                type="date"
                                {...form.register('expense_date')}
                            />
                        </div>
                    </div>

                    <div className="grid gap-2">
                        <Label htmlFor="amount">Total Amount (₱)</Label>
                        <Input
                            id="amount"
                            type="number"
                            step="0.01"
                            placeholder="0.00"
                            {...form.register('amount')}
                        />
                    </div>

                    <DialogFooter>
                        <Button type="submit" disabled={loading} className="w-full">
                            {loading ? 'Processing...' : 'Save Expense'}
                        </Button>
                    </DialogFooter>
                </form>
            </DialogContent>
        </Dialog>
    )
}
