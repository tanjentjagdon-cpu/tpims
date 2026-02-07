require('dotenv').config({ path: '.env.local' });
const { createClient } = require('@supabase/supabase-js');

const supabase = createClient(
    process.env.NEXT_PUBLIC_SUPABASE_URL,
    process.env.SUPABASE_SERVICE_ROLE_KEY
);

async function getUserId() {
    console.log('🔍 Fetching user ID from auth.users...\n');

    // Try to get user from products table (they must have added products)
    const { data: productData } = await supabase
        .from('products')
        .select('id')
        .limit(1)
        .single();

    if (productData) {
        // Now get the user_id from restock_history or expenses
        const { data: restockData } = await supabase
            .from('restock_history')
            .select('user_id')
            .limit(1)
            .single();

        if (restockData && restockData.user_id) {
            console.log('✓ Found user_id from restock_history');
            return restockData.user_id;
        }

        const { data: expenseData } = await supabase
            .from('expenses')
            .select('user_id')
            .limit(1)
            .single();

        if (expenseData && expenseData.user_id) {
            console.log('✓ Found user_id from expenses');
            return expenseData.user_id;
        }
    }

    // Last resort: get from auth.users directly
    const { data: { users }, error } = await supabase.auth.admin.listUsers();

    if (error) {
        console.error('❌ Error fetching users:', error);
        return null;
    }

    if (users && users.length > 0) {
        console.log('✓ Found user_id from auth.users');
        return users[0].id;
    }

    return null;
}

getUserId().then(userId => {
    if (userId) {
        console.log(`\n📋 Your User ID: ${userId}`);
        console.log('\nℹ️  Copy this ID and update import_shopee_order.js line 286:');
        console.log(`   const userId = '${userId}';`);
    } else {
        console.log('\n❌ Could not find user ID. Please check your Supabase setup.');
    }
});
