'use client'

import * as React from 'react'
import { supabase } from '@/lib/supabase'
import { cn } from '@/lib/utils'
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
import { Plus, Search, Receipt, Package, LayoutGrid, ShoppingBag } from 'lucide-react'
import { Button } from '@/components/ui/button'
import {
    Select,
    SelectContent,
    SelectItem,
    SelectTrigger,
    SelectValue,
} from "@/components/ui/select"
import { ExtraExpenseDialog } from '@/components/inventory/extra-expense-dialog'

interface Expense {
    id: string
    description: string
    quantity: number
    unit_cost: number
    amount: number
    category: string
    expense_date: string
    product_id: string
    products?: {
        fabric_name: string
        fabric_type: string
        variation: string
    }
}

export default function ExpensesPage() {
    const [expenses, setExpenses] = React.useState<Expense[]>([])
    const [loading, setLoading] = React.useState(true)
    const [search, setSearch] = React.useState('')
    const [filterType, setFilterType] = React.useState('all')

    // Pagination
    const [currentPage, setCurrentPage] = React.useState(1)
    const itemsPerPage = 100
    const fetchExpenses = React.useCallback(async () => {
        try {
            setLoading(true)
            const { data, error } = await supabase
                .from('expenses')
                .select('*, products(fabric_name, fabric_type, variation)')
                .order('expense_date', { ascending: false })

            if (error) throw error
            setExpenses(data || [])
        } catch (error: any) {
            console.error('Error fetching expenses:', error)
            if (error.message) console.error('Error message:', error.message)
            if (error.details) console.error('Error details:', error.details)
        } finally {
            setLoading(false)
        }
    }, [])

    React.useEffect(() => {
        fetchExpenses()
    }, [fetchExpenses])

    const totalExpenses = expenses.reduce((sum, e) => sum + e.amount, 0)
    const totalFabricSpend = expenses.filter(e => e.product_id).reduce((sum, e) => sum + e.amount, 0)
    
    const shopeeCategories = ['Shopee Ads', 'Shopee Deduction', 'Return/Refund', 'Order Deduction']
    const totalShopeeSpend = expenses
        .filter(e => shopeeCategories.includes(e.category) || e.description.toLowerCase().includes('shopee') || e.description.toLowerCase().includes('order deduction'))
        .reduce((sum, e) => sum + e.amount, 0)

    const totalOtherSpend = totalExpenses - totalFabricSpend - totalShopeeSpend

    // Filtered logs for the table
    const filteredLogs = expenses.filter(e => {
        const fabricName = e.products ? `${e.products.fabric_name} ${e.products.fabric_type} ${e.products.variation}` : ''
        const matchesSearch = e.description.toLowerCase().includes(search.toLowerCase()) ||
            e.category.toLowerCase().includes(search.toLowerCase()) ||
            fabricName.toLowerCase().includes(search.toLowerCase())

        if (!matchesSearch) return false

        // Filter Logic
        const isShopee = shopeeCategories.includes(e.category) || e.description.toLowerCase().includes('shopee') || e.description.toLowerCase().includes('order deduction')
        const isFabric = !!e.product_id

        if (filterType === 'shopee') return isShopee
        if (filterType === 'fabric') return isFabric
        if (filterType === 'others') return !isShopee && !isFabric

        return true
    })

    const totalPages = Math.ceil(filteredLogs.length / itemsPerPage)
    const paginatedLogs = filteredLogs.slice(
        (currentPage - 1) * itemsPerPage,
        currentPage * itemsPerPage
    )

    return (
        <div className="space-y-8">
            {/* Header */}
            <div className="flex flex-col gap-4 sm:flex-row sm:items-center sm:justify-between">
                <div>
                    <h2 className="text-3xl font-bold tracking-tight text-foreground font-serif">Expenses</h2>
                    <p className="text-muted-foreground italic">Monitor all business costs and expenditures.</p>
                </div>
                <div className="flex gap-2">
                    <Button variant="outline" onClick={fetchExpenses} size="sm">
                        Refresh
                    </Button>
                    <ExtraExpenseDialog onSuccess={fetchExpenses} />
                </div>
            </div>

            {/* Overall Stats */}
            <div className="grid grid-cols-1 md:grid-cols-4 gap-4">
                <div className="rounded-2xl border border-border bg-card p-5 shadow-sm bg-gradient-to-br from-card to-secondary/10">
                    <div className="flex items-center gap-2 mb-2">
                        <div className="p-1.5 rounded-lg bg-primary/10 text-primary">
                            <Receipt className="h-4 w-4" />
                        </div>
                        <span className="text-[10px] font-bold text-muted-foreground uppercase tracking-wider">Total Overall Spend</span>
                    </div>
                    <div className="text-2xl font-bold font-mono">₱{totalExpenses.toLocaleString(undefined, { minimumFractionDigits: 2 })}</div>
                </div>

                <div className="rounded-2xl border border-border bg-card p-5 shadow-sm bg-gradient-to-br from-card to-orange-500/5">
                    <div className="flex items-center gap-2 mb-2">
                        <div className="p-1.5 rounded-lg bg-orange-100 text-orange-600">
                            <Package className="h-4 w-4" />
                        </div>
                        <span className="text-[10px] font-bold text-muted-foreground uppercase tracking-wider">Fabric Cost</span>
                    </div>
                    <div className="text-2xl font-bold font-mono text-orange-600">₱{totalFabricSpend.toLocaleString(undefined, { minimumFractionDigits: 2 })}</div>
                </div>

                <div className="rounded-2xl border border-border bg-card p-5 shadow-sm bg-gradient-to-br from-card to-red-500/5">
                    <div className="flex items-center gap-2 mb-2">
                        <div className="p-1.5 rounded-lg bg-red-100 text-red-600">
                            <ShoppingBag className="h-4 w-4" />
                        </div>
                        <span className="text-[10px] font-bold text-muted-foreground uppercase tracking-wider">Shopee Expenses</span>
                    </div>
                    <div className="text-2xl font-bold font-mono text-red-600">₱{totalShopeeSpend.toLocaleString(undefined, { minimumFractionDigits: 2 })}</div>
                </div>

                <div className="rounded-2xl border border-border bg-card p-5 shadow-sm bg-gradient-to-br from-card to-emerald-500/5">
                    <div className="flex items-center gap-2 mb-2">
                        <div className="p-1.5 rounded-lg bg-emerald-100 text-emerald-600">
                            <LayoutGrid className="h-4 w-4" />
                        </div>
                        <span className="text-[10px] font-bold text-muted-foreground uppercase tracking-wider">Other Expenses</span>
                    </div>
                    <div className="text-2xl font-bold font-mono text-emerald-600">₱{totalOtherSpend.toLocaleString(undefined, { minimumFractionDigits: 2 })}</div>
                </div>
            </div>

            {/* Detailed Table Section */}
            <section className="space-y-4">
                <div className="flex items-center gap-4">
                    <div className="relative flex-1 max-w-sm">
                        <Search className="absolute left-2.5 top-2.5 h-4 w-4 text-muted-foreground" />
                        <Input
                            placeholder="Find logs by name, category, or fabric..."
                            className="pl-8 text-sm h-9"
                            value={search}
                            onChange={(e) => {
                                setSearch(e.target.value)
                                setCurrentPage(1)
                            }}
                        />
                    </div>

                    <Select value={filterType} onValueChange={(val) => { setFilterType(val); setCurrentPage(1); }}>
                        <SelectTrigger className="w-[180px]">
                            <SelectValue placeholder="Filter by Type" />
                        </SelectTrigger>
                        <SelectContent>
                            <SelectItem value="all">All Expenses</SelectItem>
                            <SelectItem value="fabric">Fabric Cost</SelectItem>
                            <SelectItem value="shopee">Shopee Expenses</SelectItem>
                            <SelectItem value="others">Other Expenses</SelectItem>
                        </SelectContent>
                    </Select>

                    <h3 className="text-sm font-bold uppercase tracking-widest text-muted-foreground ml-auto">
                        Transaction Logs
                    </h3>
                </div>

                <div className="rounded-xl border border-border bg-card shadow-md flex flex-col h-[calc(100vh-280px)]">
                    <div className="flex-1 overflow-auto relative">
                        <Table>
                            <TableHeader className="bg-secondary/50 sticky top-0 z-10 backdrop-blur-sm">
                                <TableRow>
                                    <TableHead className="font-bold text-[11px] uppercase tracking-wider">Date</TableHead>
                                    <TableHead className="font-bold text-[11px] uppercase tracking-wider">Expense Details</TableHead>
                                    <TableHead className="font-bold text-[11px] uppercase tracking-wider text-center">Qty</TableHead>
                                    <TableHead className="font-bold text-[11px] uppercase tracking-wider text-right">Cost</TableHead>
                                    <TableHead className="font-bold text-[11px] uppercase tracking-wider text-right">Total Amount</TableHead>
                                </TableRow>
                            </TableHeader>
                            <TableBody>
                                {loading ? (
                                    <TableRow>
                                        <TableCell colSpan={5} className="text-center py-20 animate-pulse">Fetching transactions...</TableCell>
                                    </TableRow>
                                ) : paginatedLogs.length === 0 ? (
                                    <TableRow>
                                        <TableCell colSpan={5} className="text-center py-20 text-muted-foreground italic">No transactions found matching your criteria.</TableCell>
                                    </TableRow>
                                ) : (
                                    paginatedLogs.map((expense) => (
                                        <TableRow key={expense.id} className="hover:bg-secondary/20 transition-colors group">
                                            <TableCell className="text-xs font-mono text-muted-foreground">
                                                {new Date(expense.expense_date).toLocaleDateString()}
                                            </TableCell>
                                            <TableCell>
                                                <div className="flex flex-col">
                                                    <span className="font-bold text-sm">
                                                        {expense.products
                                                            ? (expense.description === 'Restock' || expense.description === 'RESTOCK SUMMARY' ? 'RESTOCK SUMMARY' : expense.description)
                                                            : expense.category}
                                                    </span>
                                                    <div className="flex items-center gap-2 mt-1.5">
                                                        {expense.products ? (
                                                            <div className={cn(
                                                                "px-2 py-0.5 rounded-md text-[10px] font-bold uppercase tracking-tight flex items-center gap-1.5 border",
                                                                expense.products.fabric_type === 'Printed'
                                                                    ? "bg-orange-50 text-orange-700 border-orange-100"
                                                                    : "bg-emerald-50 text-emerald-700 border-emerald-100"
                                                            )}>
                                                                <span className="opacity-70">{expense.products.fabric_name}</span>
                                                                <div className={cn(
                                                                    "w-1 h-1 rounded-full",
                                                                    expense.products.fabric_type === 'Printed' ? "bg-orange-400" : "bg-emerald-400"
                                                                )} />
                                                                <span>{expense.products.fabric_type}</span>
                                                                <div className="w-1 h-1 rounded-full bg-muted-foreground/30" />
                                                                <span className="text-foreground">{expense.products.variation}</span>
                                                            </div>
                                                        ) : (
                                                            <Badge variant="outline" className="text-[10px] font-bold uppercase bg-secondary/30">
                                                                {expense.description}
                                                            </Badge>
                                                        )}
                                                    </div>
                                                </div>
                                            </TableCell>
                                            <TableCell className="text-center font-mono text-xs">
                                                {expense.quantity > 0 ? expense.quantity : '-'}
                                            </TableCell>
                                            <TableCell className="text-right font-mono text-xs text-muted-foreground">
                                                {expense.unit_cost > 0 ? `₱${expense.unit_cost.toFixed(2)}` : '-'}
                                            </TableCell>
                                            <TableCell className="text-right font-bold font-mono text-primary">
                                                ₱{expense.amount.toFixed(2)}
                                            </TableCell>
                                        </TableRow>
                                    ))
                                )}
                            </TableBody>
                        </Table>
                    </div>

                    {/* Pagination Controls */}
                    <div className="border-t border-border p-4 bg-secondary/20 flex items-center justify-between">
                        <p className="text-xs text-muted-foreground">
                            Showing <span className="font-medium text-foreground">{(currentPage - 1) * itemsPerPage + 1}</span> to <span className="font-medium text-foreground">{Math.min(currentPage * itemsPerPage, filteredLogs.length)}</span> of <span className="font-medium text-foreground">{filteredLogs.length}</span> results
                        </p>
                        <div className="flex gap-2">
                            <Button
                                variant="outline"
                                size="sm"
                                onClick={() => setCurrentPage(p => Math.max(1, p - 1))}
                                disabled={currentPage === 1}
                                className="h-8 text-xs"
                            >
                                Previous
                            </Button>
                            <Button
                                variant="outline"
                                size="sm"
                                onClick={() => setCurrentPage(p => Math.min(totalPages, p + 1))}
                                disabled={currentPage === totalPages}
                                className="h-8 text-xs"
                            >
                                Next
                            </Button>
                        </div>
                    </div>
                </div>
            </section>
        </div>
    )
}

