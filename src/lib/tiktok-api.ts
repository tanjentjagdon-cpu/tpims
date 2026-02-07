
import { createClient } from '@supabase/supabase-js'
import crypto from 'crypto'

const TIKTOK_APP_KEY = process.env.TIKTOK_APP_KEY
const TIKTOK_APP_SECRET = process.env.TIKTOK_APP_SECRET
// Use localhost for local development
const REDIRECT_URI = 'http://localhost:3000/api/tiktok/callback'

export function getTikTokAuthUrl() {
    // Construct the authorization URL
    // Documentation: https://partner.tiktokshop.com/docv2/page/63fd743c715dd002b8d47b0a
    // Note: The actual endpoint depends on the region. Assuming Cross-border or specific region.
    // Common endpoint: https://auth.tiktok-shops.com/oauth/authorize
    // User reported correct endpoint: https://services.tiktokshop.com/open/authorize

    const baseUrl = 'https://services.tiktokshop.com/open/authorize'
    const params = new URLSearchParams({
        app_key: TIKTOK_APP_KEY!,
        state: 'random_string', // In production, use a secure random string
        redirect_uri: REDIRECT_URI,
        scope: 'seller.order.info,seller.fulfillment.package,seller.shop.info,seller.product.info'
    })

    return `${baseUrl}?${params.toString()}`
}

export async function exchangeTikTokToken(code: string) {
    const url = 'https://auth.tiktok-shops.com/api/v2/token/get'
    const params = new URLSearchParams({
        app_key: TIKTOK_APP_KEY!,
        app_secret: TIKTOK_APP_SECRET!,
        auth_code: code,
        grant_type: 'authorized_code'
    })

    const response = await fetch(`${url}?${params.toString()}`)
    const data = await response.json()

    if (data.code !== 0) {
        throw new Error(`TikTok Auth Error: ${data.message}`)
    }

    return data.data // Contains access_token, refresh_token, etc.
}

function generateSignature(path: string, params: Record<string, string>, appSecret: string) {
    // 1. Filter out sign and access_token, and sort keys
    const keys = Object.keys(params)
        .filter(k => k !== 'sign' && k !== 'access_token')
        .sort()

    // 2. Concatenate key+value
    let paramStr = ''
    for (const key of keys) {
        paramStr += key + params[key]
    }

    // 3. Construct string to sign: app_secret + path + params_str + app_secret
    // Note: This is a common variation. 
    // Another variation is: path + params_str
    // Let's try the "app_secret + path + params_str + app_secret" first as it's common in older TikTok APIs,
    // BUT for "Open API V2" (202309), the documentation often specifies:
    // sign = hmac_sha256(app_secret, app_key + path + sorted_params + body + app_key) ??

    // Let's stick to the official doc structure (if we could see it).
    // Based on error logs from similar integrations:
    // StringToSign = app_secret + path + sorted_params_string + body + app_secret

    // However, since we are doing HMAC, we use app_secret as key.
    // The plaintext is usually: path + sorted_params_string + body (if body exists)
    // Wait, let's look at the error message again: "The request does not include a required signature in the query."

    // Let's try the V2 signature:
    // plaintext = app_secret + path + sorted_params + body + app_secret
    // sign = hmac_sha256(app_secret, plaintext)

    return crypto.createHmac('sha256', appSecret).update(path + paramStr).digest('hex')
}

function generateSignatureV2(path: string, params: Record<string, string>, body: string, appSecret: string) {
    // Filter and sort keys
    const keys = Object.keys(params)
        .filter(k => k !== 'sign' && k !== 'access_token')
        .sort()

    let paramStr = ''
    for (const key of keys) {
        paramStr += key + params[key]
    }

    // Structure: app_secret + path + params + body + app_secret
    // Then HMAC-SHA256 with app_secret
    const stringToSign = appSecret + path + paramStr + body + appSecret

    return crypto.createHmac('sha256', appSecret).update(stringToSign).digest('hex')
}

export async function getAuthorizedShops(accessToken: string) {
    const path = '/authorization/202309/shops'
    const baseUrl = `https://open-api.tiktokglobalshop.com${path}`
    const timestamp = Math.floor(Date.now() / 1000).toString()

    const params: Record<string, string> = {
        app_key: TIKTOK_APP_KEY!,
        timestamp: timestamp,
    }

    const sign = generateSignatureV2(path, params, '', TIKTOK_APP_SECRET!)

    const url = new URL(baseUrl)
    Object.entries(params).forEach(([k, v]) => url.searchParams.append(k, v))
    url.searchParams.append('sign', sign)

    const response = await fetch(url.toString(), {
        method: 'GET',
        headers: {
            'x-tts-access-token': accessToken
        }
    }).catch(err => {
        throw new Error(`Get Shops Fetch Failed: ${err.message}`)
    })

    const data = await response.json()
    if (data.code !== 0) throw new Error(`Get Shops Error: ${data.message} (Code: ${data.code})`)

    return data.data
}

