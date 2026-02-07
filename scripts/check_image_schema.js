require('dotenv').config({ path: '.env.local' });
const { createClient } = require('@supabase/supabase-js');

const supabase = createClient(process.env.NEXT_PUBLIC_SUPABASE_URL, process.env.SUPABASE_SERVICE_ROLE_KEY);

async function checkSchema() {
    // Try to select image_url from products to see if it errors
    const { data, error } = await supabase
        .from('products')
        .select('image_url')
        .limit(1);

    if (error) {
        console.log('Column check error:', error.message);
    } else {
        console.log('Column image_url exists on products.');
    }
}

checkSchema();
