const { createClient } = require('@supabase/supabase-js');
const fs = require('fs');
const path = require('path');
require('dotenv').config({ path: '.env.local' });

const supabaseUrl = process.env.NEXT_PUBLIC_SUPABASE_URL;
const supabaseKey = process.env.SUPABASE_SERVICE_ROLE_KEY;
const supabase = createClient(supabaseUrl, supabaseKey);

async function manualFix() {
    console.log('--- Applying Manual Image Fixes ---');

    const fixes = [
        { variation: 'Red #15', filePath: 'images/plain/Red #16.png' },
        { variation: 'Fucshia Pink #10', filePath: 'images/plain/Fuschia Pink #10.png' }
    ];

    for (const fix of fixes) {
        const fullPath = path.join(process.cwd(), fix.filePath);
        if (!fs.existsSync(fullPath)) {
            console.error(`File not found: ${fullPath}`);
            continue;
        }

        const fileBuffer = fs.readFileSync(fullPath);
        const fileName = path.basename(fix.filePath);
        const storagePath = `${Date.now()}-${fileName}`;

        console.log(`Fixing ${fix.variation} with ${fileName}...`);

        const { error: uploadError } = await supabase.storage
            .from('product-images')
            .upload(storagePath, fileBuffer, {
                contentType: 'image/png',
                upsert: true
            });

        if (uploadError) {
            console.error(`   Upload failed:`, uploadError.message);
            continue;
        }

        const { data: { publicUrl } } = supabase.storage
            .from('product-images')
            .getPublicUrl(storagePath);

        const { error: updateError } = await supabase
            .from('products')
            .update({ image_url: publicUrl })
            .eq('variation', fix.variation);

        if (updateError) {
            console.error(`   Update failed:`, updateError.message);
        } else {
            console.log(`   Successfully linked ${fix.variation}`);
        }
    }

    console.log('--- Manual Fixes Completed ---');
}

manualFix();
