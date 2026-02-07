
'use client'

import { useState, useEffect, useRef, useMemo } from 'react'
import { supabase } from '@/lib/supabase'
import { Card, CardContent, CardHeader, CardTitle } from '@/components/ui/card'
import { Button } from '@/components/ui/button'
import { Input } from '@/components/ui/input'
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from "@/components/ui/select"
import { Table, TableBody, TableCell, TableHead, TableHeader, TableRow } from '@/components/ui/table'
import { Badge } from '@/components/ui/badge'
import { Loader2, Upload, FileSpreadsheet, ArrowUpRight, ArrowDownLeft, Wallet, Search, ChevronLeft, ChevronRight, RefreshCcw, ClipboardCheck } from 'lucide-react'
import * as XLSX from 'xlsx'
import {
    Dialog,
    DialogContent,
    DialogDescription,
    DialogHeader,
    DialogTitle,
    DialogTrigger,
} from "@/components/ui/dialog"
import { Textarea } from "@/components/ui/textarea"
import { parseShopeeSummaryText } from '@/lib/shopee-summary-parser'

import { DatePickerWithRange } from "@/components/ui/date-picker-with-range"
import { DateRange } from "react-day-picker"

interface ShopeeTransaction {
    id: string
    transaction_date: string
    transaction_type: string
    description: string
    order_id: string | null
    money_direction: string
    amount: number
    status: string
    wallet_balance: number
}

