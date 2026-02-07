import { NextRequest, NextResponse } from 'next/server';
import { getAccessToken, saveShopeeCredentials } from '@/lib/shopee-api';
import { supabase } from '@/lib/supabase';

/**
 * Handle Shopee OAuth callback
 * This endpoint receives the authorization code from Shopee after user authorization
 */
export async function GET(request: NextRequest) {
    const searchParams = request.nextUrl.searchParams;
    const code = searchParams.get('code');
    const shopId = searchParams.get('shop_id');
    const error = searchParams.get('error');

    // Handle authorization errors
    if (error || !code || !shopId) {
        return NextResponse.redirect(
            new URL(
                `/dashboard/shopee?error=${encodeURIComponent(
                    error || 'Authorization failed'
                )}`,
                request.url
            )
        );
    }

    try {
        // Get current user - note: API routes don't have auth context by default
        // User must be logged in before starting OAuth flow
        const {
            data: { user },
        } = await supabase.auth.getUser();

        if (!user) {
            return NextResponse.redirect(
                new URL('/login?error=Unauthorized', request.url)
            );
        }
        // Exchange code for access token
        const tokens = await getAccessToken(code, parseInt(shopId));

        // Save credentials to database
        await saveShopeeCredentials(user.id, {
            shop_id: parseInt(shopId),
            ...tokens,
        });

        // Redirect back to Shopee page with success message
        return NextResponse.redirect(
            new URL(
                '/dashboard/shopee?success=Shopee account connected successfully',
                request.url
            )
        );
    } catch (error: any) {
        console.error('Shopee OAuth callback error:', error);
        return NextResponse.redirect(
            new URL(
                `/dashboard/shopee?error=${encodeURIComponent(
                    error.message || 'Failed to connect Shopee account'
                )}`,
                request.url
            )
        );
    }
}
