'use client'

import * as React from 'react'
import { Plus } from 'lucide-react'
import { useForm, SubmitHandler } from 'react-hook-form'
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
import {
    Select,
    SelectContent,
    SelectItem,
    SelectTrigger,
    SelectValue,
} from '@/components/ui/select'
import { Button } from '@/components/ui/button'
import { Input } from '@/components/ui/input'
import { Label } from '@/components/ui/label'

const formSchema = z.object({
    fabric_name: z.string().min(1, 'Fabric Name is required'),
    fabric_type: z.string().min(1, 'Fabric Type is required'),
    product_name: z.string().min(1, 'Product Name (Color) is required'),
    cost_price: z.any(),
    total_stock: z.any(),
})

// Explicit interface to avoid recursion issues
interface FormValues {
    fabric_name: string
    fabric_type: string
    product_name: string
    cost_price: any
    total_stock: any
}

interface AddProductDialogProps {
    onSuccess?: () => void
}

export function AddProductDialog({ onSuccess }: AddProductDialogProps) {
    const [open, setOpen] = React.useState(false)
    const [loading, setLoading] = React.useState(false)
    const [imageFile, setImageFile] = React.useState<File | null>(null)
    const [previewUrl, setPreviewUrl] = React.useState<string | null>(null)
    const [existingFabrics, setExistingFabrics] = React.useState<string[]>([])
    const fileInputRef = React.useRef<HTMLInputElement>(null)

    const form = useForm<FormValues>({
        resolver: zodResolver(formSchema),
        defaultValues: {
            fabric_name: '',
            fabric_type: 'Plain',
            product_name: '',
            cost_price: 0,
            total_stock: 0,
        },
    })

    // Fetch unique fabric names when dialog opens
    React.useEffect(() => {
        if (open) {
            const fetchFabrics = async () => {
                const { data, error } = await supabase
                    .from('products')
                    .select('fabric_name')

                if (!error && data) {
                    const uniqueNames = [...new Set(data.map(d => d.fabric_name))]
                    setExistingFabrics(uniqueNames.sort())
                }
            }
            fetchFabrics()
        }
    }, [open])

    const handleFileChange = (e: React.ChangeEvent<HTMLInputElement>) => {
        const file = e.target.files?.[0]
        if (file) {
            setImageFile(file)
            setPreviewUrl(URL.createObjectURL(file))
        } else {
            setImageFile(null)
            setPreviewUrl(null)
        }
    }

    const onSubmit: SubmitHandler<FormValues> = async (values) => {
        try {
            setLoading(true)
            const { data: { user } } = await supabase.auth.getUser()

            if (!user) throw new Error('Not authenticated')

            // 1. Upload Image (if any)
            let imageUrl = null
            if (imageFile) {
                const fileExt = imageFile.name.split('.').pop()
                const fileName = `${Date.now()}-${Math.random().toString(36).substring(2)}.${fileExt}`
                const { error: uploadError } = await supabase.storage
                    .from('product-images')
                    .upload(fileName, imageFile)

                if (uploadError) {
                    throw new Error('Image upload failed: ' + uploadError.message)
                }

                // Get Public URL
                const { data: { publicUrl } } = supabase.storage
                    .from('product-images')
                    .getPublicUrl(fileName)

                imageUrl = publicUrl
            }

            // 2. Insert Product
            const { error: insertError } = await supabase.from('products').insert({
                fabric_name: values.fabric_name,
                fabric_type: values.fabric_type,
                variation: values.product_name,
                cost_price: parseFloat(String(values.cost_price)) || 0,
                total_stock: parseFloat(String(values.total_stock)) || 0,
                available_stock: parseFloat(String(values.total_stock)) || 0,
                sold_shopee: 0,
                sold_tiktok: 0,
                unit: 'yards',
                image_url: imageUrl,
                user_id: user.id
            })

            if (insertError) throw insertError

            setOpen(false)
            form.reset()
            setImageFile(null)
            setPreviewUrl(null)
            onSuccess?.()
        } catch (error: any) {
            console.error('Error adding product details:', error)
            const errorMsg = error.message || (typeof error === 'object' ? JSON.stringify(error) : String(error))
            alert(`Error adding product: ${errorMsg === '{}' ? 'Check if table schema is correct (variation column)' : errorMsg}`)
        } finally {
            setLoading(false)
        }
    }

    return (
        <Dialog open={open} onOpenChange={setOpen}>
            <DialogTrigger asChild>
                <Button className="gap-2 bg-orange-600 hover:bg-orange-700 text-white shadow-lg shadow-orange-500/20">
                    <Plus className="h-4 w-4" />
                    Add Product
                </Button>
            </DialogTrigger>
            <DialogContent className="sm:max-w-[500px] max-h-[90vh] overflow-y-auto">
                <DialogHeader>
                    <DialogTitle className="text-2xl font-serif text-orange-700">Add New Fabric</DialogTitle>
                    <DialogDescription>
                        Add a new fabric style or color to your inventory.
                    </DialogDescription>
                </DialogHeader>
                {/* Use the Form component context provider if available, but for now standard form structure is clearer given the imports */}
                <form onSubmit={form.handleSubmit(onSubmit)} className="space-y-4 py-4">

                    {/* Image Upload Preview */}
                    <div className="flex justify-center mb-4">
                        <div
                            className="relative h-32 w-32 rounded-lg border-2 border-dashed border-orange-200 flex items-center justify-center cursor-pointer hover:bg-orange-50 transition-colors overflow-hidden"
                            onClick={() => fileInputRef.current?.click()}
                        >
                            {previewUrl ? (
                                <img src={previewUrl} alt="Preview" className="h-full w-full object-cover" />
                            ) : (
                                <div className="text-center text-muted-foreground">
                                    <Plus className="h-6 w-6 mx-auto mb-1 text-orange-300" />
                                    <span className="text-xs">Add Photo</span>
                                </div>
                            )}
                            <input
                                ref={fileInputRef}
                                type="file"
                                accept="image/*"
                                className="hidden"
                                onChange={handleFileChange}
                            />
                        </div>
                    </div>

                    <div className="grid gap-2">
                        <Label htmlFor="fabric_name">Fabric Name</Label>
                        <Input
                            id="fabric_name"
                            placeholder="e.g. Geena Cloth"
                            list="fabric-suggestions"
                            {...form.register('fabric_name')}
                            autoComplete="off"
                        />
                        <datalist id="fabric-suggestions">
                            {existingFabrics.map((fabric) => (
                                <option key={fabric} value={fabric} />
                            ))}
                        </datalist>
                    </div>

                    <div className="grid gap-2">
                        <Label htmlFor="fabric_type">Fabric Type</Label>
                        <Select
                            onValueChange={(value) => form.setValue('fabric_type', value)}
                            defaultValue={form.getValues('fabric_type')}
                        >
                            <SelectTrigger>
                                <SelectValue placeholder="Select type" />
                            </SelectTrigger>
                            <SelectContent>
                                <SelectItem value="Plain">Plain</SelectItem>
                                <SelectItem value="Printed">Printed</SelectItem>
                            </SelectContent>
                        </Select>
                    </div>

                    <div className="grid gap-2">
                        <Label htmlFor="product_name">Variation (Color/Design)</Label>
                        <Input
                            id="product_name"
                            placeholder="e.g. Apple Green"
                            {...form.register('product_name')}
                        />
                    </div>

                    <div className="grid grid-cols-2 gap-4">
                        <div className="grid gap-2">
                            <Label htmlFor="cost_price">Cost Price (₱)</Label>
                            <Input
                                id="cost_price"
                                type="number"
                                step="0.01"
                                {...form.register('cost_price')}
                            />
                        </div>
                        <div className="grid gap-2">
                            <Label htmlFor="total_stock">Initial Stock (Yards)</Label>
                            <Input
                                id="total_stock"
                                type="number"
                                step="0.01"
                                {...form.register('total_stock')}
                            />
                        </div>
                    </div>
                    <DialogFooter>
                        <Button type="submit" disabled={loading} className="w-full">
                            {loading ? 'Adding...' : 'Save Product'}
                        </Button>
                    </DialogFooter>
                </form>
            </DialogContent>
        </Dialog>
    )
}
