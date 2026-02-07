
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

async function testV1Signature() {
    const supabase = createClient(
        process.env.NEXT_PUBLIC_SUPABASE_URL,
        process.env.SUPABASE_SERVICE_ROLE_KEY
    );

    const { data: integration } = await supabase
        .from('tiktok_integrations')
        .select('*')
        .limit(1)
        .single();

    if (!integration) {
        console.error('No integration found');
        return;
    }

    console.log('Testing V1 Signatures for Shop ID:', integration.shop_id);

    async function callParam(path, version) {
        const fullPath = `/finance/${version}${path}`;
        const baseUrl = `https://open-api.tiktokglobalshop.com${fullPath}`;
        const timestamp = Math.floor(Date.now() / 1000).toString();

        const params = {
            app_key: TIKTOK_APP_KEY,
            timestamp: timestamp,
            shop_cipher: integration.shop_cipher,
            page_size: '5'
        };

        const sign = generateSignatureV2(fullPath, params, '', TIKTOK_APP_SECRET);
        const url = new URL(baseUrl);
        Object.entries(params).forEach(([k, v]) => url.searchParams.append(k, v));
        url.searchParams.append('sign', sign);

        try {
            const res = await fetch(url.toString(), { headers: { 'x-tts-access-token': integration.access_token } });
            const json = await res.json();
            console.log(`[${version}] ${path}: ${json.code} - ${json.message}`);
            if (json.code === 0 && json.data) {
                const keys = Object.keys(json.data);
                const count = json.data[keys.find(k => Array.isArray(json.data[k]))]?.length || 0;
                console.log(`   -> Found ${count} items. Keys: ${keys.join(', ')}`);
            }
        } catch (e) {
            console.log(`[${version}] ${path}: Error ${e.message}`);
        }
    }

    console.log('\n--- Probing Versions ---');
    const versions = ['202309', '202312', '202404', '202405', '202406', '202409', '202501'];
    const endpoints = ['/settlements', '/statements', '/payments', '/transactions', '/financial_statements'];

    for (const v of versions) {
        for (const e of endpoints) {
            await callParam(e, v);
        }
    }
}

testV1Signature();
