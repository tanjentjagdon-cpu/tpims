'use client'

import { Card, CardContent, CardDescription, CardHeader, CardTitle } from '@/components/ui/card'
import { Badge } from '@/components/ui/badge'
import { Button } from '@/components/ui/button'
import { Table, TableBody, TableCell, TableHead, TableHeader, TableRow } from '@/components/ui/table'
import { History, RefreshCw, Wallet, Download, Calendar, DollarSign, Package, AlertCircle } from 'lucide-react'
import { fetchFinanceAction } from '../actions'
import { useState, useEffect } from 'react'
import { Tabs, TabsContent, TabsList, TabsTrigger } from "@/components/ui/tabs"
import { Alert, AlertDescription, AlertTitle } from '@/components/ui/alert'
import { supabase } from '@/lib/supabase'

// Custom Simple Donut Chart Component
const DonutChart = ({ value, total, label, color = "#10b981" }: { value: number, total: number, label: string, color?: string }) => {
    const radius = 35
    const circumference = 2 * Math.PI * radius
    const percentage = total > 0 ? (value / total) * 100 : 0
    const strokeDasharray = `${(percentage / 100) * circumference} ${circumference}`

    return (
        <div className="relative flex items-center justify-center w-32 h-32">
            <svg className="w-full h-full transform -rotate-90">
                <circle cx="64" cy="64" r={radius} stroke="#e5e7eb" strokeWidth="8" fill="transparent" />
                <circle
                    cx="64"
                    cy="64"
                    r={radius}
                    stroke={color}
                    strokeWidth="8"
                    fill="transparent"
                    strokeDasharray={strokeDasharray}
                    strokeLinecap="round"
                    className="transition-all duration-1000 ease-out"
                />
            </svg>
            <div className="absolute flex flex-col items-center justify-center text-center">
                <span className="text-sm font-bold text-gray-700 dark:text-gray-200">₱ {(value / 1000).toFixed(1)}K</span>
                <span className="text-[10px] text-muted-foreground">{label}</span>
            </div>
        </div>
    )
}