export async function getTikTokOrders(accessToken: string, shopId: string, shopCipher: string, pageToken: string = '', status?: string, startTimestamp?: number, endTimestamp?: number) {
    if (!accessToken) throw new Error('Missing access_token')
    if (!shopCipher) throw new Error('Missing shop_cipher')
    if (!TIKTOK_APP_KEY) throw new Error('Missing TIKTOK_APP_KEY')
    if (!TIKTOK_APP_SECRET) throw new Error('Missing TIKTOK_APP_SECRET')

    const path = '/order/202309/orders/search'
    const baseUrl = `https://open-api.tiktokglobalshop.com${path}`
    const timestamp = Math.floor(Date.now() / 1000).toString()

    // V2 API Query Parameters: app_key, timestamp, shop_cipher, sign
    const params: Record<string, string> = {
        app_key: TIKTOK_APP_KEY,
        timestamp: timestamp,
        shop_cipher: shopCipher,
        page_size: '100' // Increased to max 100 to reduce pagination needs
    }

    // Construct Body
    // Start from October 1, 2025 (shop started in Oct 2025) if no specific start time provided
    const defaultStart = new Date('2025-10-01T00:00:00Z').getTime() / 1000
    const body: any = {
        create_time_ge: startTimestamp ? Math.floor(startTimestamp) : Math.floor(defaultStart)
    }

    if (endTimestamp) {
        body.create_time_le = Math.floor(endTimestamp)
    }

    if (pageToken) body.page_token = pageToken
    if (status) body.order_status = status // Status must be string (e.g. 'UNPAID')

    const bodyStr = JSON.stringify(body)

    const sign = generateSignatureV2(path, params, bodyStr, TIKTOK_APP_SECRET)

    const url = new URL(baseUrl)
    Object.entries(params).forEach(([k, v]) => url.searchParams.append(k, v))
    url.searchParams.append('sign', sign)

    console.log(`Fetching Orders (Status ${status}): ${url.toString()}`)
    console.log(`Request Body: ${bodyStr}`)

    const response = await fetch(url.toString(), {
        method: 'POST',
        headers: {
            'Content-Type': 'application/json',
            'x-tts-access-token': accessToken
        },
        body: bodyStr
    }).catch(err => {
        console.error('Fetch error details:', err)
        throw new Error(`Fetch Failed: ${err.message}${err.cause ? ` (Cause: ${err.cause})` : ''}`)
    })

    const data = await response.json()
    console.log(`TikTok API Response (Status ${status}):`, JSON.stringify(data, null, 2))

    if (data.code !== 0) {
        throw new Error(`TikTok Order Fetch Error: ${data.message} (Code: ${data.code}, RequestId: ${data.request_id})`)
    }

    return data.data
}

export async function getTikTokProducts(accessToken: string, shopId: string, shopCipher: string) {
    if (!accessToken) throw new Error('Missing access_token')
    if (!shopCipher) throw new Error('Missing shop_cipher')
    if (!TIKTOK_APP_KEY) throw new Error('Missing TIKTOK_APP_KEY')
    if (!TIKTOK_APP_SECRET) throw new Error('Missing TIKTOK_APP_SECRET')

    const path = '/product/202309/products/search'
    const baseUrl = `https://open-api.tiktokglobalshop.com${path}`
    const timestamp = Math.floor(Date.now() / 1000).toString()

    // V2 API Query Parameters
    const params: Record<string, string> = {
        app_key: TIKTOK_APP_KEY,
        timestamp: timestamp,
        shop_cipher: shopCipher,
        page_size: '50'
    }

    // Body for search
    const body = {
        // page_size: 20
    }
    const bodyStr = JSON.stringify(body)

    const sign = generateSignatureV2(path, params, bodyStr, TIKTOK_APP_SECRET)

    const url = new URL(baseUrl)
    Object.entries(params).forEach(([k, v]) => url.searchParams.append(k, v))
    url.searchParams.append('sign', sign)

    console.log(`Fetching Products: ${url.toString()}`)

    const response = await fetch(url.toString(), {
        method: 'POST',
        headers: {
            'Content-Type': 'application/json',
            'x-tts-access-token': accessToken
        },
        body: bodyStr
    }).catch(err => {
        // Detailed error for "fetch failed"
        console.error('Fetch error details:', err)
        throw new Error(`Products Fetch Failed: ${err.message}${err.cause ? ` (Cause: ${err.cause})` : ''}`)
    })

    const data = await response.json()
    console.log('TikTok Products Response:', JSON.stringify(data, null, 2))

    if (data.code !== 0) {
        throw new Error(`TikTok Products Error: ${data.message} (Code: ${data.code}, RequestId: ${data.request_id})`)
    }

    return data.data
}

