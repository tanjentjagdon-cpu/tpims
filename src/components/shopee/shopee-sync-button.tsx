'use client';

import { Button } from '@/components/ui/button';
import {
    Dialog,
    DialogContent,
    DialogDescription,
    DialogFooter,
    DialogHeader,
    DialogTitle,
    DialogTrigger,
} from '@/components/ui/dialog';
import { Alert, AlertDescription } from '@/components/ui/alert';
import { Loader2, RefreshCw, ExternalLink, CheckCircle2, XCircle } from 'lucide-react';
import { useState, useEffect } from 'react';
import {
    getShopeeAuthUrl,
    checkShopeeConnection,
    syncShopeeOrders,
} from '@/app/dashboard/shopee/actions';

interface ShopeeSyncButtonProps {
    onSuccess: () => void;
    triggerClassName?: string;
    triggerSize?: 'default' | 'sm' | 'lg' | 'icon';
    triggerVariant?:
    | 'default'
    | 'destructive'
    | 'outline'
    | 'secondary'
    | 'ghost'
    | 'link';
}

export function ShopeeSyncButton({
    onSuccess,
    triggerClassName,
    triggerSize = 'default',
    triggerVariant,
}: ShopeeSyncButtonProps) {
    const [open, setOpen] = useState(false);
    const [loading, setLoading] = useState(false);
    const [checking, setChecking] = useState(true);
    const [connected, setConnected] = useState(false);
    const [shopId, setShopId] = useState<number | null>(null);
    const [error, setError] = useState<string | null>(null);
    const [success, setSuccess] = useState<string | null>(null);
    const [daysBack, setDaysBack] = useState(30);

    // Check connection status
    useEffect(() => {
        const checkConnection = async () => {
            setChecking(true);
            const result = await checkShopeeConnection();
            setConnected(result.connected);
            if (result.shop_id) {
                setShopId(result.shop_id);
            }
            setChecking(false);
        };

        if (open) {
            checkConnection();
        }
    }, [open]);

    const handleAuthorize = async () => {
        setLoading(true);
        setError(null);

        try {
            const result = await getShopeeAuthUrl();
            if (result.success && result.url) {
                // Open authorization URL in new window
                window.open(result.url, '_blank');
                setSuccess('Authorization window opened. Please complete the authorization and refresh this page.');
            } else {
                setError(result.error || 'Failed to generate authorization URL');
            }
        } catch (err: any) {
            setError(err.message || 'Failed to start authorization');
        } finally {
            setLoading(false);
        }
    };

    const handleSync = async () => {
        setLoading(true);
        setError(null);
        setSuccess(null);

        try {
            const result = await syncShopeeOrders({ daysback: daysBack });

            if (result.success) {
                setSuccess(result.message || `Successfully synced ${result.count} orders`);
                setTimeout(() => {
                    setOpen(false);
                    onSuccess();
                }, 2000);
            } else {
                setError(result.error || 'Failed to sync orders');
            }
        } catch (err: any) {
            setError(err.message || 'Failed to sync orders');
        } finally {
            setLoading(false);
        }
    };

    return (
        <Dialog open={open} onOpenChange={setOpen}>
            <DialogTrigger asChild>
                <Button
                    variant={triggerVariant}
                    size={triggerSize}
                    className={
                        triggerClassName ||
                        'bg-orange-600 hover:bg-orange-700 text-white shadow-lg shadow-orange-200'
                    }
                >
                    <RefreshCw className="mr-2 h-4 w-4" />
                    Sync from Shopee API
                </Button>
            </DialogTrigger>
            <DialogContent className="sm:max-w-[500px]">
                <DialogHeader>
                    <DialogTitle>Sync Shopee Orders</DialogTitle>
                    <DialogDescription>
                        Automatically fetch orders from Shopee using the official API
                    </DialogDescription>
                </DialogHeader>

                <div className="space-y-4 py-4">
                    {checking ? (
                        <div className="flex items-center justify-center py-8">
                            <Loader2 className="h-6 w-6 animate-spin text-orange-500" />
                            <span className="ml-2 text-sm text-muted-foreground">
                                Checking connection...
                            </span>
                        </div>
                    ) : !connected ? (
                        <div className="space-y-4">
                            <Alert>
                                <AlertDescription>
                                    You need to authorize your Shopee seller account first before
                                    syncing orders.
                                </AlertDescription>
                            </Alert>

                            <div className="space-y-2">
                                <p className="text-sm text-muted-foreground">
                                    <strong>Before authorizing:</strong>
                                </p>
                                <ol className="list-decimal list-inside text-sm text-muted-foreground space-y-1 ml-2">
                                    <li>
                                        You need Partner ID and Partner Key from{' '}
                                        <a
                                            href="https://open.shopee.com"
                                            target="_blank"
                                            rel="noopener noreferrer"
                                            className="text-orange-600 hover:underline inline-flex items-center gap-1"
                                        >
                                            Shopee Open Platform
                                            <ExternalLink className="h-3 w-3" />
                                        </a>
                                    </li>
                                    <li>Add them to your .env.local file</li>
                                    <li>Restart your development server</li>
                                    <li>Click "Authorize Shopee Account" below</li>
                                </ol>
                            </div>

                            <Button
                                onClick={handleAuthorize}
                                disabled={loading}
                                className="w-full bg-orange-600 hover:bg-orange-700"
                            >
                                {loading ? (
                                    <>
                                        <Loader2 className="mr-2 h-4 w-4 animate-spin" />
                                        Opening...
                                    </>
                                ) : (
                                    <>
                                        <ExternalLink className="mr-2 h-4 w-4" />
                                        Authorize Shopee Account
                                    </>
                                )}
                            </Button>
                        </div>
                    ) : (
                        <div className="space-y-4">
                            <Alert className="border-green-200 bg-green-50">
                                <CheckCircle2 className="h-4 w-4 text-green-600" />
                                <AlertDescription className="text-green-800">
                                    Connected to Shopee (Shop ID: {shopId})
                                </AlertDescription>
                            </Alert>

                            <div className="space-y-2">
                                <label className="text-sm font-medium">
                                    Sync orders from last:
                                </label>
                                <select
                                    value={daysBack}
                                    onChange={(e) => setDaysBack(parseInt(e.target.value))}
                                    className="w-full rounded-md border border-input bg-background px-3 py-2 text-sm"
                                    disabled={loading}
                                >
                                    <option value={7}>7 days</option>
                                    <option value={15}>15 days</option>
                                    <option value={30}>30 days</option>
                                    <option value={60}>60 days</option>
                                    <option value={90}>90 days</option>
                                </select>
                            </div>

                            <Button
                                onClick={handleSync}
                                disabled={loading}
                                className="w-full bg-orange-600 hover:bg-orange-700"
                            >
                                {loading ? (
                                    <>
                                        <Loader2 className="mr-2 h-4 w-4 animate-spin" />
                                        Syncing...
                                    </>
                                ) : (
                                    <>
                                        <RefreshCw className="mr-2 h-4 w-4" />
                                        Sync Orders
                                    </>
                                )}
                            </Button>
                        </div>
                    )}

                    {error && (
                        <Alert variant="destructive">
                            <XCircle className="h-4 w-4" />
                            <AlertDescription>{error}</AlertDescription>
                        </Alert>
                    )}

                    {success && (
                        <Alert className="border-green-200 bg-green-50">
                            <CheckCircle2 className="h-4 w-4 text-green-600" />
                            <AlertDescription className="text-green-800">
                                {success}
                            </AlertDescription>
                        </Alert>
                    )}
                </div>

                <DialogFooter>
                    <Button variant="outline" onClick={() => setOpen(false)}>
                        Close
                    </Button>
                </DialogFooter>
            </DialogContent>
        </Dialog>
    );
}
