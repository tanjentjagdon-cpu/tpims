'use client'

import * as React from 'react'
import { Pencil, Trash2 } from 'lucide-react'
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
    AlertDialog,
    AlertDialogAction,
    AlertDialogCancel,
    AlertDialogContent,
    AlertDialogDescription,
    AlertDialogFooter,
    AlertDialogHeader,
    AlertDialogTitle,
    AlertDialogTrigger,
} from "@/components/ui/alert-dialog"
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
})

// Explicit interface to avoid recursion issues
interface FormValues {
    fabric_name: string
    fabric_type: string
    product_name: string
    cost_price: any
}

interface Product {
    id: string
    fabric_name: string
    fabric_type: string
    variation: string
    cost_price: number
    total_stock: number
    available_stock: number
    image_url?: string
}

interface EditProductDialogProps {
    product: Product
    onSuccess?: () => void
}

export function EditProductDialog({ product, onSuccess }: EditProductDialogProps) {
    const [open, setOpen] = React.useState(false)
    const [loading, setLoading] = React.useState(false)
    const [imageFile, setImageFile] = React.useState<File | null>(null)
    const [previewUrl, setPreviewUrl] = React.useState<string | null>(product.image_url || null)
    const fileInputRef = React.useRef<HTMLInputElement>(null)

    const form = useForm<FormValues>({
        resolver: zodResolver(formSchema),
        defaultValues: {
            fabric_name: product.fabric_name,
            fabric_type: product.fabric_type,
            product_name: product.variation,
            cost_price: product.cost_price,
        },
    })

    const handleFileChange = (e: React.ChangeEvent<HTMLInputElement>) => {
        const file = e.target.files?.[0]
        if (file) {
            setImageFile(file)
            setPreviewUrl(URL.createObjectURL(file))
        }
    }

    const onSubmit: SubmitHandler<FormValues> = async (values) => {
        try {
            setLoading(true)

            let imageUrl = product.image_url

            // 1. Upload New Image (if changed)
            if (imageFile) {
                const fileExt = imageFile.name.split('.').pop()
                const fileName = `${Date.now()}-${Math.random().toString(36).substring(2)}.${fileExt}`
                const { error: uploadError } = await supabase.storage
                    .from('product-images')
                    .upload(fileName, imageFile)

                if (uploadError) throw new Error('Image upload failed: ' + uploadError.message)

                const { data: { publicUrl } } = supabase.storage
                    .from('product-images')
                    .getPublicUrl(fileName)

                imageUrl = publicUrl
            }

            // 2. Update Product
            const { error: updateError } = await supabase
                .from('products')
                .update({
                    fabric_name: values.fabric_name,
                    fabric_type: values.fabric_type,
                    variation: values.product_name,
                    cost_price: parseFloat(String(values.cost_price)) || 0,
                    unit: 'yards',
                    image_url: imageUrl
                })
                .eq('id', product.id)

            if (updateError) throw updateError

            setOpen(false)
            onSuccess?.()
        } catch (error: any) {
            console.error('Error updating product:', error)
            const errorMsg = error.message || (typeof error === 'object' ? JSON.stringify(error) : String(error))
            alert(`Error updating product: ${errorMsg === '{}' ? 'Check database connection or RLS' : errorMsg}`)
        } finally {
            setLoading(false)
        }
    }

    async function handleDelete() {
        try {
            setLoading(true)
            const { error: deleteError } = await supabase
                .from('products')
                .delete()
                .eq('id', product.id)

            if (deleteError) throw deleteError

            setOpen(false)
            onSuccess?.()
        } catch (error: any) {
            console.error('Error deleting product:', error)
            alert(`Cannot delete product: ${error.message || 'It might be referenced in sales or orders.'}`)
        } finally {
            setLoading(false)
        }
    }

    return (
        <Dialog open={open} onOpenChange={setOpen}>
            <DialogTrigger asChild>
                <button
                    className="p-2 rounded-xl bg-secondary/50 border border-border text-muted-foreground hover:text-primary hover:border-primary transition-all shadow-sm"
                    title="Edit Product"
                    onClick={(e) => e.stopPropagation()}
                >
                    <Pencil className="h-4 w-4" />
                </button>
            </DialogTrigger>
            <DialogContent className="sm:max-w-[500px] max-h-[90vh] overflow-y-auto">
                <DialogHeader>
                    <DialogTitle className="text-2xl font-serif text-orange-700">Edit Product</DialogTitle>
                    <DialogDescription>
                        Update product details or delete this item.
                    </DialogDescription>
                </DialogHeader>

                <form onSubmit={form.handleSubmit(onSubmit)} className="space-y-4 py-4">

                    {/* Image Preview */}
                    <div className="flex justify-center mb-4">
                        <div
                            className="relative h-32 w-32 rounded-lg border-2 border-dashed border-orange-200 flex items-center justify-center cursor-pointer hover:bg-orange-50 transition-colors overflow-hidden group/image"
                            onClick={() => fileInputRef.current?.click()}
                        >
                            {previewUrl ? (
                                <>
                                    <img src={previewUrl} alt="Preview" className="h-full w-full object-cover" />
                                    <div className="absolute inset-0 bg-black/40 flex items-center justify-center opacity-0 group-hover/image:opacity-100 transition-opacity">
                                        <Pencil className="h-6 w-6 text-white" />
                                    </div>
                                </>
                            ) : (
                                <div className="text-center text-muted-foreground">
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
                        <Label>Fabric Name</Label>
                        <Input {...form.register('fabric_name')} />
                    </div>

                    <div className="grid gap-2">
                        <Label>Fabric Type</Label>
                        <Select
                            onValueChange={(value) => form.setValue('fabric_type', value)}
                            defaultValue={product.fabric_type}
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
                        <Label>Variation</Label>
                        <Input {...form.register('product_name')} />
                    </div>

                    <div className="grid gap-2">
                        <Label>Cost Price (₱)</Label>
                        <Input type="number" step="0.01" {...form.register('cost_price')} />
                    </div>

                    <DialogFooter className="flex items-center justify-between gap-2 sm:justify-between">
                        <AlertDialog>
                            <AlertDialogTrigger asChild>
                                <Button type="button" variant="destructive" className="gap-2">
                                    <Trash2 className="h-4 w-4" />
                                    Delete
                                </Button>
                            </AlertDialogTrigger>
                            <AlertDialogContent>
                                <AlertDialogHeader>
                                    <AlertDialogTitle>Are you absolutely sure?</AlertDialogTitle>
                                    <AlertDialogDescription>
                                        This action cannot be undone. This will permanently delete
                                        <span className="font-bold text-foreground"> {product.variation}</span> and remove it from your inventory.
                                    </AlertDialogDescription>
                                </AlertDialogHeader>
                                <AlertDialogFooter>
                                    <AlertDialogCancel>Cancel</AlertDialogCancel>
                                    <AlertDialogAction onClick={handleDelete} className="bg-destructive hover:bg-destructive/90">
                                        Delete Product
                                    </AlertDialogAction>
                                </AlertDialogFooter>
                            </AlertDialogContent>
                        </AlertDialog>

                        <div className="flex gap-2">
                            <Button type="button" variant="outline" onClick={() => setOpen(false)}>Cancel</Button>
                            <Button type="submit" disabled={loading}>
                                {loading ? 'Saving...' : 'Save Changes'}
                            </Button>
                        </div>
                    </DialogFooter>
                </form>
            </DialogContent>
        </Dialog>
    )
}
