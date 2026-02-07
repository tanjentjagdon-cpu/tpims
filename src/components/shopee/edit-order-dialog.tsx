import { Button } from "@/components/ui/button"
import {
    Dialog,
    DialogContent,
    DialogDescription,
    DialogFooter,
    DialogHeader,
    DialogTitle,
    DialogTrigger,
} from "@/components/ui/dialog"
import { Input } from "@/components/ui/input"
import { Label } from "@/components/ui/label"
import {
    Select,
    SelectContent,
    SelectItem,
    SelectTrigger,
    SelectValue,
} from "@/components/ui/select"
import { Textarea } from "@/components/ui/textarea"
import { supabase } from "@/lib/supabase"
import { Edit, Loader2 } from "lucide-react"
import { useState } from "react"

interface EditOrderDialogProps {
    orderId: string
    currentData: {
        status: string
        tracking_number?: string
        shipping_provider?: string
        buyer_username?: string
        buyers_address?: string
        date_shipped?: string
        date_completed?: string
        date_paid?: string
    }
    onSuccess: () => void
}

export function EditOrderDialog({ orderId, currentData, onSuccess }: EditOrderDialogProps) {
    const [open, setOpen] = useState(false)
    const [loading, setLoading] = useState(false)
    const [formData, setFormData] = useState({
        status: currentData.status || '',
        tracking_number: currentData.tracking_number || '',
        shipping_provider: currentData.shipping_provider || '',
        buyer_username: currentData.buyer_username || '',
        buyers_address: currentData.buyers_address || '',
        date_shipped: currentData.date_shipped ? new Date(currentData.date_shipped).toISOString().split('T')[0] : '',
        date_completed: currentData.date_completed ? new Date(currentData.date_completed).toISOString().split('T')[0] : '',
        date_paid: currentData.date_paid ? new Date(currentData.date_paid).toISOString().split('T')[0] : '',
    })

    const handleSave = async () => {
        setLoading(true)
        try {
            // Update all rows with this order_id
            const { error } = await supabase
                .from('shopee_orders')
                .update({
                    status: formData.status,
                    tracking_number: formData.tracking_number || null,
                    shipping_provider: formData.shipping_provider || null,
                    buyer_username: formData.buyer_username || null,
                    buyers_address: formData.buyers_address || null,
                    date_shipped: formData.date_shipped ? new Date(formData.date_shipped).toISOString() : null,
                    date_completed: formData.date_completed ? new Date(formData.date_completed).toISOString() : null,
                    date_paid: formData.date_paid ? new Date(formData.date_paid).toISOString() : null,
                })
                .eq('order_id', orderId)

            if (error) throw error

            setOpen(false)
            onSuccess()
        } catch (error: any) {
            console.error('Error updating order:', error)
            alert('Failed to update order: ' + error.message)
        } finally {
            setLoading(false)
        }
    }

    return (
        <Dialog open={open} onOpenChange={setOpen}>
            <DialogTrigger asChild>
                <Button variant="outline" size="sm" className="gap-2">
                    <Edit className="h-4 w-4" />
                    Edit Details
                </Button>
            </DialogTrigger>
            <DialogContent className="sm:max-w-[600px]">
                <DialogHeader>
                    <DialogTitle>Edit Order Details</DialogTitle>
                    <DialogDescription>
                        Update information for Order ID: <span className="font-mono font-bold text-foreground">{orderId}</span>
                    </DialogDescription>
                </DialogHeader>
                <div className="grid gap-4 py-4">
                    <div className="grid grid-cols-2 gap-4">
                        <div className="space-y-2">
                            <Label htmlFor="status">Status</Label>
                            <Select 
                                value={formData.status} 
                                onValueChange={(val) => setFormData(prev => ({ ...prev, status: val }))}
                            >
                                <SelectTrigger>
                                    <SelectValue placeholder="Select status" />
                                </SelectTrigger>
                                <SelectContent>
                                    <SelectItem value="To Ship">To Ship</SelectItem>
                                    <SelectItem value="Shipping">Shipping</SelectItem>
                                    <SelectItem value="Completed">Completed</SelectItem>
                                    <SelectItem value="Cancelled">Cancelled</SelectItem>
                                    <SelectItem value="Returned">Returned</SelectItem>
                                </SelectContent>
                            </Select>
                        </div>
                        <div className="space-y-2">
                            <Label htmlFor="shipping_provider">Shipping Provider</Label>
                            <Input 
                                id="shipping_provider" 
                                value={formData.shipping_provider} 
                                onChange={(e) => setFormData(prev => ({ ...prev, shipping_provider: e.target.value }))}
                            />
                        </div>
                    </div>

                    <div className="grid grid-cols-2 gap-4">
                        <div className="space-y-2">
                            <Label htmlFor="tracking_number">Tracking Number</Label>
                            <Input 
                                id="tracking_number" 
                                value={formData.tracking_number} 
                                onChange={(e) => setFormData(prev => ({ ...prev, tracking_number: e.target.value }))}
                            />
                        </div>
                        <div className="space-y-2">
                            <Label htmlFor="buyer_username">Buyer Username</Label>
                            <Input 
                                id="buyer_username" 
                                value={formData.buyer_username} 
                                onChange={(e) => setFormData(prev => ({ ...prev, buyer_username: e.target.value }))}
                            />
                        </div>
                    </div>

                    <div className="space-y-2">
                        <Label htmlFor="buyers_address">Buyer's Address</Label>
                        <Textarea 
                            id="buyers_address" 
                            value={formData.buyers_address} 
                            onChange={(e) => setFormData(prev => ({ ...prev, buyers_address: e.target.value }))}
                            className="min-h-[80px]"
                        />
                    </div>

                    <div className="grid grid-cols-3 gap-4">
                        <div className="space-y-2">
                            <Label htmlFor="date_paid">Date Paid</Label>
                            <Input 
                                id="date_paid" 
                                type="date"
                                value={formData.date_paid} 
                                onChange={(e) => setFormData(prev => ({ ...prev, date_paid: e.target.value }))}
                            />
                        </div>
                        <div className="space-y-2">
                            <Label htmlFor="date_shipped">Date Shipped</Label>
                            <Input 
                                id="date_shipped" 
                                type="date"
                                value={formData.date_shipped} 
                                onChange={(e) => setFormData(prev => ({ ...prev, date_shipped: e.target.value }))}
                            />
                        </div>
                        <div className="space-y-2">
                            <Label htmlFor="date_completed">Date Completed</Label>
                            <Input 
                                id="date_completed" 
                                type="date"
                                value={formData.date_completed} 
                                onChange={(e) => setFormData(prev => ({ ...prev, date_completed: e.target.value }))}
                            />
                        </div>
                    </div>
                </div>
                <DialogFooter>
                    <Button variant="outline" onClick={() => setOpen(false)} disabled={loading}>
                        Cancel
                    </Button>
                    <Button onClick={handleSave} disabled={loading} className="bg-orange-600 hover:bg-orange-700">
                        {loading && <Loader2 className="mr-2 h-4 w-4 animate-spin" />}
                        Save Changes
                    </Button>
                </DialogFooter>
            </DialogContent>
        </Dialog>
    )
}
