import { supabase } from './supabase';
import {
    SHOPEE_CONFIG,
    SHOPEE_PATHS,
    generateShopeeSignature,
    isTokenExpired,
} from './shopee-config';

interface ShopeeCredentials {
    shop_id: number;
    access_token: string;
    refresh_token: string;
    access_token_expires_at: string;
    refresh_token_expires_at: string;
}

interface ShopeeOrderListParams {
    time_range_field?: 'create_time' | 'update_time';
    time_from: number;
    time_to: number;
    page_size?: number;
    cursor?: string;
    order_status?: 'UNPAID' | 'READY_TO_SHIP' | 'PROCESSED' | 'SHIPPED' | 'COMPLETED' | 'CANCELLED' | 'INVOICE_PENDING';
}

interface ShopeeOrderItem {
    item_id: number;
    item_name: string;
    item_sku: string;
    model_id: number;
    model_name: string;
    model_sku: string;
    model_quantity_purchased: number;
    model_original_price: number;
    model_discounted_price: number;
    product_name: string;
}

interface ShopeeOrderDetail {
    order_sn: string;
    order_status: string;
    create_time: number;
    update_time: number;
    days_to_ship: number;
    ship_by_date: number;
    buyer_user_id: number;
    buyer_username: string;
    estimated_shipping_fee: number;
    recipient_address: {
        name: string;
        phone: string;
        full_address: string;
        district: string;
        city: string;
        state: string;
        region: string;
        zipcode: string;
    };
    actual_shipping_fee: number;
    goods_to_declare: boolean;
    note: string;
    note_update_time: number;
    item_list: ShopeeOrderItem[];
    pay_time: number;
    dropshipper: string;
    credit_card_number: string;
    dropshipper_phone: string;
    split_up: boolean;
    buyer_cancel_reason: string;
    cancel_by: string;
    cancel_reason: string;
    actual_shipping_fee_confirmed: boolean;
    buyer_cpf_id: string;
    fulfillment_flag: string;
    pickup_done_time: number;
    package_list: any[];
    shipping_carrier: string;
    payment_method: string;
    total_amount: number;
    buyer_user_name: string;
    invoice_data: any;
    checkout_shipping_carrier: string;
    reverse_shipping_fee: number;
}

export interface ShopeeEscrowDetail {
    order_sn: string;
    buyer_user_name: string;
    return_refund_status: string;
    escrow_amount: number; // Final payout to seller
    escrow_tax: number;
    escrow_header_income: any;
    escrow_release_time: number;
    payout_amount: number;

    // Breakdown
    original_price: number;
    seller_discount: number;
    shopee_discount: number;
    voucher_from_seller: number;
    voucher_from_shopee: number;
    coins: number;
    buyer_total_amount: number;
    buyer_paid_shipping_fee: number;
    seller_paid_shipping_fee: number;
    reverse_shipping_fee: number;
    commission_fee: number;
    service_fee: number;
    transaction_fee: number;
    val_added_tax: number;
    drc_adjustable_refund: number;
    cost_of_goods_sold: number;
    original_cost_of_goods_sold: number;
    is_completed: boolean;
    order_income: {
        escrow_amount: number;
        buyer_total_amount: number;
        original_price: number;
        seller_discount: number;
        shopee_discount: number;
        voucher_from_seller: number;
        voucher_from_shopee: number;
        coins: number;
        buyer_paid_shipping_fee: number;
        seller_paid_shipping_fee: number;
        reverse_shipping_fee: number;
        commission_fee: number;
        service_fee: number;
        transaction_fee: number;
        val_added_tax: number;
        shopee_shipping_rebate: number;
        shipping_fee_discount_from_3pl: number;
        seller_shipping_discount: number;
        estimated_shipping_fee: number;
        seller_voucher_code: string[];
        drc_adjustable_refund: number;
        cost_of_goods_sold: number;
        original_cost_of_goods_sold: number;
        payout_amount: number;
        escrow_tax: number;
    };
}

/**
 * Get stored Shopee credentials for the current user
 */
export async function getShopeeCredentials(
    userId: string
): Promise<ShopeeCredentials | null> {
    const { data, error } = await supabase
        .from('shopee_credentials')
        .select('*')
        .eq('user_id', userId)
        .single();

    if (error || !data) {
        return null;
    }

    return data;
}

/**
 * Save Shopee credentials to database
 */
export async function saveShopeeCredentials(
    userId: string,
    credentials: Omit<ShopeeCredentials, 'user_id'>
): Promise<void> {
    const { error } = await supabase
        .from('shopee_credentials')
        .upsert({
            user_id: userId,
            ...credentials,
        });

    if (error) {
        throw new Error(`Failed to save credentials: ${error.message}`);
    }
}

/**
 * Exchange authorization code for access token
 */
