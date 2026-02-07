import crypto from 'crypto';

export const SHOPEE_CONFIG = {
    PARTNER_ID: process.env.SHOPEE_PARTNER_ID || '',
    PARTNER_KEY: process.env.SHOPEE_PARTNER_KEY || '',
    REDIRECT_URL: process.env.SHOPEE_REDIRECT_URL || 'http://localhost:3000/api/shopee/callback',
    BASE_URL: 'https://partner.shopeemobile.com',
    API_VERSION: '/api/v2',
} as const;

export const SHOPEE_PATHS = {
    AUTH: '/auth/token/get',
    AUTH_PARTNER: '/auth/partner/get',
    REFRESH_TOKEN: '/auth/access_token/get',
    ORDER_LIST: '/order/get_order_list',
    ORDER_DETAIL: '/order/get_order_detail',
    ESCROW_DETAIL: '/payment/get_escrow_detail',
} as const;

/**
 * Generate HMAC SHA256 signature for Shopee API requests
 */
export function generateShopeeSignature(
    partnerKey: string,
    path: string,
    timestamp: number,
    accessToken?: string,
    shopId?: number
): string {
    const partnerId = SHOPEE_CONFIG.PARTNER_ID;

    let baseString = `${partnerId}${path}${timestamp}`;

    if (accessToken && shopId) {
        baseString = `${partnerId}${path}${timestamp}${accessToken}${shopId}`;
    }

    const hmac = crypto.createHmac('sha256', partnerKey);
    hmac.update(baseString);
    return hmac.digest('hex');
}

/**
 * Generate authorization URL for Shopee OAuth
 */
export function generateShopeeAuthUrl(): string {
    const timestamp = Math.floor(Date.now() / 1000);
    const path = SHOPEE_PATHS.AUTH_PARTNER;
    const redirectUrl = SHOPEE_CONFIG.REDIRECT_URL;

    const signature = generateShopeeSignature(
        SHOPEE_CONFIG.PARTNER_KEY,
        path,
        timestamp
    );

    const params = new URLSearchParams({
        partner_id: SHOPEE_CONFIG.PARTNER_ID,
        redirect: redirectUrl,
        sign: signature,
        timestamp: timestamp.toString(),
    });

    return `${SHOPEE_CONFIG.BASE_URL}${path}?${params.toString()}`;
}

/**
 * Check if access token is expired or will expire in the next 5 minutes
 */
export function isTokenExpired(expiresAt: Date): boolean {
    const now = new Date();
    const buffer = 5 * 60 * 1000; // 5 minutes in milliseconds
    return now.getTime() >= (new Date(expiresAt).getTime() - buffer);
}
