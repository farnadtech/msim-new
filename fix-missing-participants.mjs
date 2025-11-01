import { createClient } from '@supabase/supabase-js';

// Supabase credentials
const supabaseUrl = 'https://idwiuczefxxnogiwtknb.supabase.co';
const supabaseKey = 'eyJhbGciOiJIUzI1NiIsInR5cCI6IkpXVCJ9.eyJpc3MiOiJzdXBhYmFzZSIsInJlZiI6Imlkd2l1Y3plZnh4bm9naXd0a25iIiwicm9sZSI6ImFub24iLCJpYXQiOjE3NjE1NTA1ODQsImV4cCI6MjA3NzEyNjU4NH0.W_kdBc0RLmdtfaVd8S0s3lV_OHJWY080hULxCg9MRrY';

const supabase = createClient(supabaseUrl, supabaseKey);

async function fixMissingParticipants() {
    console.log('🔧 Finding missing auction participants...\n');

    // Get all bids
    const { data: bids, error: bidsError } = await supabase
        .from('bids')
        .select('*')
        .order('date', { ascending: true });

    if (bidsError) {
        console.error('Error fetching bids:', bidsError);
        return;
    }

    console.log(`📊 Found ${bids.length} total bids\n`);

    // Group bids by user and sim_card
    const bidGroups = {};
    
    for (const bid of bids) {
        const key = `${bid.user_id}_${bid.sim_card_id}`;
        if (!bidGroups[key]) {
            bidGroups[key] = {
                user_id: bid.user_id,
                sim_card_id: bid.sim_card_id,
                bids: []
            };
        }
        bidGroups[key].bids.push(bid);
    }

    console.log(`👥 Found ${Object.keys(bidGroups).length} unique user-sim combinations\n`);

    let createdCount = 0;
    let skippedCount = 0;

    for (const key in bidGroups) {
        const group = bidGroups[key];
        
        // Get auction_id for this sim card
        const { data: auctionDetails } = await supabase
            .from('auction_details')
            .select('id, base_price')
            .eq('sim_card_id', group.sim_card_id)
            .single();

        if (!auctionDetails) {
            console.log(`⚠️  No auction found for SIM ${group.sim_card_id}, skipping`);
            continue;
        }

        const auctionId = auctionDetails.id;
        const basePrice = auctionDetails.base_price || 1000000; // Default if not set

        // Check if participant already exists
        const { data: existingParticipant } = await supabase
            .from('auction_participants')
            .select('id')
            .eq('auction_id', auctionId)
            .eq('user_id', group.user_id)
            .eq('sim_card_id', group.sim_card_id)
            .single();

        if (existingParticipant) {
            skippedCount++;
            continue;
        }

        // Calculate highest bid and count
        const highestBid = Math.max(...group.bids.map(b => b.amount));
        const bidCount = group.bids.length;
        const guaranteeDeposit = Math.floor(basePrice * 0.05);

        console.log(`🆕 Creating participant for user ${group.user_id} on auction ${auctionId}`);
        console.log(`   SIM: ${group.sim_card_id}, Bids: ${bidCount}, Highest: ${highestBid.toLocaleString('en-US')}, Deposit: ${guaranteeDeposit.toLocaleString('en-US')}`);

        // Create participant record
        const { error: insertError } = await supabase
            .from('auction_participants')
            .insert({
                auction_id: auctionId,
                sim_card_id: group.sim_card_id,
                user_id: group.user_id,
                highest_bid: highestBid,
                bid_count: bidCount,
                guarantee_deposit_amount: guaranteeDeposit,
                guarantee_deposit_blocked: true
            });

        if (insertError) {
            console.error(`   ❌ Error creating participant:`, insertError);
        } else {
            console.log(`   ✅ Participant created successfully`);
            createdCount++;
        }
    }

    console.log(`\n\n✅ Summary:`);
    console.log(`   Created: ${createdCount} participants`);
    console.log(`   Skipped (already exist): ${skippedCount}`);
    console.log(`   Total processed: ${Object.keys(bidGroups).length}`);
}

fixMissingParticipants();
