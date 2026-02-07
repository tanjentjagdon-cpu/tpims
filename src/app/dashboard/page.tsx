'use client'

import { useEffect, useState } from 'react'
import { supabase } from '@/lib/supabase'
import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card"

export default function OverviewPage() {
    const [stats, setStats] = useState({
        totalProducts: 0,
        lowStockItems: 0,
        netIncomeShopee: 0,
        loading: true
    })

    useEffect(() => {
        async function fetchStats() {
            try {
                // Product Stats
                const { data: products } = await supabase.from('products').select('available_stock')
                const totalProducts = products?.length || 0
                const lowStockItems = products?.filter(p => p.available_stock < 50).length || 0

                // Net Income Shopee (Sum of estimated_income)
                // Note: Need to be careful not to double count if we have multiple items per order.
                // However, our parser assigns 'estimated_income' ONLY to the first item (index 0) during import.
                // So summing the column directly is safe IF the import logic was followed.
                // Let's verify: `estimated_income` is 0 for subsequent items in `ImportOrderDialog`.
                const { data: orders } = await supabase.from('shopee_orders').select('estimated_income')
                const netIncomeShopee = orders?.reduce((sum, order) => sum + (Number(order.estimated_income) || 0), 0) || 0

                setStats({
                    totalProducts,
                    lowStockItems,
                    netIncomeShopee,
                    loading: false
                })
            } catch (error) {
                console.error("Error fetching dashboard stats:", error)
            }
        }

        fetchStats()
    }, [])

    return (
        <div className="space-y-6">
            <div>
                <h2 className="text-3xl font-bold tracking-tight text-foreground font-serif">Dashboard Overview</h2>
                <p className="text-muted-foreground font-sans">Welcome back! Here's what's happening with your inventory today.</p>
            </div>

            <div className="grid gap-4 md:grid-cols-3">
                <Card className="rounded-xl border border-border bg-card shadow-md">
                    <CardHeader className="flex flex-row items-center justify-between space-y-0 pb-2">
                        <CardTitle className="text-sm font-medium text-muted-foreground uppercase tracking-wider">
                            Total Products
                        </CardTitle>
                    </CardHeader>
                    <CardContent>
                        <div className="text-2xl font-bold text-foreground">
                            {stats.loading ? "..." : stats.totalProducts}
                        </div>
                    </CardContent>
                </Card>

                <Card className="rounded-xl border border-border bg-card shadow-md">
                    <CardHeader className="flex flex-row items-center justify-between space-y-0 pb-2">
                        <CardTitle className="text-sm font-medium text-muted-foreground uppercase tracking-wider">
                            Low Stock Items
                        </CardTitle>
                    </CardHeader>
                    <CardContent>
                        <div className="text-2xl font-bold text-destructive">
                            {stats.loading ? "..." : stats.lowStockItems}
                        </div>
                    </CardContent>
                </Card>

                <Card className="rounded-xl border border-border bg-card shadow-md">
                    <CardHeader className="flex flex-row items-center justify-between space-y-0 pb-2">
                        <CardTitle className="text-sm font-medium text-muted-foreground uppercase tracking-wider">
                            NET INCOME SHOPEE
                        </CardTitle>
                    </CardHeader>
                    <CardContent>
                        <div className="text-2xl font-bold text-green-600">
                            {stats.loading ? "..." : `₱${stats.netIncomeShopee.toLocaleString(undefined, { minimumFractionDigits: 2, maximumFractionDigits: 2 })}`}
                        </div>
                    </CardContent>
                </Card>
            </div>

            <div className="rounded-xl border border-border bg-card p-8 text-center hidden">
                <div className="mx-auto flex h-16 w-16 items-center justify-center rounded-full bg-secondary text-primary">
                    <svg xmlns="http://www.w3.org/2000/svg" fill="none" viewBox="0 0 24 24" strokeWidth={1.5} stroke="currentColor" className="w-8 h-8">
                        <path strokeLinecap="round" strokeLinejoin="round" d="M3.75 3v11.25A2.25 2.25 0 0 0 6 16.5h2.25M3.75 3h-1.5m1.5 0h16.5m0 0h1.5m-1.5 0v11.25A2.25 2.25 0 0 1 18 16.5h-2.25m-7.5 0h7.5m-7.5 0-1 3m8.5-3 1 3m0 0h.25m-12.75 0h.25" />
                    </svg>
                </div>
                <h3 className="mt-4 text-lg font-semibold text-foreground">No data available yet</h3>
                <p className="mt-2 text-sm text-muted-foreground">Start by adding your products and expenses to see your statistics here.</p>
            </div>
        </div>
    )
}
