import React from 'react';
import { ClipboardList, Truck, Package, XCircle, RotateCcw, CheckCircle2 } from 'lucide-react';
import { cn } from '@/lib/utils';

interface ShopeeStatusBadgeProps {
    status: string;
    className?: string;
}

export function ShopeeStatusBadge({ status, className }: ShopeeStatusBadgeProps) {
    const getStatusConfig = (status: string) => {
        const s = status?.toLowerCase() || '';
        
        // Default
        const defaultStyle = {
            icon: Package,
            color: 'text-gray-500',
            bgColor: 'bg-gray-100',
            borderColor: 'border-gray-200',
            label: status
        };

        if (s.includes('completed')) {
            return { 
                icon: CheckCircle2, 
                color: 'text-green-600', 
                bgColor: 'bg-green-50',
                borderColor: 'border-green-200',
                label: 'Completed'
            };
        }
        if (s.includes('delivered')) {
            return { 
                icon: Truck, 
                color: 'text-green-600', 
                bgColor: 'bg-green-50',
                borderColor: 'border-green-200',
                label: 'Delivered'
            };
        }
        if (s.includes('shipping') || s.includes('shipped')) {
            return { 
                icon: Truck, 
                color: 'text-orange-600', 
                bgColor: 'bg-orange-50',
                borderColor: 'border-orange-200',
                label: 'Shipping'
            };
        }
        if (s.includes('to ship') || s.includes('processed') || s.includes('ready')) {
            return { 
                icon: Package, 
                color: 'text-orange-600', 
                bgColor: 'bg-orange-50',
                borderColor: 'border-orange-200',
                label: 'To Ship'
            };
        }
        if (s.includes('cancel')) {
            return { 
                icon: XCircle, 
                color: 'text-red-600', 
                bgColor: 'bg-red-50',
                borderColor: 'border-red-200',
                label: 'Cancelled'
            };
        }
        if (s.includes('return') || s.includes('refund')) {
            return { 
                icon: RotateCcw, 
                color: 'text-red-600', 
                bgColor: 'bg-red-50',
                borderColor: 'border-red-200',
                label: 'Return/Refund'
            };
        }
        if (s.includes('unpaid')) {
            return { 
                icon: ClipboardList, 
                color: 'text-gray-600', 
                bgColor: 'bg-gray-100',
                borderColor: 'border-gray-200',
                label: 'Unpaid'
            };
        }

        return defaultStyle;
    };

    const config = getStatusConfig(status);
    const Icon = config.icon;

    return (
        <div className={cn(
            "flex items-center gap-2 px-2.5 py-0.5 rounded-full border w-fit",
            config.bgColor,
            config.borderColor,
            className
        )}>
            <Icon className={cn("h-4 w-4", config.color)} />
            <span className={cn("font-medium text-sm", config.color)}>
                {config.label || status}
            </span>
        </div>
    );
}