export async function getTikTokSettlements(accessToken: string, shopCipher: string, pageToken: string = '') {
    // Note: For some local shops, this endpoint might not be available or 
    // requires different permissions. We return an empty list if it fails.
    try {
        if (!accessToken) throw new Error('Missing access_token')
        if (!shopCipher) throw new Error('Missing shop_cipher')

        const path = '/finance/202309/settlements'
        const baseUrl = `https://open-api.tiktokglobalshop.com${path}`
        const timestamp = Math.floor(Date.now() / 1000).toString()

        const params: any = {
            app_key: TIKTOK_APP_KEY!,
            timestamp: timestamp,
            shop_cipher: shopCipher,
            page_size: '20'
        }

        if (pageToken) params.page_token = pageToken

        const bodyStr = ''
        const sign = generateSignatureV2(path, params, bodyStr, TIKTOK_APP_SECRET!)

        const url = new URL(baseUrl)
        Object.entries(params).forEach(([k, v]) => url.searchParams.append(k, v as string))
        url.searchParams.append('sign', sign)

        const response = await fetch(url.toString(), {
            method: 'GET',
            headers: {
                'x-tts-access-token': accessToken
            }
        })

        const data = await response.json()
        return data
    } catch (e) {
        console.error('getTikTokSettlements internal error:', e)
        return { code: -1, message: 'Internal Error', data: null }
    }
}

export async function getTikTokStatements(accessToken: string, shopCipher: string, pageToken: string = '') {
    if (!accessToken) throw new Error('Missing access_token')
    if (!shopCipher) throw new Error('Missing shop_cipher')

    const path = '/finance/202309/statements'
    const baseUrl = `https://open-api.tiktokglobalshop.com${path}`
    const timestamp = Math.floor(Date.now() / 1000).toString()

    const params: any = {
        app_key: TIKTOK_APP_KEY!,
        timestamp: timestamp,
        shop_cipher: shopCipher,
        page_size: '20',
        sort_field: 'statement_time',
        sort_order: 'DESC'
    }

    // Default to 180 days ago if not submitting a page token (initial load)
    if (!pageToken) {
        const startTime = Math.floor(Date.now() / 1000) - (180 * 24 * 3600)
        params.start_time = startTime.toString()
    } else {
        params.page_token = pageToken
    }

    const bodyStr = ''
    const sign = generateSignatureV2(path, params, bodyStr, TIKTOK_APP_SECRET!)

    const url = new URL(baseUrl)
    Object.entries(params).forEach(([k, v]) => url.searchParams.append(k, v as string))
    url.searchParams.append('sign', sign)

    const response = await fetch(url.toString(), {
        method: 'GET',
        headers: {
            'x-tts-access-token': accessToken
        }
    })

    const data = await response.json()
    return data
}

export async function getTikTokPayments(accessToken: string, shopCipher: string, pageToken: string = '') {
    if (!accessToken) throw new Error('Missing access_token')
    if (!shopCipher) throw new Error('Missing shop_cipher')

    const path = '/finance/202309/payments'
    const baseUrl = `https://open-api.tiktokglobalshop.com${path}`
    const timestamp = Math.floor(Date.now() / 1000).toString()

    const params: any = {
        app_key: TIKTOK_APP_KEY!,
        timestamp: timestamp,
        shop_cipher: shopCipher,
        page_size: '20',
        sort_field: 'create_time',
        sort_order: 'DESC'
    }

    // Default to 180 days ago if not submitting a page token
    if (!pageToken) {
        const startTime = Math.floor(Date.now() / 1000) - (180 * 24 * 3600)
        params.start_time = startTime.toString()
    } else {
        params.page_token = pageToken
    }

    const bodyStr = ''
    const sign = generateSignatureV2(path, params, bodyStr, TIKTOK_APP_SECRET!)

    const url = new URL(baseUrl)
    Object.entries(params).forEach(([k, v]) => url.searchParams.append(k, v as string))
    url.searchParams.append('sign', sign)

    const response = await fetch(url.toString(), {
        method: 'GET',
        headers: {
            'x-tts-access-token': accessToken
        }
    })

    const data = await response.json()
    return data
}
