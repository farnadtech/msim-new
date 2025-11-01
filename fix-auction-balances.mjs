import { createClient } from '@supabase/supabase-js';

// Supabase credentials (from services/supabase.ts)
const supabaseUrl = 'https://idwiuczefxxnogiwtknb.supabase.co';
const supabaseKey = 'eyJhbGciOiJIUzI1NiIsInR5cCI6IkpXVCJ9.eyJpc3MiOiJzdXBhYmFzZSIsInJlZiI6Imlkd2l1Y3plZnh4bm9naXd0a25iIiwicm9sZSI6ImFub24iLCJpYXQiOjE3NjE1NTA1ODQsImV4cCI6MjA3NzEyNjU4NH0.W_kdBc0RLmdtfaVd8S0s3lV_OHJWY080hULxCg9MRrY';

if (!supabaseUrl || !supabaseKey) {
    console.error('❌ Missing Supabase credentials in .env file');
    process.exit(1);
}

const supabase = createClient(supabaseUrl, supabaseKey);

async function fixAuctionBalances() {
    console.log('🔧 Starting auction balance fix...\n');

    try {
        // Step 1: Get all guarantee deposits that are currently blocked
        const { data: deposits, error: depositsError } = await supabase
            .from('guarantee_deposits')
            .select('user_id, amount, status')
            .eq('status', 'blocked');

        if (depositsError) {
            throw new Error('Error fetching deposits: ' + depositsError.message);
        }

        console.log(`📊 Found ${deposits?.length || 0} blocked guarantee deposits\n`);

        if (!deposits || deposits.length === 0) {
            console.log('✅ No blocked deposits found. Nothing to fix.');
            return;
        }

        // Step 2: Group deposits by user
        const userDeposits = new Map();
        deposits.forEach(deposit => {
            const current = userDeposits.get(deposit.user_id) || 0;
            userDeposits.set(deposit.user_id, current + deposit.amount);
        });

        console.log(`👥 Fixing balances for ${userDeposits.size} users...\n`);

        // Step 3: Fix each user's balance
        let fixedCount = 0;
        for (const [userId, totalDeposit] of userDeposits) {
            console.log(`\n🔍 Processing user: ${userId}`);
            console.log(`   Total blocked deposits: ${totalDeposit.toLocaleString('fa-IR')} تومان`);

            // Get current balance
            const { data: userData, error: userError } = await supabase
                .from('users')
                .select('wallet_balance, blocked_balance')
                .eq('id', userId)
                .single();

            if (userError) {
                console.error(`   ❌ Error fetching user data: ${userError.message}`);
                continue;
            }

            const currentWallet = userData.wallet_balance || 0;
            const currentBlocked = userData.blocked_balance || 0;

            console.log(`   Current wallet: ${currentWallet.toLocaleString('fa-IR')} تومان`);
            console.log(`   Current blocked: ${currentBlocked.toLocaleString('fa-IR')} تومان`);
            console.log(`   Available: ${(currentWallet - currentBlocked).toLocaleString('fa-IR')} تومان`);

            // Calculate correct balance
            // The wallet should have been: current_wallet + total_deposit (restore what was deducted)
            const correctWallet = currentWallet + totalDeposit;
            const correctBlocked = totalDeposit; // Should equal total deposits

            console.log(`\n   🔧 Fixing to:`);
            console.log(`   New wallet: ${correctWallet.toLocaleString('fa-IR')} تومان`);
            console.log(`   New blocked: ${correctBlocked.toLocaleString('fa-IR')} تومان`);
            console.log(`   New available: ${(correctWallet - correctBlocked).toLocaleString('fa-IR')} تومان`);

            // Update user balance
            const { error: updateError } = await supabase
                .from('users')
                .update({
                    wallet_balance: correctWallet,
                    blocked_balance: correctBlocked
                })
                .eq('id', userId);

            if (updateError) {
                console.error(`   ❌ Error updating user: ${updateError.message}`);
                continue;
            }

            console.log(`   ✅ Balance fixed successfully!`);
            fixedCount++;
        }

        console.log(`\n\n✅ Fixed ${fixedCount} user balances successfully!`);

    } catch (error) {
        console.error('\n❌ Error:', error.message);
        process.exit(1);
    }
}

// Run the fix
fixAuctionBalances();
