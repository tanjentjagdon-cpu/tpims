require('dotenv').config({ path: '.env.local' });
const { createClient } = require('@supabase/supabase-js');

const supabaseUrl = process.env.NEXT_PUBLIC_SUPABASE_URL;
const supabaseKey = process.env.SUPABASE_SERVICE_ROLE_KEY;
const supabase = createClient(supabaseUrl, supabaseKey);

async function inspectProduct() {
    // Check the 'Light Pink' product
    const { data: products, error } = await supabase
        .from('products')
        .select('*')
        .ilike('product_name', 'Light Pink')
        .ilike('fabric_name', 'Geena Cloth');

    if (error) {
        console.error('Error fetching products:', error);
        return;
    }

    console.log('Product State:', products);
}

inspectProduct();
