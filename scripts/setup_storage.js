require('dotenv').config({ path: '.env.local' });
const { createClient } = require('@supabase/supabase-js');

const supabase = createClient(process.env.NEXT_PUBLIC_SUPABASE_URL, process.env.SUPABASE_SERVICE_ROLE_KEY);

async function setupStorage() {
    const bucketName = 'product-images';

    // 1. Create Bucket
    const { data: bucket, error: createError } = await supabase
        .storage
        .createBucket(bucketName, {
            public: true, // Make it public
            fileSizeLimit: 5242880, // 5MB limit
            allowedMimeTypes: ['image/png', 'image/jpeg', 'image/webp']
        });

    if (createError) {
        if (createError.message.includes('already exists')) {
            console.log(`Bucket '${bucketName}' already exists.`);
        } else {
            console.error('Error creating bucket:', createError);
            return;
        }
    } else {
        console.log(`Bucket '${bucketName}' created successfully.`);
    }

    // 2. We can't easily set policies via JS client for Storage usually (requires SQL), 
    // but creating a public bucket usually allows public reads.
    // Writes still require RLS policies.

    console.log('Setup complete. Note: You might still need to set RLS policies via SQL if uploads fail.');
}

setupStorage();