export default function TikTokFinancePage() {
    const [loading, setLoading] = useState(false)
    const [data, setData] = useState<any>(null)
    const [activeTab, setActiveTab] = useState("settled")
    const [errorMsg, setErrorMsg] = useState<string>('')

    const getSessionToken = async () => {
        const { data: { session } } = await supabase.auth.getSession()
        return session?.access_token
    }

    const loadData = async () => {
        setLoading(true)
        setErrorMsg('')
        console.log('🔄 Starting finance sync...')

        try {
            const token = await getSessionToken()
            if (!token) {
                setErrorMsg('Session expired. Please refresh the page and log in again.')
                console.error('❌ No session token found')
                setLoading(false)
                return
            }

            const res = await fetchFinanceAction(token)
            console.log('📦 Finance sync response:', res)

            if (res.success) {
                setData(res)
                if (res.syncStats) {
                    console.log(`✅ Sync complete: ${res.syncStats.savedStatements} statements, ${res.syncStats.savedPayments} payments saved`)
                    if (res.syncStats.errors && res.syncStats.errors.length > 0) {
                        setErrorMsg(`Partial sync: ${res.syncStats.errors.join(', ')}`)
                    }
                }
            } else {
                setErrorMsg(res.error || 'Failed to sync finance data')
                console.error('❌ Finance sync failed:', res.error)
            }
        } catch (error: any) {
            console.error('❌ loadData error:', error)
            setErrorMsg(`Error: ${error.message}`)
        } finally {
            setLoading(false)
        }
    }

    useEffect(() => {
        loadData()
    }, [])

    // --- Settled Tab Logic ---
    // Get orders from finance data that have been settled
    const settledOrders = data?.settledOrders || []
    const totalSettlement = settledOrders.reduce((acc: number, curr: any) =>
        acc + parseFloat(curr.settlement_amount || curr.estimated_income || curr.total_payment || '0'), 0)
    const totalRevenue = settledOrders.reduce((acc: number, curr: any) =>
        acc + parseFloat(curr.revenue || curr.total_payment || '0'), 0)
    const totalFees = settledOrders.reduce((acc: number, curr: any) =>
        acc + parseFloat(curr.fees || curr.platform_commission || '0'), 0)
    const totalAdjustments = 0 // TikTok adjustments are separate records

    // --- To Settle Tab Logic ---
    const recentOrders = data?.recentOrders || []
    const toSettleOrders = recentOrders.filter((o: any) => ['DELIVERED', 'SHIPPED', 'IN_TRANSIT'].includes(o.order_status || o.status))
    const estimatedToSettleAmount = toSettleOrders.reduce((acc: number, curr: any) => acc + (parseFloat(curr.payment_total || '0') * 0.94), 0) // Approx deduction
    const inTransitAmount = estimatedToSettleAmount * 0.4
    const deliveredAmount = estimatedToSettleAmount * 0.6

    return (
        <div className="p-6 space-y-6 max-w-[1600px] mx-auto animate-in fade-in duration-500">
            {/* Header */}
            <div className="flex flex-col sm:flex-row items-start sm:items-center justify-between gap-4">
                <div>
                    <h1 className="text-3xl font-bold tracking-tight">Finance</h1>
                    <p className="text-muted-foreground mt-1">
                        Overview of your earnings, settlements, and payouts.
                    </p>
                </div>
                <div className="flex gap-2">
                    <Button variant="outline" size="sm" onClick={loadData} disabled={loading} className="gap-2">
                        <RefreshCw className={`h-4 w-4 ${loading ? 'animate-spin' : ''}`} />
                        Sync Data
                    </Button>
                    <Button variant="outline" size="sm" className="gap-2">
                        <Download className="h-4 w-4" /> Export
                    </Button>
                </div>
            </div>

            {/* V1 Deprecation Warning */}
            <Alert className="bg-amber-50 dark:bg-amber-950/20 border-amber-200 dark:border-amber-900/50 text-amber-900 dark:text-amber-200">
                <AlertCircle className="h-4 w-4" />
                <AlertTitle>Limited Data View</AlertTitle>
                <AlertDescription>
                    The "Unsettled Transactions" API (V1) is currently deprecated.
                    We are displaying <strong>Historical Statements</strong> and estimating <strong>Unsettled Amounts</strong> based on recent orders.
                </AlertDescription>
            </Alert>

            {/* Error Alert */}
            {errorMsg && (
                <Alert className="bg-red-50 dark:bg-red-950/20 border-red-200 dark:border-red-900/50 text-red-900 dark:text-red-200">
                    <AlertCircle className="h-4 w-4" />
                    <AlertTitle>Sync Error</AlertTitle>
                    <AlertDescription>{errorMsg}</AlertDescription>
                </Alert>
            )}


            {/* Main Tabs */}
            <Tabs defaultValue="settled" value={activeTab} onValueChange={setActiveTab} className="space-y-6">
                <TabsList className="bg-background border">
                    <TabsTrigger value="settled" className="px-6 data-[state=active]:bg-primary/10 data-[state=active]:text-primary">
                        Settled
                    </TabsTrigger>
                    <TabsTrigger value="to_settle" className="px-6 data-[state=active]:bg-primary/10 data-[state=active]:text-primary">
                        To Settle
                    </TabsTrigger>
                </TabsList>

                {/* --- Settled Tab Content --- */}
                <TabsContent value="settled" className="space-y-6">
                    {/* Summary Cards */}
                    <div className="grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-4 gap-4">
                        <Card className="shadow-none border-l-4 border-l-emerald-500">
                            <CardHeader className="p-4 pb-2">
                                <CardTitle className="text-sm font-medium text-muted-foreground flex items-center gap-2">
                                    <Wallet className="h-4 w-4" /> Total Settlement
                                </CardTitle>
                            </CardHeader>
                            <CardContent className="p-4 pt-0">
                                <div className="text-2xl font-bold">₱ {totalSettlement.toLocaleString('en-US', { minimumFractionDigits: 2 })}</div>
                            </CardContent>
                        </Card>
                        <Card className="shadow-none border-l-4 border-l-blue-500">
                            <CardHeader className="p-4 pb-2">
                                <CardTitle className="text-sm font-medium text-muted-foreground flex items-center gap-2">
                                    <DollarSign className="h-4 w-4" /> Total Revenue
                                </CardTitle>
                            </CardHeader>
                            <CardContent className="p-4 pt-0">
                                <div className="text-2xl font-bold">₱ {totalRevenue.toLocaleString('en-US', { minimumFractionDigits: 2 })}</div>
                            </CardContent>
                        </Card>
                        <Card className="shadow-none border-l-4 border-l-amber-500">
                            <CardHeader className="p-4 pb-2">
                                <CardTitle className="text-sm font-medium text-muted-foreground flex items-center gap-2">
                                    <History className="h-4 w-4" /> Total Fees
                                </CardTitle>
                            </CardHeader>
                            <CardContent className="p-4 pt-0">
                                <div className="text-2xl font-bold text-red-600">- ₱ {Math.abs(totalFees).toLocaleString('en-US', { minimumFractionDigits: 2 })}</div>
                            </CardContent>
                        </Card>
                        <Card className="shadow-none border-l-4 border-l-purple-500">
                            <CardHeader className="p-4 pb-2">
                                <CardTitle className="text-sm font-medium text-muted-foreground flex items-center gap-2">
                                    <RefreshCw className="h-4 w-4" /> Adjustments
                                </CardTitle>
                            </CardHeader>
                            <CardContent className="p-4 pt-0">
                                <div className="text-2xl font-bold">₱ {totalAdjustments.toLocaleString('en-US', { minimumFractionDigits: 2 })}</div>
                            </CardContent>
                        </Card>
                    </div>

                    {/* Filter Bar (Mock) */}
                    <div className="flex flex-wrap items-center gap-3 p-1 bg-muted/30 rounded-lg">
                        <Button variant="ghost" size="sm" className="bg-background shadow-xs border">12/01/2025 - 12/31/2025</Button>
                        <div className="flex-1" />
                        <Button variant="outline" size="sm">Select Type</Button>
                    </div>

                    {/* Table */}
                    <Card className="shadow-sm border-border/60">
                        <Table>
                            <TableHeader>
                                <TableRow className="bg-muted/30 hover:bg-muted/30">
                                    <TableHead>Statement ID</TableHead>
                                    <TableHead>Dates</TableHead>
                                    <TableHead>Revenue</TableHead>
                                    <TableHead>Fees</TableHead>
                                    <TableHead className="font-bold text-emerald-600">Settlement Amount</TableHead>
                                    <TableHead>Action</TableHead>
                                </TableRow>
                            </TableHeader>
                            <TableBody>
                                {settledOrders.length > 0 ? (
                                    settledOrders.map((st: any, i: number) => (
                                        <TableRow key={i} className="group transition-colors">
                                            <TableCell className="font-medium">
                                                <div className="flex flex-col">
                                                    <span>{st.id || st.statement_id}</span>
                                                    <Badge variant="outline" className="w-fit mt-1 text-[10px] font-normal">
                                                        {st.payment_status === 'SETTLED' ? 'Settled' : 'Processing'}
                                                    </Badge>
                                                </div>
                                            </TableCell>
                                            <TableCell className="text-xs text-muted-foreground">
                                                {st.statement_time ? new Date(st.statement_time * 1000).toLocaleDateString() : 'N/A'}
                                            </TableCell>
                                            <TableCell>₱ {parseFloat(st.revenue_amount || '0').toFixed(2)}</TableCell>
                                            <TableCell className="text-red-500 font-mono text-xs">
                                                {parseFloat(st.fee_amount || '0').toFixed(2)}
                                            </TableCell>
                                            <TableCell className="font-bold font-mono text-emerald-600">
                                                ₱ {parseFloat(st.settlement_amount || st.statement_amount?.amount).toFixed(2)}
                                            </TableCell>
                                            <TableCell>
                                                <Button variant="link" size="sm" className="h-auto p-0 text-emerald-600">View details</Button>
                                            </TableCell>
                                        </TableRow>
                                    ))
                                ) : (
                                    <TableRow>
                                        <TableCell colSpan={6} className="h-24 text-center text-muted-foreground">
                                            No settled statements found for this period.
                                        </TableCell>
                                    </TableRow>
                                )}
                            </TableBody>
                        </Table>
                    </Card>
                </TabsContent>

                {/* --- To Settle Tab Content --- */}
                <TabsContent value="to_settle" className="space-y-6">
                    <Card className="p-6 bg-gradient-to-r from-emerald-50 to-teal-50 dark:from-emerald-950/20 dark:to-teal-950/20 border-emerald-100 dark:border-emerald-900/50">
                        <div className="flex flex-col md:flex-row items-center justify-between gap-8">
                            {/* Donut Chart */}
                            <div className="flex items-center gap-8">
                                <div className="relative">
                                    <DonutChart value={estimatedToSettleAmount} total={estimatedToSettleAmount * 1.5} label="To Settle" color="#10b981" />
                                </div>
                                <div className="space-y-4">
                                    <h3 className="text-lg font-bold flex items-center gap-2">
                                        Unsettlement Status
                                        <Badge variant="secondary" className="bg-emerald-100 text-emerald-700 hover:bg-emerald-100 border-none">Live</Badge>
                                    </h3>
                                    <div className="grid grid-cols-1 gap-3 text-sm">
                                        <div className="flex items-center gap-2">
                                            <div className="w-2 h-2 rounded-full bg-emerald-500" />
                                            <span className="text-muted-foreground">In Progress:</span>
                                            <span className="font-bold text-emerald-600">₱ {deliveredAmount.toLocaleString('en-US', { minimumFractionDigits: 2 })}</span>
                                        </div>
                                        <div className="flex items-center gap-2">
                                            <div className="w-2 h-2 rounded-full bg-blue-400" />
                                            <span className="text-muted-foreground">Waiting for Delivery:</span>
                                            <span className="font-bold text-blue-500">₱ {inTransitAmount.toLocaleString('en-US', { minimumFractionDigits: 2 })}</span>
                                        </div>
                                    </div>
                                    <p className="text-xs text-muted-foreground max-w-sm leading-relaxed">
                                        * Estimated based on recent orders. Orders are typically settled 2-14 days after delivery.
                                    </p>
                                </div>
                            </div>

                            {/* Info Box */}
                            <div className="hidden md:block w-px h-32 bg-border/50" />

                            <div className="flex-1 space-y-4">
                                <h4 className="font-medium text-sm flex items-center gap-2 text-muted-foreground">
                                    <Calendar className="h-4 w-4" /> Settlement Period
                                </h4>
                                <div className="space-y-3">
                                    <div className="bg-white/50 dark:bg-black/20 p-3 rounded-md text-sm border border-emerald-100 dark:border-emerald-900/50">
                                        <span className="font-semibold text-emerald-700 dark:text-emerald-400">Waiting for Delivery:</span> Payments held until package delivery confirms.
                                    </div>
                                    <div className="bg-white/50 dark:bg-black/20 p-3 rounded-md text-sm border border-emerald-100 dark:border-emerald-900/50">
                                        <span className="font-semibold text-blue-700 dark:text-blue-400">Settlement in Progress:</span> Funds released ~24h after settlement.
                                    </div>
                                </div>
                            </div>
                        </div>
                    </Card>

                    {/* Table */}
                    <Card className="shadow-sm border-border/60">
                        <div className="p-4 border-b flex items-center gap-2 bg-muted/10">
                            <h3 className="font-semibold text-sm">Recent Unsettled Orders</h3>
                        </div>
                        <Table>
                            <TableHeader>
                                <TableRow className="bg-muted/30 hover:bg-muted/30">
                                    <TableHead>Order ID/Adjustment ID</TableHead>
                                    <TableHead>Order creation date</TableHead>
                                    <TableHead>Est. settled time</TableHead>
                                    <TableHead>Unsettlement reasons</TableHead>
                                    <TableHead className="text-right">Amount</TableHead>
                                    <TableHead className="text-center">Action</TableHead>
                                </TableRow>
                            </TableHeader>
                            <TableBody>
                                {toSettleOrders.length > 0 ? (
                                    toSettleOrders.map((order: any, i: number) => {
                                        const createDate = new Date(parseInt(order.create_time || order.created_at || Date.now()))
                                        const estSettleDate = new Date(createDate)
                                        estSettleDate.setDate(estSettleDate.getDate() + 7)

                                        return (
                                            <TableRow key={i} className="group transition-colors">
                                                <TableCell className="font-medium">
                                                    <div className="flex items-center gap-2">
                                                        <span>{order.order_id}</span>
                                                        <Badge variant="secondary" className="text-[10px] font-normal text-muted-foreground bg-gray-100">Order</Badge>
                                                    </div>
                                                </TableCell>
                                                <TableCell className="text-xs text-muted-foreground">
                                                    {createDate.toLocaleDateString()}
                                                </TableCell>
                                                <TableCell className="text-xs text-muted-foreground">
                                                    {estSettleDate.toLocaleDateString()}
                                                </TableCell>
                                                <TableCell>
                                                    <Badge variant="outline" className="bg-amber-50 text-amber-700 border-amber-200 text-[10px] whitespace-nowrap">
                                                        Order delivered and awaiting settlement
                                                    </Badge>
                                                </TableCell>
                                                <TableCell className="text-right font-mono font-bold">
                                                    ₱ {parseFloat(order.payment_total || order.total_payment || '0').toFixed(2)}
                                                </TableCell>
                                                <TableCell className="text-center">
                                                    <Button variant="link" size="sm" className="h-auto p-0 text-teal-600 hover:text-teal-700">
                                                        View details
                                                    </Button>
                                                </TableCell>
                                            </TableRow>
                                        )
                                    })
                                ) : (
                                    <TableRow>
                                        <TableCell colSpan={6} className="h-24 text-center text-muted-foreground">
                                            No recent items to settle.
                                        </TableCell>
                                    </TableRow>
                                )}
                            </TableBody>
                        </Table>
                    </Card>
                </TabsContent>
            </Tabs>
        </div>
    )
}

