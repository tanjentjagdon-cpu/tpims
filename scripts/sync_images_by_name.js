const { createClient } = require('@supabase/supabase-js');
require('dotenv').config({ path: '.env.local' });

const supabaseUrl = process.env.NEXT_PUBLIC_SUPABASE_URL;
const supabaseKey = process.env.SUPABASE_SERVICE_ROLE_KEY;
const supabase = createClient(supabaseUrl, supabaseKey);

async function syncImages() {
    console.log('--- Starting Image Sync By Name ---');

    // 1. Fetch all products
    const { data: products, error: prodError } = await supabase
        .from('products')
        .select('id, variation');

    if (prodError) {
        console.error('Error fetching products:', prodError);
        return;
    }

    // 2. Fetch all files in storage
    const { data: files, error: storageError } = await supabase
        .storage
        .from('product-images')
        .list();

    if (storageError) {
        console.error('Error listing storage files:', storageError);
        return;
    }

    console.log(`Found ${products.length} products and ${files.length} files in storage.`);

    let updatedCount = 0;

    for (const product of products) {
        // Try to find a file that matches the variation name
        // We check for variation.jpg, variation.png, variation.jpeg (case insensitive-ish)
        const variation = product.variation.trim();
        const matchingFile = files.find(f => {
            const fileNameWithoutExt = f.name.substring(0, f.name.lastIndexOf('.')) || f.name;
            return fileNameWithoutExt.toLowerCase() === variation.toLowerCase();
        });

        if (matchingFile) {
            const { data: { publicUrl } } = supabase
                .storage
                .from('product-images')
                .getPublicUrl(matchingFile.name);

            console.log(`Matching: "${variation}" -> ${matchingFile.name}`);

            const { error: updateError } = await supabase
                .from('products')
                .update({ image_url: publicUrl })
                .eq('id', product.id);

            if (updateError) {
                console.error(`   Failed to update ${variation}:`, updateError.message);
            } else {
                updatedCount++;
            }
        } else {
            // Optional: log which ones didn't match so user knows what names to fix
            // console.log(`No match for: "${variation}"`);
        }
    }

    console.log(`--- Sync Completed! ---`);
    console.log(`Total Products Updated: ${updatedCount}`);
    console.log(`Tip: Make sure filenames in Supabase storage match the "Variation" names exactly (e.g., "Apple Green #12.jpg").`);
}

syncImages();
