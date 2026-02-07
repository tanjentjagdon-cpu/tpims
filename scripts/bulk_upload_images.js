const { createClient } = require('@supabase/supabase-js');
const fs = require('fs');
const path = require('path');
require('dotenv').config({ path: '.env.local' });

const supabaseUrl = process.env.NEXT_PUBLIC_SUPABASE_URL;
const supabaseKey = process.env.SUPABASE_SERVICE_ROLE_KEY;
const supabase = createClient(supabaseUrl, supabaseKey);

const IMAGES_DIR = path.join(process.cwd(), 'images');

async function uploadAndSync() {
    console.log('--- Starting Bulk Image Upload and Sync ---');

    // 1. Fetch all products to have a local map for variation matching
    const { data: products, error: prodError } = await supabase
        .from('products')
        .select('id, variation, fabric_type');

    if (prodError) {
        console.error('Error fetching products:', prodError);
        return;
    }

    const subDirs = ['plain', 'printed'];
    let totalUploaded = 0;
    let totalLinked = 0;

    for (const subDir of subDirs) {
        const dirPath = path.join(IMAGES_DIR, subDir);
        if (!fs.existsSync(dirPath)) {
            console.warn(`Directory not found: ${dirPath}`);
            continue;
        }

        const files = fs.readdirSync(dirPath);
        console.log(`Processing ${subDir}: ${files.length} files`);

        for (const fileName of files) {
            const filePath = path.join(dirPath, fileName);
            const fileStat = fs.statSync(filePath);

            if (fileStat.isDirectory()) continue;

            const fileBuffer = fs.readFileSync(filePath);
            const fileExt = path.extname(fileName).toLowerCase();
            const fileNameWithoutExt = path.basename(fileName, fileExt).trim();

            // Simple sanitation for matching
            const sanitize = (str) => str.toLowerCase().replace(/[^a-z0-9]/g, '');
            const sanitizedFileName = sanitize(fileNameWithoutExt);

            // Find matching product
            // We search for products of the same type (plain/printed)
            const type = subDir === 'plain' ? 'Plain' : 'Printed';

            // Try exact match first
            let matchedProduct = products.find(p =>
                p.fabric_type === type && sanitize(p.variation) === sanitizedFileName
            );

            // Special mapping for printed if not found
            if (!matchedProduct && subDir === 'printed') {
                // Handle "Apple Green- ER Rose" -> "ER Rose Apple Green"
                if (fileNameWithoutExt.includes('-')) {
                    const parts = fileNameWithoutExt.split('-').map(p => p.trim());
                    if (parts.length === 2) {
                        const reversed = `${parts[1]} ${parts[0]}`;
                        matchedProduct = products.find(p =>
                            p.fabric_type === 'Printed' && sanitize(p.variation) === sanitize(reversed)
                        );
                        if (!matchedProduct) {
                            // Try reverse too (some are "Desiree Lavender" -> "Lavender- Desiree")
                            const reversed2 = `${parts[0]} ${parts[1]}`;
                            matchedProduct = products.find(p =>
                                p.fabric_type === 'Printed' && sanitize(p.variation) === sanitize(reversed2)
                            );
                        }
                    }
                }
            }

            if (matchedProduct) {
                console.log(`Uploading: ${fileName} -> Matching product: ${matchedProduct.variation}`);

                // Upload to storage
                const storagePath = `${Date.now()}-${fileName}`;
                const { error: uploadError } = await supabase.storage
                    .from('product-images')
                    .upload(storagePath, fileBuffer, {
                        contentType: fileExt === '.png' ? 'image/png' : 'image/jpeg',
                        upsert: true
                    });

                if (uploadError) {
                    console.error(`   Upload failed for ${fileName}:`, uploadError.message);
                    continue;
                }

                totalUploaded++;

                // Get Public URL
                const { data: { publicUrl } } = supabase.storage
                    .from('product-images')
                    .getPublicUrl(storagePath);

                // Update Database
                const { error: updateError } = await supabase
                    .from('products')
                    .update({ image_url: publicUrl })
                    .eq('id', matchedProduct.id);

                if (updateError) {
                    console.error(`   Database update failed for ${matchedProduct.variation}:`, updateError.message);
                } else {
                    totalLinked++;
                }
            } else {
                console.warn(`No product match found for: ${fileName} (${type})`);
            }
        }
    }

    console.log('--- Bulk Upload and Sync Completed ---');
    console.log(`Total Uploaded: ${totalUploaded}`);
    console.log(`Total Linked to Products: ${totalLinked}`);
}

uploadAndSync();
