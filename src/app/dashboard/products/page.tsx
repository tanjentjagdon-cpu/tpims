'use client'

import * as React from 'react'
import { AddProductDialog } from '@/components/inventory/add-product-dialog'
import { RestockDialog } from '@/components/inventory/restock-dialog'
import { ProductHistoryDialog } from '@/components/inventory/product-history-dialog'
import { EditProductDialog } from '@/components/inventory/edit-product-dialog'
import { supabase } from '@/lib/supabase'
import {
    Table,
    TableBody,
    TableCell,
    TableHead,
    TableHeader,
    TableRow,
} from '@/components/ui/table'
import { Badge } from '@/components/ui/badge'
import { Button } from '@/components/ui/button'
import { Input } from '@/components/ui/input'
import { Search } from 'lucide-react'
import { cn } from '@/lib/utils'
import {
    Select,
    SelectContent,
    SelectItem,
    SelectTrigger,
    SelectValue,
} from '@/components/ui/select'

interface Product {
    id: string
    fabric_name: string
    fabric_type: string
    variation: string
    cost_price: number
    total_stock: number
    available_stock: number
    sold_shopee: number
    sold_tiktok: number
    image_url?: string
}

export default function ProductsPage() {
    const [products, setProducts] = React.useState<Product[]>([])
    const [loading, setLoading] = React.useState(true)
    const [search, setSearch] = React.useState('')
    const [fabricFilter, setFabricFilter] = React.useState('all')
    const [typeFilter, setTypeFilter] = React.useState('all')

    const fetchProducts = React.useCallback(async () => {
        try {
            setLoading(true)
            const { data, error } = await supabase
                .from('products')
                .select('*')
                .order('fabric_name', { ascending: true })

            if (error) throw error
            setProducts(data || [])
        } catch (error: any) {
            console.error('Error fetching products:', error)
            // Log more details if it's a Supabase error
            if (error.message) console.error('Error message:', error.message)
            if (error.details) console.error('Error details:', error.details)
        } finally {
            setLoading(false)
        }
    }, [])

    React.useEffect(() => {
        fetchProducts()
    }, [fetchProducts])

    // Get unique fabric names for filter
    const uniqueFabrics = React.useMemo(() => {
        const names = products.map(p => p.fabric_name)
        return [...new Set(names)].sort()
    }, [products])

    const filteredProducts = products.filter(p => {
        const matchesSearch = p.variation.toLowerCase().includes(search.toLowerCase()) ||
            p.fabric_name.toLowerCase().includes(search.toLowerCase())
        const matchesFabric = fabricFilter === 'all' || p.fabric_name === fabricFilter
        const matchesType = typeFilter === 'all' || p.fabric_type === typeFilter

        return matchesSearch && matchesFabric && matchesType
    })

    return (
        <div className="flex flex-col space-y-6">
            {/* Header Section */}
            <div className="flex flex-col space-y-4 pt-1 px-1 border-b border-orange-200 pb-4">
                <div className="flex flex-col xl:flex-row xl:items-center justify-between gap-4">
                    {/* Title & Count */}
                    <div className="flex items-center gap-4">
                        <h2 className="text-2xl font-bold tracking-tight text-foreground font-serif">Inventory</h2>
                        <Badge variant="secondary" className="px-3 py-1 font-bold bg-muted text-foreground border border-border rounded-full">
                            {filteredProducts.length} Items
                        </Badge>
                    </div>

                    {/* Controls Group */}
                    <div className="flex flex-col sm:flex-row items-center gap-3 flex-1 xl:justify-end">
                        {/* Search */}
                        <div className="relative w-full sm:w-[250px]">
                            <Search className="absolute left-2.5 top-2.5 h-4 w-4 text-muted-foreground" />
                            <Input
                                placeholder="Search fabrics..."
                                className="pl-8 bg-background border-input focus-visible:ring-orange-500 rounded-lg h-9"
                                value={search}
                                onChange={(e) => setSearch(e.target.value)}
                            />
                        </div>

                        {/* Filters */}
                        <div className="flex items-center gap-2 w-full sm:w-auto">
                            <Select value={fabricFilter} onValueChange={setFabricFilter}>
                                <SelectTrigger className="w-full sm:w-[150px] bg-background border-input rounded-lg h-9">
                                    <SelectValue placeholder="All Fabrics" />
                                </SelectTrigger>
                                <SelectContent className="rounded-xl border shadow-lg">
                                    <SelectItem value="all" className="font-medium">All Fabrics</SelectItem>
                                    {uniqueFabrics.map(fabric => (
                                        <SelectItem key={fabric} value={fabric} className="font-medium">{fabric}</SelectItem>
                                    ))}
                                </SelectContent>
                            </Select>

                            <Select value={typeFilter} onValueChange={setTypeFilter}>
                                <SelectTrigger className="w-full sm:w-[120px] bg-background border-input rounded-lg h-9">
                                    <SelectValue placeholder="All Types" />
                                </SelectTrigger>
                                <SelectContent className="rounded-xl border shadow-lg">
                                    <SelectItem value="all" className="font-medium">All Types</SelectItem>
                                    <SelectItem value="Plain" className="font-medium">Plain</SelectItem>
                                    <SelectItem value="Printed" className="font-medium">Printed</SelectItem>
                                </SelectContent>
                            </Select>
                        </div>
                        
                        <div className="w-px h-6 bg-border hidden sm:block mx-1" />
                        
                        <AddProductDialog onSuccess={fetchProducts} />
                    </div>
                </div>
            </div>

            {/* Products Grid */}
            <div className="pb-10">
                {loading ? (
                    <div className="flex items-center justify-center py-20">
                        <p className="text-muted-foreground animate-pulse font-medium underline decoration-orange-300 underline-offset-4">Loading inventory stocks...</p>
                    </div>
                ) : filteredProducts.length === 0 ? (
                    <div className="text-center py-24 rounded-3xl border border-dashed border-border bg-muted/30">
                        <p className="text-muted-foreground font-medium">No products found matching your filters.</p>
                        <Button
                            variant="link"
                            className="mt-2 text-orange-600 font-bold"
                            onClick={() => {
                                setSearch('')
                                setFabricFilter('all')
                                setTypeFilter('all')
                            }}
                        >
                            Clear all filters
                        </Button>
                    </div>
                ) : (
                    <div className="grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-3 xl:grid-cols-4 2xl:grid-cols-5 gap-6">
                        {filteredProducts.map((product) => (
                            <div key={product.id} className="group relative rounded-lg border border-border bg-card p-5 shadow-sm hover:shadow-md transition-all duration-300">
                                {/* Product Image */}
                                <div className="aspect-square w-full mb-4 rounded-xl overflow-hidden bg-muted relative">
                                    {product.image_url ? (
                                        <img
                                            src={product.image_url}
                                            alt={product.variation}
                                            className="h-full w-full object-cover group-hover:scale-105 transition-transform duration-500"
                                        />
                                    ) : (
                                        <div className="h-full w-full flex items-center justify-center bg-orange-50/50 text-orange-200">
                                            <div className="text-4xl font-serif font-bold opacity-20">
                                                {product.variation.charAt(0)}
                                            </div>
                                        </div>
                                    )}

                                    {/* Overlay Details */}
                                    <div className="absolute inset-0 bg-gradient-to-t from-black/80 via-black/20 to-transparent flex flex-col justify-end p-4">
                                        <div className="flex items-center mb-1.5">
                                            <div className={cn(
                                                "flex items-center gap-2 px-2.5 py-0.5 rounded-full border backdrop-blur-sm",
                                                product.fabric_type === 'Printed'
                                                    ? "bg-orange-600/30 border-orange-500/40"
                                                    : "bg-emerald-600/30 border-emerald-500/40"
                                            )}>
                                                <span className="text-[10px] font-bold text-white uppercase tracking-wider">{product.fabric_name}</span>
                                                <div className={cn(
                                                    "w-1 h-1 rounded-full",
                                                    product.fabric_type === 'Printed' ? "bg-orange-400" : "bg-emerald-400"
                                                )} />
                                                <span className="text-[9px] font-black uppercase tracking-widest text-white">
                                                    {product.fabric_type}
                                                </span>
                                            </div>
                                        </div>
                                        <h3 className="text-xl font-bold text-white leading-tight">
                                            {product.variation}
                                        </h3>
                                    </div>
                                </div>

                                <div className="flex items-center justify-between mb-4 px-1">
                                    <div className="flex flex-col">
                                        <div className="text-[10px] text-muted-foreground uppercase font-bold">Cost Price</div>
                                        <div className="text-lg font-bold font-mono text-primary">₱{product.cost_price.toFixed(2)}</div>
                                    </div>
                                    <div className="flex gap-1.5 self-end">
                                        <ProductHistoryDialog productId={product.id} productName={product.variation} />
                                        <EditProductDialog product={product} onSuccess={fetchProducts} />
                                    </div>
                                </div>

                                <div className="space-y-4">
                                    <div className="grid grid-cols-2 gap-4">
                                        <div className="bg-secondary/30 rounded-lg p-2 text-center border border-border/50">
                                            <div className="text-[10px] text-muted-foreground uppercase font-bold mb-0.5">Total</div>
                                            <div className="text-sm font-bold font-mono text-foreground">{product.total_stock}</div>
                                        </div>
                                        <div className="bg-secondary/30 rounded-lg p-2 text-center border border-border/50">
                                            <div className="text-[10px] text-muted-foreground uppercase font-bold mb-0.5">Available</div>
                                            <div className="text-sm font-bold font-mono text-foreground">
                                                {product.available_stock}
                                            </div>
                                        </div>
                                    </div>

                                    <div className="grid grid-cols-2 gap-4 mt-2">
                                        <div className="bg-secondary/30 rounded-lg p-2 text-center border border-border/50">
                                            <div className="text-[10px] text-muted-foreground uppercase font-bold mb-0.5">Shopee</div>
                                            <div className="text-sm font-bold font-mono text-foreground">{product.sold_shopee}</div>
                                        </div>
                                        <div className="bg-secondary/30 rounded-lg p-2 text-center border border-border/50">
                                            <div className="text-[10px] text-muted-foreground uppercase font-bold mb-0.5">Tiktok</div>
                                            <div className="text-sm font-bold font-mono text-foreground">{product.sold_tiktok}</div>
                                        </div>
                                    </div>
                                </div>

                                <div className="mt-5 pt-4 border-t border-border flex gap-2">
                                    <RestockDialog
                                        productId={product.id}
                                        productName={product.variation}
                                        currentCost={product.cost_price}
                                        onSuccess={fetchProducts}
                                    />
                                </div>

                                {/* Status Badge */}
                                <div className="absolute top-3 right-3 z-10">
                                    {(Number(product.available_stock) || 0) <= 0 ? (
                                        <Badge className="bg-slate-900 text-white border border-orange-500 px-2 py-0.5 text-[10px] font-bold uppercase tracking-widest rounded-lg shadow-lg">
                                            Out of Stock
                                        </Badge>
                                    ) : product.available_stock < 50 ? (
                                        <Badge variant="destructive" className="animate-pulse bg-red-600 text-white border-none px-2 py-0.5 text-[10px] font-bold uppercase tracking-widest rounded-lg shadow-lg">
                                            Low Stock
                                        </Badge>
                                    ) : product.available_stock <= 100 ? (
                                        <Badge className="bg-orange-500 text-white border-none px-2 py-0.5 text-[10px] font-bold uppercase tracking-widest rounded-lg shadow-lg">
                                            Medium Stock
                                        </Badge>
                                    ) : (
                                        <Badge className="bg-emerald-500 text-white border-none px-2 py-0.5 text-[10px] font-bold uppercase tracking-widest rounded-lg shadow-lg">
                                            We're Good
                                        </Badge>
                                    )}
                                </div>
                            </div>
                        ))}
                    </div>
                )
                }
            </div >
        </div >
    )
}
