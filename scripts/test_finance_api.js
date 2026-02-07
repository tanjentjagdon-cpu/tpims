
const { createClient } = require('@supabase/supabase-js');
const crypto = require('crypto');
require('dotenv').config({ path: '.env.local' });

const TIKTOK_APP_KEY = process.env.TIKTOK_APP_KEY;
const TIKTOK_APP_SECRET = process.env.TIKTOK_APP_SECRET;

function generateSignatureV2(path, params, body, appSecret) {
    const keys = Object.keys(params)
        .filter(k => k !== 'sign' && k !== 'access_token')
        .sort();

    let paramStr = '';
    for (const key of keys) {
        paramStr += key + params[key];
    }

    const stringToSign = appSecret + path + paramStr + body + appSecret;
    return crypto.createHmac('sha256', appSecret).update(stringToSign).digest('hex');
}

async function testFinance() {
    const supabase = createClient(
        process.env.NEXT_PUBLIC_SUPABASE_URL,
        process.env.SUPABASE_SERVICE_ROLE_KEY
    );

    // 1. Get Integration
    const { data: integration, error: intError } = await supabase
        .from('tiktok_integrations')
        .select('*')
        .limit(1)
        .single();

    if (intError || !integration) {
        console.error('No integration found in DB');
        return;
    }

    console.log('Using integration for:', integration.seller_name);

    async function callApi(path, method = 'GET') {
        const baseUrl = `https://open-api.tiktokglobalshop.com${path}`;
        const timestamp = Math.floor(Date.now() / 1000).toString();

        const params = {
            app_key: TIKTOK_APP_KEY,
            timestamp: timestamp,
            shop_cipher: integration.shop_cipher,
            page_size: '10'
        };

        const sortFields = {
            '/finance/202309/statements': 'statement_time',
            '/finance/202309/payments': 'create_time'
        };

        if (sortFields[path]) {
            params.sort_field = sortFields[path];
            params.sort_order = 'DESC';
        }

        const bodyStr = method === 'POST' ? '{}' : '';
        const sign = generateSignatureV2(path, params, bodyStr, TIKTOK_APP_SECRET);

        const url = new URL(baseUrl);
        Object.entries(params).forEach(([k, v]) => url.searchParams.append(k, v));
        url.searchParams.append('sign', sign);

        console.log(`Calling ${method}: ${url.toString()}`);
        const options = {
            method: method,
            headers: {
                'x-tts-access-token': integration.access_token
            }
        };
        if (method === 'POST') {
            options.headers['Content-Type'] = 'application/json';
            options.body = bodyStr;
        }

        const response = await fetch(url.toString(), options);
        const data = await response.json();
        return data;
    }

    async function callV1Api(path, method = 'POST') {
        const baseUrl = `https://open-api.tiktokglobalshop.com${path}`;
        const timestamp = Math.floor(Date.now() / 1000).toString();

        const params = {
            app_key: TIKTOK_APP_KEY,
            timestamp: timestamp,
            shop_id: integration.shop_id,
        };

        const bodyStr = method === 'POST' ? '{}' : '';
        const keys = Object.keys(params).sort();
        let paramStr = '';
        for (const k of keys) { paramStr += k + params[k]; }

        const stringToSign = TIKTOK_APP_SECRET + path + paramStr + bodyStr + TIKTOK_APP_SECRET;
        const sign = crypto.createHash('sha256').update(stringToSign).digest('hex');

        const url = new URL(baseUrl);
        Object.entries(params).forEach(([k, v]) => url.searchParams.append(k, v));
        url.searchParams.append('sign', sign);
        url.searchParams.append('access_token', integration.access_token);

        console.log(`Calling V1 ${method}: ${url.toString()}`);
        const response = await fetch(url.toString(), {
            method: method,
            headers: method === 'POST' ? { 'Content-Type': 'application/json' } : {},
            body: method === 'POST' ? bodyStr : undefined
        });
        const data = await response.json();
        return data;
    }

    async function callWithTime(path) {
        const fullPath = `/finance/202309${path}`;
        const baseUrl = `https://open-api.tiktokglobalshop.com${fullPath}`;
        const timestamp = Math.floor(Date.now() / 1000).toString();
        // 90 days ago
        const startTime = Math.floor(Date.now() / 1000) - (90 * 24 * 3600);

        const params = {
            app_key: TIKTOK_APP_KEY,
            timestamp: timestamp,
            shop_cipher: integration.shop_cipher,
            page_size: '20',
            sort_field: path.includes('statements') ? 'statement_time' : 'create_time',
            sort_order: 'DESC',
            start_time: startTime.toString()
        };

        const sign = generateSignatureV2(fullPath, params, '', TIKTOK_APP_SECRET);
        const url = new URL(baseUrl);
        Object.entries(params).forEach(([k, v]) => url.searchParams.append(k, v));
        url.searchParams.append('sign', sign);

        try {
            console.log(`Testing ${path} with start_time=${startTime}...`);
            const res = await fetch(url.toString(), { headers: { 'x-tts-access-token': integration.access_token } });
            const json = await res.json();
            console.log(`Code: ${json.code}, Msg: ${json.message}`);
            if (json.code === 0 && json.data) {
                const keys = Object.keys(json.data);
                console.log(`DATA KEYS: ${keys.join(', ')}`);
                // Log array length
                for (const k of keys) {
                    if (Array.isArray(json.data[k])) {
                        console.log(`  -> ${k}: ${json.data[k].length} items`);
                        if (json.data[k].length > 0) console.log(JSON.stringify(json.data[k][0], null, 2));
                    }
                }
            }
        } catch (e) {
            console.log(`Error ${e.message}`);
        }
    }

    console.log('\n--- Probing Time Ranges ---');
    await callWithTime('/statements');
    await callWithTime('/payments');
}

testFinance();
