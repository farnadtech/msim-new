import { createClient } from '@supabase/supabase-js';

// Supabase credentials
const supabaseUrl = 'https://idwiuczefxxnogiwtknb.supabase.co';
const supabaseKey = 'eyJhbGciOiJIUzI1NiIsInR5cCI6IkpXVCJ9.eyJpc3MiOiJzdXBhYmFzZSIsInJlZiI6Imlkd2l1Y3plZnh4bm9naXd0a25iIiwicm9sZSI6ImFub24iLCJpYXQiOjE3NjE1NTA1ODQsImV4cCI6MjA3NzEyNjU4NH0.W_kdBc0RLmdtfaVd8S0s3lV_OHJWY080hULxCg9MRrY';

const supabase = createClient(supabaseUrl, supabaseKey);

async function debugAuction() {
    console.log('🔍 Debugging Auction ID: 101\n');

    // Check auction_details
    const { data: auction, error: auctionError } = await supabase
        .from('auction_details')
        .select('*')
        .eq('id', 101)
        .single();

    console.log('📋 Auction Details:');
    console.log(auction);
    console.log('Error:', auctionError);
    console.log('');

    if (auction) {
        // Check sim card
        const { data: sim, error: simError } = await supabase
            .from('sim_cards')
            .select('*')
            .eq('id', auction.sim_card_id)
            .single();

        console.log('📱 SIM Card (ID: ' + auction.sim_card_id + '):');
        console.log(sim);
        console.log('');

        // Check participants
        const { data: participants, error: participantsError } = await supabase
            .from('auction_participants')
            .select('*')
            .eq('auction_id', 101);

        console.log('👥 Auction Participants (' + (participants?.length || 0) + '):');
        console.log(participants);
        console.log('Error:', participantsError);
        console.log('');

        // Check bids table
        const { data: bids, error: bidsError } = await supabase
            .from('bids')
            .select('*')
            .eq('sim_card_id', auction.sim_card_id)
            .order('date', { ascending: false });

        console.log('💰 Bids (' + (bids?.length || 0) + '):');
        console.log(bids);
        console.log('Error:', bidsError);
        console.log('');

        // Check guarantee deposits
        const { data: deposits, error: depositsError } = await supabase
            .from('guarantee_deposits')
            .select('*')
            .eq('auction_id', 101);

        console.log('🔒 Guarantee Deposits (' + (deposits?.length || 0) + '):');
        console.log(deposits);
        console.log('Error:', depositsError);
    }
}

debugAuction();