export default function ShopeeIncomePage() {
    const [transactions, setTransactions] = useState<ShopeeTransaction[]>([])
    
    const [selectedType, setSelectedType] = useState('all')
    const [searchOrderId, setSearchOrderId] = useState('')
    const [dateRange, setDateRange] = useState<DateRange | undefined>()
    const [currentPage, setCurrentPage] = useState(1)
    const ITEMS_PER_PAGE = 20

    const [loading, setLoading] = useState(true)
    const [uploading, setUploading] = useState(false)
    const [syncing, setSyncing] = useState(false)
    const fileInputRef = useRef<HTMLInputElement>(null)

    // Verification State
    const [verifyOpen, setVerifyOpen] = useState(false)
    const [verifyText, setVerifyText] = useState('')
    const verifyResult = useMemo(() => {
        if (!verifyText.trim()) return null
        const parsed = parseShopeeSummaryText(verifyText)
        return parsed
    }, [verifyText])

    useEffect(() => {
        fetchTransactions()
    }, [])

    const syncMissingExpenses = async () => {
        if (!confirm('This will scan all past Shopee transactions and add any missing deductions/ads to your Expenses. Continue?')) return

        setSyncing(true)
        try {
            const { data: { user } } = await supabase.auth.getUser()
            if (!user) {
                alert('User not found')
                return
            }

            // 1. Get all negative shopee transactions
            const { data: shopeeTxns, error: shopeeError } = await supabase
                .from('shopee_transactions')
                .select('*')
                .lt('amount', 0)
                // Exclude withdrawals
                .not('transaction_type', 'ilike', '%withdrawal%')
            
            if (shopeeError) throw shopeeError
            if (!shopeeTxns || shopeeTxns.length === 0) {
                alert('No negative transactions found to sync.')
                return
            }

            // 2. Get existing expenses to check for duplicates and category mismatches
            // Fetch only relevant categories to optimize
            const { data: existingExpenses, error: expenseError } = await supabase
                .from('expenses')
                .select('id, description, amount, expense_date, category')
                .in('category', ['Shopee Ads', 'Return/Refund', 'Shopee Deduction', 'Order Deduction'])
            
            if (expenseError) throw expenseError

            // Create a map of signatures: "description|amount|date" -> Array of { id, category }
            const getDateStr = (dateStr: string) => {
                // If dateStr is full ISO (YYYY-MM-DDTHH:mm:ss), split T
                // If just YYYY-MM-DD, it works too.
                return dateStr.split('T')[0]
            }

            const existingMap = new Map<string, { id: string, category: string }[]>()
            
            existingExpenses?.forEach(e => {
                const sig = `${(e.description || '').trim().toLowerCase()}|${Number(e.amount).toFixed(2)}|${getDateStr(e.expense_date)}`
                const list = existingMap.get(sig) || []
                list.push({ id: e.id, category: e.category })
                existingMap.set(sig, list)
            })

            const toInsert: any[] = []
            const toUpdate: { id: string, category: string }[] = []
            
            shopeeTxns.forEach(t => {
                const amount = Math.abs(t.amount)
                const dateStr = getDateStr(t.transaction_date)
                const desc = (t.description || '').trim()
                const descLower = desc.toLowerCase()
                // Use the same signature format
                const sig = `${descLower}|${amount.toFixed(2)}|${dateStr}`

                let intendedCategory = 'Shopee Deduction' // Default
                const type = (t.transaction_type || '').toLowerCase()
                
                if (descLower.includes('top up') || descLower.includes('ads')) {
                    intendedCategory = 'Shopee Ads'
                } else if (type.includes('refund') || descLower.includes('refund')) {
                    intendedCategory = 'Return/Refund'
                } else if (type.includes('adjustment') || descLower.includes('adjustment')) {
                    intendedCategory = 'Shopee Deduction'
                } else if ((type.includes('order income') || type.includes('income from order') || descLower.includes('income from order')) && t.amount < 0) {
                    intendedCategory = 'Order Deduction'
                }

                // Check if we have an available existing record for this signature
                const existingList = existingMap.get(sig)
                
                if (existingList && existingList.length > 0) {
                     // Consume one existing record
                     const existing = existingList.shift()! // Remove first element
                     
                     if (existing.category !== intendedCategory) {
                         // Found match but wrong category
                         toUpdate.push({ id: existing.id, category: intendedCategory })
                     }
                } else {
                     // No more existing records for this signature -> New Transaction
                     toInsert.push({
                         description: desc,
                         amount: amount,
                         category: intendedCategory,
                         expense_date: t.transaction_date, // Pass full timestamp, PG handles cast to date if needed
                         user_id: user.id,
                         quantity: 1,
                         unit_cost: amount,
                         product_id: null
                     })
                }
            })

            let message = ''

            if (toInsert.length > 0) {
                // Batch insert (chunk if too big? 1000 is safe)
                const { error } = await supabase.from('expenses').insert(toInsert)
                if (error) throw error
                message += `Synced ${toInsert.length} new expenses. `
            }

            if (toUpdate.length > 0) {
                // Update existing categories
                // Doing parallel updates for speed
                await Promise.all(toUpdate.map(item => 
                    supabase.from('expenses').update({ category: item.category }).eq('id', item.id)
                ))
                message += `Updated ${toUpdate.length} miscategorized expenses.`
            }

            if (message) {
                alert(`Success! Imported ${newTransactions.length} new transactions.\nSkipped ${skippedCount} duplicates.\n\nDetails: ` + message)
            } else {
                if (skippedCount > 0) {
                    alert(`Import complete. No new transactions added.\nSkipped ${skippedCount} duplicates.`)
                } else {
                    alert('All expenses are already up to date.')
                }
            }

        } catch (error: any) {
            console.error('Sync error:', error)
            alert('Error syncing expenses: ' + error.message)
        } finally {
            setSyncing(false)
        }
    }

    const fetchTransactions = async () => {
        setLoading(true)
        
        let allData: ShopeeTransaction[] = []
        let page = 0
        const pageSize = 1000
        let hasMore = true

        while (hasMore) {
            const { data, error } = await supabase
                .from('shopee_transactions')
                .select('*')
                .order('transaction_date', { ascending: false })
                .range(page * pageSize, (page + 1) * pageSize - 1)

            if (error) {
                console.error('Error fetching transactions:', error)
                break
            }

            if (data) {
                allData = [...allData, ...data]
                if (data.length < pageSize) {
                    hasMore = false
                } else {
                    page++
                }
            } else {
                hasMore = false
            }
        }

        setTransactions(allData)
        setLoading(false)
    }

    // Filter Logic
    const filteredTransactions = useMemo(() => {
        let filtered = transactions

        // Date Filter
        if (dateRange?.from) {
            const startDate = new Date(dateRange.from)
            startDate.setHours(0, 0, 0, 0)
            
            let endDate: Date
            if (dateRange.to) {
                endDate = new Date(dateRange.to)
            } else {
                endDate = new Date(dateRange.from)
            }
            endDate.setHours(23, 59, 59, 999)
            
            filtered = filtered.filter(t => {
                const d = new Date(t.transaction_date)
                return d >= startDate && d <= endDate
            })
        }

        // Type Filter
        if (selectedType !== 'all') {
            if (selectedType === 'others') {
                const mainTypes = ['order income', 'income from order', 'withdrawal', 'adjustment', 'refund']
                filtered = filtered.filter(t => !mainTypes.some(mt => t.transaction_type?.toLowerCase().includes(mt)))
            } else if (selectedType === 'order income') {
                filtered = filtered.filter(t => 
                    t.transaction_type?.toLowerCase().includes('order income') || 
                    t.transaction_type?.toLowerCase().includes('income from order')
                )
            } else {
                filtered = filtered.filter(t => t.transaction_type?.toLowerCase().includes(selectedType))
            }
        }

        // Order ID Filter
        if (searchOrderId.trim()) {
            const query = searchOrderId.toLowerCase()
            filtered = filtered.filter(t => t.order_id?.toLowerCase().includes(query))
        }

        return filtered
    }, [transactions, selectedType, searchOrderId, dateRange])

    // Reset pagination when filters change
    useEffect(() => {
        setCurrentPage(1)
    }, [selectedType, searchOrderId, dateRange])

    // Pagination Logic
    const paginatedTransactions = useMemo(() => {
        const start = (currentPage - 1) * ITEMS_PER_PAGE
        return filteredTransactions.slice(start, start + ITEMS_PER_PAGE)
    }, [filteredTransactions, currentPage])

    const totalPages = Math.ceil(filteredTransactions.length / ITEMS_PER_PAGE)

    // Summary Logic
    const summary = useMemo(() => {
        let moneyIn = 0
        let moneyOut = 0
        let balance = 0
        const typeCounts: Record<string, number> = {}
        const breakdown: Record<string, { in: number, out: number }> = {}

        if (filteredTransactions.length > 0) {
            balance = filteredTransactions[0].wallet_balance
        }

        filteredTransactions.forEach(t => {
            if (t.amount > 0) moneyIn += t.amount
            else moneyOut += Math.abs(t.amount)

            let type = t.transaction_type || 'Unknown'
            
            // Normalize variants
            const typeLower = type.toLowerCase()
            if (typeLower.includes('income from order') || typeLower.includes('order income')) {
                type = 'Order Income'
            }

            // Override type for negative Order Income
            if (type === 'Order Income' && t.amount < 0) {
                type = 'Order Deduction'
            }

            // Count per type
            typeCounts[type] = (typeCounts[type] || 0) + 1

            // Money flow breakdown
            if (!breakdown[type]) {
                breakdown[type] = { in: 0, out: 0 }
            }
            
            if (t.amount > 0) {
                breakdown[type].in += t.amount
            } else {
                breakdown[type].out += Math.abs(t.amount)
            }
        })

        return {
            totalIncome: moneyIn - moneyOut,
            moneyIn,
            moneyOut,
            currentBalance: balance,
            totalTransactions: filteredTransactions.length,
            typeBreakdown: typeCounts,
            breakdown // Added this field
        }
    }, [filteredTransactions])

    const handleFileUpload = async (e: React.ChangeEvent<HTMLInputElement>) => {
        const file = e.target.files?.[0]
        if (!file) return

        setUploading(true)
        try {
            const data = await file.arrayBuffer()
            const workbook = XLSX.read(data)
            const sheetName = workbook.SheetNames[0]
            const sheet = workbook.Sheets[sheetName]
            // Use header: 1 to get arrays, defval: '' to keep empty cells, raw: false to get formatted strings
            const jsonData = XLSX.utils.sheet_to_json(sheet, { header: 1, defval: '', raw: false }) as any[][]

            // Skip until we find the header row
            let headerIndex = -1
            for (let i = 0; i < jsonData.length; i++) {
                const row = jsonData[i]
                if (row.includes('Transaction Type') && row.includes('Amount')) {
                    headerIndex = i
                    break
                }
            }

            if (headerIndex === -1) {
                alert('Invalid file format. Could not find header row.')
                setUploading(false)
                return
            }

            const rows = jsonData.slice(headerIndex + 1)
            const parsedTransactions = []
            let lastDate = ''

            for (const row of rows) {
                // Check if row is empty or invalid
                if (!row || row.length < 5) continue

                // Determine columns based on observed shift
                // Headers: Date, Transaction Type, Description, Order ID, Money Direction, Amount, Status, Balance
                // If Date is present, it is at index 0.
                // If Date is missing (merged), index 0 might be Transaction Type.
                
                let date = row[0]
                let type, desc, orderId, direction, amount, status, balance

                // Heuristic: Check if row[0] is a Date
                // If it contains "Order Income", "Withdrawal", etc., it's not a date
                const isDate = (val: any) => {
                    if (typeof val !== 'string') return false
                    // Check for YYYY-MM-DD
                    if (/\d{4}-\d{2}-\d{2}/.test(val)) return true
                    // Check for MMM DD, YYYY (e.g., Jan 17, 2026)
                    if (/[A-Za-z]{3}\s+\d{1,2},\s+\d{4}/.test(val)) return true
                    // Check for DD-MM-YYYY or MM/DD/YYYY
                    if (/\d{1,2}[-/]\d{1,2}[-/]\d{4}/.test(val)) return true
                    
                    return false
                }

                const KNOWN_TYPES = ['Order Income', 'Withdrawal', 'Adjustment', 'Refund', 'Escrow', 'Seller Balance Payment']
                const looksLikeType = (val: any) => KNOWN_TYPES.some(t => typeof val === 'string' && val.includes(t))

                if (isDate(date)) {
                    lastDate = date
                    type = row[1]
                    desc = row[2]
                    orderId = row[3]
                    direction = row[4]
                    amount = row[5]
                    status = row[6]
                    balance = row[7]
                } else {
                    // Shifted? Or just missing date at 0?
                    // If row[0] is 'Order Income', then index 0 is Type.
                    // But wait, if checking `check_excel_headers.js` output:
                    // Row 20: ['Order Income', ...] (Length 7)
                    // So indices are shifted by 1.
                    
                    if (looksLikeType(row[0]) || row[0] === 'Transaction Completed' || row.length === 7) {
                        date = lastDate // Use last valid date
                        type = row[0]
                        desc = row[1]
                        orderId = row[2]
                        direction = row[3]
                        amount = row[4]
                        status = row[5]
                        balance = row[6]
                    } else {
                        // Fallback: maybe row[0] is empty string?
                        // If defval: '', row[0] is ''.
                        if (row[0] === '') {
                             date = lastDate
                             type = row[1]
                             desc = row[2]
                             orderId = row[3]
                             direction = row[4]
                             amount = row[5]
                             status = row[6]
                             balance = row[7]
                        } else {
                            // Unclear, skip or try standard
                            continue
                        }
                    }
                }

                // Clean Amount
                let cleanAmount = 0
                if (typeof amount === 'number') cleanAmount = amount
                else if (typeof amount === 'string') cleanAmount = parseFloat(amount.replace(/,/g, ''))

                // Clean Balance
                let cleanBalance = 0
                if (typeof balance === 'number') cleanBalance = balance
                else if (typeof balance === 'string') cleanBalance = parseFloat(balance.replace(/,/g, ''))
                
                if (!type) continue

                // Extract Order ID from description if missing
                // Example: "Wallet adjustment for shipping fee of failed delivery order: 260110MET87ES5"
                let finalOrderId = orderId;
                if ((!finalOrderId || finalOrderId === '-' || finalOrderId === '') && desc) {
                    const descStr = String(desc);
                    const match = descStr.match(/order:\s*([A-Z0-9]+)/i);
                    if (match) {
                        finalOrderId = match[1];
                    }
                }

                parsedTransactions.push({
                    transaction_date: date ? new Date(date).toISOString() : new Date().toISOString(),
                    transaction_type: type,
                    description: desc,
                    order_id: finalOrderId && finalOrderId !== '-' ? finalOrderId : null,
                    money_direction: direction,
                    amount: cleanAmount,
                    status: status,
                    wallet_balance: cleanBalance
                })
            }

            // Remove duplicates logic:
            // 1. Fetch existing transactions from DB that might overlap with the new ones.
            //    We can check the date range of the parsed transactions.
            if (parsedTransactions.length === 0) {
                alert('No valid transactions found.')
                setUploading(false)
                return
            }

            console.log(`Fetching existing data for duplicate check (Limit 50000)`)

            const { data: existingData, error: fetchError } = await supabase
                .from('shopee_transactions')
                .select('*')
                .limit(50000)
            
            if (fetchError) {
                console.error('Error checking existing transactions:', fetchError)
                throw fetchError
            }

            // Create a Multi-Signature Set for aggressive de-duplication
            const existingSet = new Set<string>()
            
            existingData?.forEach(t => {
                const type = (t.transaction_type || '').trim()
                const amount = Number(t.amount).toFixed(2)
                const balance = Number(t.wallet_balance).toFixed(2)
                const orderId = (t.order_id || '').trim()
                
                // 1. Balance Signature (Primary)
                if (Number(balance) !== 0) {
                    existingSet.add(`BAL:${balance}|${amount}|${type}|${orderId}`)
                }

                // 2. Date Signature (Fallback)
                let dateKey = ''
                try {
                    const d = new Date(t.transaction_date)
                    dateKey = d.toISOString().slice(0, 10) 
                } catch (e) {
                    dateKey = String(t.transaction_date || '').substring(0, 10)
                }
                existingSet.add(`DATE:${dateKey}|${type}|${amount}|${balance}|${orderId}`)

                // 3. Order ID Signature (Aggressive)
                // If we have an Order ID and Type, that should be unique enough combined with Amount
                if (orderId && orderId !== '-' && orderId !== '') {
                     existingSet.add(`ORDER:${orderId}|${type}|${amount}`)
                }
            })

            const getIncomingKeys = (t: any) => {
                const keys: string[] = []
                const type = (t.transaction_type || '').trim()
                const amount = Number(t.amount).toFixed(2)
                const balance = Number(t.wallet_balance).toFixed(2)
                const orderId = (t.order_id || '').trim()
                
                // Generate ALL possible keys for incoming data
                if (Number(balance) !== 0) {
                    keys.push(`BAL:${balance}|${amount}|${type}|${orderId}`)
                }

                let dateKey = ''
                try {
                    const d = new Date(t.transaction_date)
                    dateKey = d.toISOString().slice(0, 10) 
                } catch (e) {
                    dateKey = String(t.transaction_date || '').substring(0, 10)
                }
                keys.push(`DATE:${dateKey}|${type}|${amount}|${balance}|${orderId}`)

                if (orderId && orderId !== '-' && orderId !== '') {
                    keys.push(`ORDER:${orderId}|${type}|${amount}`)
                }

                return keys
            }

            const newTransactions = parsedTransactions.filter(t => {
                const keys = getIncomingKeys(t)
                // If ANY of the generated keys exists in the set, it's a duplicate
                return !keys.some(k => existingSet.has(k))
            })
            
            const skippedCount = parsedTransactions.length - newTransactions.length
            console.log(`Skipped ${skippedCount} duplicates based on wallet balance/date signature.`)

            // Batch insert
            if (newTransactions.length > 0) {
                const { error } = await supabase.from('shopee_transactions').insert(newTransactions)
                if (error) throw error
                
                // Sync specific transactions to Expenses (Top Up / Ads)
                try {
                    const { data: { user } } = await supabase.auth.getUser()
                    if (user) {
                        const expenseTransactions = newTransactions.filter(t => {
                            const type = (t.transaction_type || '').toLowerCase()
                            // Include any negative transaction that is NOT a withdrawal
                            // This covers: Ads, Top Ups, Adjustments, Refunds, Negative Order Income
                            return t.amount < 0 && !type.includes('withdrawal')
                        })
    
                        if (expenseTransactions.length > 0) {
                             const expenseRecords = expenseTransactions.map(t => {
                                 let category = 'Shopee Deduction'; // Default
                                 const desc = (t.description || '').toLowerCase();
                                 const type = (t.transaction_type || '').toLowerCase();
                                 
                                 if (desc.includes('top up') || desc.includes('ads')) {
                                     category = 'Shopee Ads';
                                 } else if (type.includes('refund') || desc.includes('refund')) {
                                     category = 'Return/Refund';
                                 } else if (type.includes('adjustment') || desc.includes('adjustment')) {
                                     category = 'Shopee Deduction';
                                 } else if ((type.includes('order income') || type.includes('income from order')) && t.amount < 0) {
                                     category = 'Order Deduction';
                                 }

                                 return {
                                     description: t.description,
                                     amount: Math.abs(t.amount),
                                     category: category,
                                     expense_date: t.transaction_date,
                                     user_id: user.id,
                                     quantity: 1,
                                     unit_cost: Math.abs(t.amount),
                                     product_id: null
                                 };
                             })
     
                             const { error: expenseError } = await supabase.from('expenses').insert(expenseRecords)
                            if (expenseError) {
                                 console.error('Error syncing expenses:', expenseError)
                            }
                        }
                    }
                } catch (syncError) {
                    console.error('Error in expense sync:', syncError)
                }

                alert(`Successfully imported ${newTransactions.length} new transactions. (${parsedTransactions.length - newTransactions.length} duplicates skipped)`)
                fetchTransactions()
            } else {
                alert('No new transactions found. All imported data already exists.')
            }

        } catch (error: any) {
            console.error('Import error:', error)
            alert('Error importing file: ' + error.message)
        } finally {
            setUploading(false)
            if (fileInputRef.current) fileInputRef.current.value = ''
        }
    }

    return (
        <div className="space-y-6">
            <div className="flex flex-col md:flex-row justify-between items-start md:items-center gap-4">
                <div>
                    <h1 className="text-3xl font-bold tracking-tight text-foreground font-serif">Shopee Income Report</h1>
                    <p className="text-muted-foreground mt-1">Track your released payouts and transaction history.</p>
                </div>
                <div className="flex items-center gap-3">
                    <input
                        type="file"
                        ref={fileInputRef}
                        onChange={handleFileUpload}
                        className="hidden"
                        accept=".xlsx, .xls"
                    />
                    <Button 
                        onClick={() => fileInputRef.current?.click()} 
                        disabled={uploading || syncing}
                        className="bg-orange-600 hover:bg-orange-700 text-white"
                    >
                        {uploading ? (
                            <>
                                <Loader2 className="mr-2 h-4 w-4 animate-spin" />
                                Importing...
                            </>
                        ) : (
                            <>
                                <Upload className="mr-2 h-4 w-4" />
                                Import Excel
                            </>
                        )}
                    </Button>
                    <Button 
                        variant="outline" 
                        onClick={syncMissingExpenses} 
                        disabled={syncing || uploading}
                        title="Sync missing past expenses"
                    >
                        {syncing ? (
                            <Loader2 className="h-4 w-4 animate-spin" />
                        ) : (
                            <RefreshCcw className="h-4 w-4" />
                        )}
                    </Button>

                    <Dialog open={verifyOpen} onOpenChange={setVerifyOpen}>
                        <DialogTrigger asChild>
                            <Button variant="outline" className="gap-2">
                                <ClipboardCheck className="h-4 w-4" />
                                Verify Data
                            </Button>
                        </DialogTrigger>
                        <DialogContent className="max-w-2xl">
                            <DialogHeader>
                                <DialogTitle>Verify Income Data</DialogTitle>
                                <DialogDescription>
                                    Paste the summary text from Shopee (e.g., "Transactions Made...") to compare with your imported data.
                                </DialogDescription>
                            </DialogHeader>
                            <div className="grid gap-4 py-4">
                                <Textarea 
                                    placeholder="Paste Shopee summary here..." 
                                    value={verifyText}
                                    onChange={(e) => setVerifyText(e.target.value)}
                                    className="h-32 font-mono text-xs"
                                />
                                
                                {verifyResult && (
                                    <div className="border rounded-md">
                                        <Table>
                                            <TableHeader>
                                                <TableRow>
                                                    <TableHead>Category</TableHead>
                                                    <TableHead className="text-right">Shopee (Count)</TableHead>
                                                    <TableHead className="text-right">System (Count)</TableHead>
                                                    <TableHead className="text-right">Difference</TableHead>
                                                </TableRow>
                                            </TableHeader>
                                            <TableBody>
                                                <TableRow>
                                                    <TableCell className="font-medium">Total Transactions</TableCell>
                                                    <TableCell className="text-right">{verifyResult.total_transactions}</TableCell>
                                                    <TableCell className="text-right">{summary.totalTransactions}</TableCell>
                                                    <TableCell className={`text-right font-bold ${verifyResult.total_transactions !== summary.totalTransactions ? 'text-red-600' : 'text-emerald-600'}`}>
                                                        {summary.totalTransactions - verifyResult.total_transactions}
                                                    </TableCell>
                                                </TableRow>
                                                {Object.entries(verifyResult.raw_breakdown).map(([label, count]) => {
                                                    // Map Shopee label to System type
                                                    // Shopee: "Order Income" -> System: "Order Income"
                                                    // Shopee: "Seller Balance Payment" -> System: "Seller Balance Payment" (now added)
                                                    
                                                    // Count in system
                                                    let systemCount = 0;
                                                    const labelLower = label.toLowerCase();
                                                    
                                                    // Find matching type in summary.typeBreakdown
                                                    Object.entries(summary.typeBreakdown).forEach(([type, c]) => {
                                                        const typeLower = type.toLowerCase();
                                                        if (typeLower === labelLower) systemCount += c;
                                                        // Fallback matches
                                                        else if (labelLower === 'order income' && (typeLower === 'income from order' || typeLower === 'order income')) systemCount = c; // c is already total for that key? No typeBreakdown has normalized keys? 
                                                        // Wait, summary.typeBreakdown keys are already normalized in useMemo
                                                        // 'Order Income', 'Order Deduction', 'Seller Balance Payment' (if imported)
                                                    });

                                                    // Actually, let's use the summary.typeBreakdown directly if possible
                                                    // But Shopee label might differ slightly.
                                                    // Let's try direct match first.
                                                    let matchKey = Object.keys(summary.typeBreakdown).find(k => k.toLowerCase() === labelLower);
                                                    if (!matchKey && labelLower === 'order income') matchKey = 'Order Income';
                                                    
                                                    // Special case: "Order Income" in Shopee might correspond to "Order Income" + "Order Deduction" (negative income)?
                                                    // No, "Order Deduction" is separate in Shopee summary usually?
                                                    // User's text: "Order Income: 1828", "Order Deduction: 6".
                                                    // So they are separate.
                                                    
                                                    const sysVal = matchKey ? summary.typeBreakdown[matchKey] || 0 : 0;
                                                    const diff = sysVal - count;

                                                    return (
                                                        <TableRow key={label}>
                                                            <TableCell>{label}</TableCell>
                                                            <TableCell className="text-right">{count}</TableCell>
                                                            <TableCell className="text-right">{sysVal}</TableCell>
                                                            <TableCell className={`text-right font-bold ${diff !== 0 ? 'text-red-600' : 'text-emerald-600'}`}>
                                                                {diff > 0 ? `+${diff}` : diff}
                                                            </TableCell>
                                                        </TableRow>
                                                    )
                                                })}
                                            </TableBody>
                                        </Table>
                                    </div>
                                )}
                            </div>
                        </DialogContent>
                    </Dialog>
                </div>
            </div>

            {/* Summary Cards */}
            <div className="grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-4 gap-4">
                <Card className="bg-gradient-to-br from-orange-50 to-white border-orange-100 shadow-sm dark:from-orange-950/30 dark:to-zinc-900 dark:border-orange-900/50">
                    <CardHeader className="flex flex-row items-center justify-between space-y-0 pb-1">
                        <CardTitle className="text-sm font-medium text-orange-600 dark:text-orange-400">Total Balance</CardTitle>
                        <Wallet className="h-4 w-4 text-orange-600 dark:text-orange-400" />
                    </CardHeader>
                    <CardContent>
                        <div className="text-2xl font-bold font-mono text-zinc-900 dark:text-zinc-50">₱{summary.currentBalance.toLocaleString(undefined, { minimumFractionDigits: 2 })}</div>
                        <p className="text-xs text-muted-foreground">Latest wallet balance</p>
                    </CardContent>
                </Card>
                <Card className="bg-gradient-to-br from-emerald-50 to-white border-emerald-100 shadow-sm dark:from-emerald-950/30 dark:to-zinc-900 dark:border-emerald-900/50">
                    <CardHeader className="flex flex-row items-center justify-between space-y-0 pb-1">
                        <CardTitle className="text-sm font-medium text-emerald-600 dark:text-emerald-400">Money In</CardTitle>
                        <ArrowDownLeft className="h-4 w-4 text-emerald-600 dark:text-emerald-400" />
                    </CardHeader>
                    <CardContent>
                        <div className="text-2xl font-bold font-mono text-zinc-900 dark:text-zinc-50">₱{summary.moneyIn.toLocaleString(undefined, { minimumFractionDigits: 2 })}</div>
                        <p className="text-xs text-muted-foreground">Total credits</p>
                    </CardContent>
                </Card>
                <Card className="bg-gradient-to-br from-red-50 to-white border-red-100 shadow-sm dark:from-red-950/30 dark:to-zinc-900 dark:border-red-900/50">
                    <CardHeader className="flex flex-row items-center justify-between space-y-0 pb-1">
                        <CardTitle className="text-sm font-medium text-red-600 dark:text-red-400">Money Out</CardTitle>
                        <ArrowUpRight className="h-4 w-4 text-red-600 dark:text-red-400" />
                    </CardHeader>
                    <CardContent>
                        <div className="text-2xl font-bold font-mono text-zinc-900 dark:text-zinc-50">₱{summary.moneyOut.toLocaleString(undefined, { minimumFractionDigits: 2 })}</div>
                        <p className="text-xs text-muted-foreground">Withdrawals & Adjustments</p>
                    </CardContent>
                </Card>
                <Card className="bg-gradient-to-br from-blue-50 to-white border-blue-100 shadow-sm dark:from-blue-950/30 dark:to-zinc-900 dark:border-blue-900/50">
                    <CardHeader className="flex flex-row items-center justify-between space-y-0 pb-1">
                        <CardTitle className="text-sm font-medium text-blue-600 dark:text-blue-400">Transactions Made</CardTitle>
                        <FileSpreadsheet className="h-4 w-4 text-blue-600 dark:text-blue-400" />
                    </CardHeader>
                    <CardContent>
                        <div className="flex flex-col gap-1">
                            <div className="text-2xl font-bold font-mono leading-none text-zinc-900 dark:text-zinc-50">{summary.totalTransactions}</div>
                            <div className="flex flex-wrap gap-1">
                                {Object.entries(summary.typeBreakdown)
                                    .sort(([, a], [, b]) => b - a) // Sort by count desc
                                    .map(([type, count]) => (
                                        <div key={type} className="flex items-center gap-1 text-[10px] text-muted-foreground bg-white/50 dark:bg-zinc-800/50 px-1.5 py-0.5 rounded-full border border-blue-100 dark:border-blue-900/30">
                                            <span>{type}:</span>
                                            <span className="font-medium text-blue-700 dark:text-blue-400">{count}</span>
                                        </div>
                                    ))
                                }
                            </div>
                        </div>
                    </CardContent>
                </Card>
            </div>

            {/* Money Flow Breakdown Table */}
            <Card className="border-zinc-200 shadow-sm">
                <CardHeader className="pb-3">
                    <CardTitle className="text-sm font-medium flex items-center gap-2">
                        <ArrowUpRight className="h-4 w-4 text-zinc-500" />
                        Money Flow Breakdown
                    </CardTitle>
                </CardHeader>
                <CardContent>
                    <div className="rounded-md border">
                        <Table>
                            <TableHeader>
                                <TableRow className="bg-muted/50 text-xs hover:bg-muted/50">
                                    <TableHead>Category</TableHead>
                                    <TableHead className="text-right text-emerald-600">Money In</TableHead>
                                    <TableHead className="text-right text-red-600">Money Out</TableHead>
                                    <TableHead className="text-right">Net Flow</TableHead>
                                </TableRow>
                            </TableHeader>
                            <TableBody>
                                {Object.entries(summary.breakdown)
                                    .sort((a, b) => (b[1].in + b[1].out) - (a[1].in + a[1].out)) // Sort by total volume
                                    .map(([type, stats]) => {
                                        const net = stats.in - stats.out;
                                        return (
                                            <TableRow key={type} className="h-10 text-sm">
                                                <TableCell className="font-medium py-2">{type}</TableCell>
                                                <TableCell className="text-right text-emerald-600 py-2">
                                                    {stats.in > 0 ? `₱${stats.in.toLocaleString(undefined, { minimumFractionDigits: 2 })}` : '-'}
                                                </TableCell>
                                                <TableCell className="text-right text-red-600 py-2">
                                                    {stats.out > 0 ? `₱${stats.out.toLocaleString(undefined, { minimumFractionDigits: 2 })}` : '-'}
                                                </TableCell>
                                                <TableCell className={`text-right font-medium py-2 ${net > 0 ? 'text-emerald-600' : net < 0 ? 'text-red-600' : 'text-muted-foreground'}`}>
                                                    {net !== 0 ? `₱${Math.abs(net).toLocaleString(undefined, { minimumFractionDigits: 2 })}` : '-'}
                                                    {net > 0 && <span className="ml-1 text-[10px]">IN</span>}
                                                    {net < 0 && <span className="ml-1 text-[10px]">OUT</span>}
                                                </TableCell>
                                            </TableRow>
                                        )
                                    })}
                                <TableRow className="bg-muted/30 font-bold border-t-2">
                                    <TableCell className="py-3">Total</TableCell>
                                    <TableCell className="text-right text-emerald-700 py-3">₱{summary.moneyIn.toLocaleString(undefined, { minimumFractionDigits: 2 })}</TableCell>
                                    <TableCell className="text-right text-red-700 py-3">₱{summary.moneyOut.toLocaleString(undefined, { minimumFractionDigits: 2 })}</TableCell>
                                    <TableCell className={`text-right py-3 ${summary.totalIncome >= 0 ? 'text-emerald-700' : 'text-red-700'}`}>
                                        ₱{Math.abs(summary.totalIncome).toLocaleString(undefined, { minimumFractionDigits: 2 })}
                                        {summary.totalIncome >= 0 ? <span className="ml-1 text-[10px]">IN</span> : <span className="ml-1 text-[10px]">OUT</span>}
                                    </TableCell>
                                </TableRow>
                            </TableBody>
                        </Table>
                    </div>
                </CardContent>
            </Card>

            {/* Transactions Table */}
            <Card className="border-orange-100 shadow-md">
                <CardHeader className="flex flex-col md:flex-row items-start md:items-center justify-between gap-4">
                    <CardTitle className="flex items-center gap-2">
                        <FileSpreadsheet className="h-5 w-5 text-orange-600" />
                        Transaction History
                    </CardTitle>
                    <div className="flex flex-col sm:flex-row gap-2 w-full sm:w-auto items-center">
                        <DatePickerWithRange date={dateRange} setDate={setDateRange} />
                        
                        <Select value={selectedType} onValueChange={setSelectedType}>
                            <SelectTrigger className="w-[160px]">
                                <SelectValue placeholder="Transaction Type" />
                            </SelectTrigger>
                            <SelectContent>
                                <SelectItem value="all">All Types</SelectItem>
                                <SelectItem value="order income">Order Income</SelectItem>
                                <SelectItem value="withdrawal">Withdrawal</SelectItem>
                                <SelectItem value="adjustment">Adjustment</SelectItem>
                                <SelectItem value="refund">Refund</SelectItem>
                                <SelectItem value="others">Others</SelectItem>
                            </SelectContent>
                        </Select>

                        <div className="relative w-full sm:w-64">
                            <Search className="absolute left-2 top-2.5 h-4 w-4 text-muted-foreground" />
                            <Input
                                placeholder="Search Order ID..."
                                value={searchOrderId}
                                onChange={(e) => setSearchOrderId(e.target.value)}
                                className="pl-8"
                            />
                        </div>
                    </div>
                </CardHeader>
                <CardContent>
                    <div className="rounded-md border">
                        <Table>
                                <TableHeader>
                                    <TableRow className="bg-muted/50">
                                        <TableHead className="whitespace-nowrap">Date</TableHead>
                                        <TableHead className="whitespace-nowrap">Type</TableHead>
                                        <TableHead className="min-w-[350px]">Description</TableHead>
                                        <TableHead className="whitespace-nowrap">Order ID</TableHead>
                                        <TableHead className="whitespace-nowrap">Flow</TableHead>
                                        <TableHead className="text-right whitespace-nowrap">Amount</TableHead>
                                        <TableHead className="text-right whitespace-nowrap">Balance</TableHead>
                                        <TableHead className="whitespace-nowrap">Status</TableHead>
                                    </TableRow>
                                </TableHeader>
                                <TableBody>
                                    {loading ? (
                                    <TableRow>
                                        <TableCell colSpan={7} className="h-24 text-center">
                                            <div className="flex flex-col items-center justify-center gap-2">
                                                <Loader2 className="h-6 w-6 animate-spin text-orange-500" />
                                                <span className="text-muted-foreground">Loading transactions...</span>
                                            </div>
                                        </TableCell>
                                    </TableRow>
                                ) : filteredTransactions.length === 0 ? (
                                    <TableRow>
                                        <TableCell colSpan={7} className="h-24 text-center text-muted-foreground">
                                            No transactions found matching your search.
                                        </TableCell>
                                    </TableRow>
                                ) : (
                                    paginatedTransactions.map((t) => (
                                        <TableRow key={t.id} className="h-12">
                                            <TableCell className="font-medium whitespace-nowrap py-3">
                                                {new Date(t.transaction_date).toLocaleString('en-US', { 
                                                    month: 'short', 
                                                    day: 'numeric', 
                                                    year: 'numeric', 
                                                    hour: '2-digit', 
                                                    minute: '2-digit' 
                                                })}
                                            </TableCell>
                                            <TableCell className="py-3">
                                                <Badge variant="outline" className={
                                                    (t.transaction_type.includes('Income') || t.transaction_type.includes('income')) && t.amount >= 0 ? 'bg-emerald-50 text-emerald-700 border-emerald-200' :
                                                    t.transaction_type.includes('Withdrawal') ? 'bg-blue-50 text-blue-700 border-blue-200' :
                                                    (t.amount < 0 || t.description?.toLowerCase().includes('top up') || t.description?.toLowerCase().includes('ads')) ? 'bg-red-50 text-red-700 border-red-200' :
                                                    'bg-zinc-50 text-zinc-700 border-zinc-200'
                                                }>
                                                    {(t.transaction_type === 'Order Income' || t.transaction_type.toLowerCase().includes('income from order')) && t.amount < 0 ? 'Order Deduction' : t.transaction_type}
                                                </Badge>
                                            </TableCell>
                                            <TableCell className="min-w-[350px] py-3" title={t.description}>
                                                {t.description}
                                            </TableCell>
                                            <TableCell className="font-mono text-xs whitespace-nowrap py-3">
                                                {t.order_id || '-'}
                                            </TableCell>
                                            <TableCell className="py-3">
                                                <Badge variant="outline" className={
                                                    t.amount >= 0 
                                                        ? 'bg-emerald-50 text-emerald-700 border-emerald-200' 
                                                        : 'bg-red-50 text-red-700 border-red-200'
                                                }>
                                                    {t.amount >= 0 ? 'Money In' : 'Money Out'}
                                                </Badge>
                                            </TableCell>
                                            <TableCell className={`text-right font-mono font-medium whitespace-nowrap py-3 ${t.amount > 0 ? 'text-emerald-600' : 'text-red-600'}`}>
                                                {t.amount > 0 ? '+' : ''}{t.amount.toLocaleString(undefined, { minimumFractionDigits: 2 })}
                                            </TableCell>
                                            <TableCell className="text-right font-mono text-muted-foreground whitespace-nowrap py-3">
                                                {t.wallet_balance.toLocaleString(undefined, { minimumFractionDigits: 2 })}
                                            </TableCell>
                                            <TableCell className="py-3">
                                                <span className="text-xs text-muted-foreground whitespace-nowrap">{t.status}</span>
                                            </TableCell>
                                        </TableRow>
                                    ))
                                )}
                            </TableBody>
                        </Table>
                    </div>

                    {/* Pagination Controls */}
                    {totalPages > 1 && (
                        <div className="flex items-center justify-between space-x-2 py-4">
                            <div className="text-sm text-muted-foreground">
                                Showing {((currentPage - 1) * ITEMS_PER_PAGE) + 1} to {Math.min(currentPage * ITEMS_PER_PAGE, filteredTransactions.length)} of {filteredTransactions.length} entries
                            </div>
                            <div className="flex space-x-2">
                                <Button
                                    variant="outline"
                                    size="sm"
                                    onClick={() => setCurrentPage(p => Math.max(1, p - 1))}
                                    disabled={currentPage === 1}
                                >
                                    <ChevronLeft className="h-4 w-4" />
                                    Previous
                                </Button>
                                <Button
                                    variant="outline"
                                    size="sm"
                                    onClick={() => setCurrentPage(p => Math.min(totalPages, p + 1))}
                                    disabled={currentPage === totalPages}
                                >
                                    Next
                                    <ChevronRight className="h-4 w-4" />
                                </Button>
                            </div>
                        </div>
                    )}
                </CardContent>
            </Card>
        </div>
    )
}