export async function getAccessToken(
    code: string,
    shopId: number
): Promise<{
    access_token: string;
    refresh_token: string;
    access_token_expires_at: string;
    refresh_token_expires_at: string;
}> {
    const timestamp = Math.floor(Date.now() / 1000);
    const path = SHOPEE_PATHS.AUTH;

    const signature = generateShopeeSignature(
        SHOPEE_CONFIG.PARTNER_KEY,
        path,
        timestamp
    );

    const url = `${SHOPEE_CONFIG.BASE_URL}${SHOPEE_CONFIG.API_VERSION}${path}`;

    const body = {
        code,
        shop_id: shopId,
        partner_id: parseInt(SHOPEE_CONFIG.PARTNER_ID),
    };

    const response = await fetch(url, {
        method: 'POST',
        headers: {
            'Content-Type': 'application/json',
        },
        body: JSON.stringify({
            ...body,
            timestamp,
            sign: signature,
            partner_id: parseInt(SHOPEE_CONFIG.PARTNER_ID),
        }),
    });

    const data = await response.json();

    if (data.error) {
        throw new Error(`Shopee API error: ${data.message}`);
    }

    const now = Date.now();
    const accessTokenExpiresAt = new Date(now + data.expire_in * 1000).toISOString();
    const refreshTokenExpiresAt = new Date(now + 365 * 24 * 60 * 60 * 1000).toISOString();

    return {
        access_token: data.access_token,
        refresh_token: data.refresh_token,
        access_token_expires_at: accessTokenExpiresAt,
        refresh_token_expires_at: refreshTokenExpiresAt,
    };
}

/**
 * Refresh access token using refresh token
 */
export async function refreshAccessToken(
    refreshToken: string,
    shopId: number
): Promise<{
    access_token: string;
    refresh_token: string;
    access_token_expires_at: string;
    refresh_token_expires_at: string;
}> {
    const timestamp = Math.floor(Date.now() / 1000);
    const path = SHOPEE_PATHS.REFRESH_TOKEN;

    const signature = generateShopeeSignature(
        SHOPEE_CONFIG.PARTNER_KEY,
        path,
        timestamp
    );

    const url = `${SHOPEE_CONFIG.BASE_URL}${SHOPEE_CONFIG.API_VERSION}${path}`;

    const body = {
        refresh_token: refreshToken,
        shop_id: shopId,
        partner_id: parseInt(SHOPEE_CONFIG.PARTNER_ID),
    };

    const response = await fetch(url, {
        method: 'POST',
        headers: {
            'Content-Type': 'application/json',
        },
        body: JSON.stringify({
            ...body,
            timestamp,
            sign: signature,
        }),
    });

    const data = await response.json();

    if (data.error) {
        throw new Error(`Failed to refresh token: ${data.message}`);
    }

    const now = Date.now();
    const accessTokenExpiresAt = new Date(now + data.expire_in * 1000).toISOString();
    const refreshTokenExpiresAt = new Date(now + 365 * 24 * 60 * 60 * 1000).toISOString();

    return {
        access_token: data.access_token,
        refresh_token: data.refresh_token,
        access_token_expires_at: accessTokenExpiresAt,
        refresh_token_expires_at: refreshTokenExpiresAt,
    };
}

/**
 * Make authenticated request to Shopee API
 */
export async function makeShopeeRequest<T>(
    path: string,
    credentials: ShopeeCredentials,
    body: any = {}
): Promise<T> {
    // Check if token needs refresh
    if (isTokenExpired(new Date(credentials.access_token_expires_at))) {
        const newTokens = await refreshAccessToken(
            credentials.refresh_token,
            credentials.shop_id
        );

        // Update credentials in database
        await saveShopeeCredentials(credentials.shop_id.toString(), {
            ...credentials,
            ...newTokens,
        });

        credentials.access_token = newTokens.access_token;
        credentials.refresh_token = newTokens.refresh_token;
    }

    const timestamp = Math.floor(Date.now() / 1000);
    const signature = generateShopeeSignature(
        SHOPEE_CONFIG.PARTNER_KEY,
        path,
        timestamp,
        credentials.access_token,
        credentials.shop_id
    );

    const url = `${SHOPEE_CONFIG.BASE_URL}${SHOPEE_CONFIG.API_VERSION}${path}`;

    const requestBody = {
        ...body,
        partner_id: parseInt(SHOPEE_CONFIG.PARTNER_ID),
        shop_id: credentials.shop_id,
        timestamp,
        access_token: credentials.access_token,
        sign: signature,
    };

    const response = await fetch(url, {
        method: 'POST',
        headers: {
            'Content-Type': 'application/json',
        },
        body: JSON.stringify(requestBody),
    });

    const data = await response.json();

    if (data.error) {
        throw new Error(`Shopee API error: ${data.message || data.error}`);
    }

    return data.response as T;
}

/**
 * Get list of orders
 */
export async function getOrderList(
    credentials: ShopeeCredentials,
    params: ShopeeOrderListParams
): Promise<{
    order_list: Array<{ order_sn: string }>;
    more: boolean;
    next_cursor: string;
}> {
    return makeShopeeRequest(SHOPEE_PATHS.ORDER_LIST, credentials, params);
}

/**
 * Get detailed information for a specific order
 */
export async function getOrderDetail(
    credentials: ShopeeCredentials,
    orderSnList: string[]
): Promise<{
    order_list: ShopeeOrderDetail[];
}> {
    return makeShopeeRequest(SHOPEE_PATHS.ORDER_DETAIL, credentials, {
        order_sn_list: orderSnList,
    });
}

/**
 * Get escrow details (financials) for specific orders
 */
export async function getEscrowDetail(
    credentials: ShopeeCredentials,
    orderSnList: string[]
): Promise<{
    response: {
        escrow_list: ShopeeEscrowDetail[];
    };
}> {
    // Note: This endpoint might return failures for some orders if they are not yet completed/escrowed.
    // The API returns { failure_list: [], success_list: [] } usually, but let's check the actual response structure in docs or testing.
    // Standard V2 response format involves "response" wrapper which makeShopeeRequest handles.
    // But specific endpoint might have lists inside.
    return makeShopeeRequest(SHOPEE_PATHS.ESCROW_DETAIL, credentials, {
        order_sn_list: orderSnList,
    });
}
