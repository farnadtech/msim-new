import { createClient } from '@supabase/supabase-js';

// Supabase credentials
const supabaseUrl = 'https://idwiuczefxxnogiwtknb.supabase.co';
const supabaseKey = 'eyJhbGciOiJIUzI1NiIsInR5cCI6IkpXVCJ9.eyJpc3MiOiJzdXBhYmFzZSIsInJlZiI6Imlkd2l1Y3plZnh4bm9naXd0a25iIiwicm9sZSI6ImFub24iLCJpYXQiOjE3NjE1NTA1ODQsImV4cCI6MjA3NzEyNjU4NH0.W_kdBc0RLmdtfaVd8S0s3lV_OHJWY080hULxCg9MRrY';

const supabase = createClient(supabaseUrl, supabaseKey);

async function checkUserBalance() {
    // Get all users and their balances
    const { data: users, error } = await supabase
        .from('users')
        .select('id, name, wallet_balance, blocked_balance, role')
        .order('name');

    if (error) {
        console.error('Error:', error);
        return;
    }

    console.log('\n💰 User Balances:\n');
    console.log('═'.repeat(100));
    console.log('Name'.padEnd(30) + 'Total'.padEnd(20) + 'Blocked'.padEnd(20) + 'Available'.padEnd(20) + 'Role');
    console.log('═'.repeat(100));

    for (const user of users) {
        const total = user.wallet_balance || 0;
        const blocked = user.blocked_balance || 0;
        const available = total - blocked;

        const totalStr = total.toLocaleString('en-US').padEnd(20);
        const blockedStr = blocked.toLocaleString('en-US').padEnd(20);
        const availableStr = available.toLocaleString('en-US').padEnd(20);

        console.log(
            user.name.padEnd(30) +
            totalStr +
            blockedStr +
            availableStr +
            user.role
        );

        // Check if they have any auction participants
        const { data: participants } = await supabase
            .from('auction_participants')
            .select('auction_id, highest_bid, guarantee_deposit_amount, bid_count')
            .eq('user_id', user.id);

        if (participants && participants.length > 0) {
            console.log('  → Auctions participated:', participants.length);
            participants.forEach(p => {
                console.log(`     Auction ${p.auction_id}: ${p.bid_count} bids, highest: ${p.highest_bid.toLocaleString('en-US')}, deposit: ${p.guarantee_deposit_amount.toLocaleString('en-US')}`);
            });
        }

        // Check bids without participants
        const { data: bids } = await supabase
            .from('bids')
            .select('sim_card_id, amount')
            .eq('user_id', user.id);

        if (bids && bids.length > 0) {
            // Group by sim card
            const simBids = {};
            bids.forEach(b => {
                if (!simBids[b.sim_card_id]) simBids[b.sim_card_id] = [];
                simBids[b.sim_card_id].push(b.amount);
            });

            console.log('  → Total bids placed:', bids.length, 'on', Object.keys(simBids).length, 'SIM cards');
        }

        console.log('');
    }
    console.log('═'.repeat(100));
}

checkUserBalance();
