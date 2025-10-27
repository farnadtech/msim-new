import { createClient } from '@supabase/supabase-js';

// Supabase configuration
const supabaseUrl = 'https://idwiuczefxxnogiwtknb.supabase.co';
const supabaseKey = 'eyJhbGciOiJIUzI1NiIsInR5cCI6IkpXVCJ9.eyJpc3MiOiJzdXBhYmFzZSIsInJlZiI6Imlkd2l1Y3plZnh4bm9naXd0a25iIiwicm9sZSI6ImFub24iLCJpYXQiOjE3NjE1NTA1ODQsImV4cCI6MjA3NzEyNjU4NH0.W_kdBc0RLmdtfaVd8S0s3lV_OHJWY080hULxCg9MRrY';

const supabase = createClient(supabaseUrl, supabaseKey);

async function fixMissingAuctionDetails() {
  console.log('Checking for auction SIM cards missing auction details...');
  
  // Get all auction SIM cards
  const { data: auctionSims, error: simsError } = await supabase
    .from('sim_cards')
    .select('*')
    .eq('type', 'auction');
    
  if (simsError) {
    console.error('Error fetching auction SIM cards:', simsError.message);
    return;
  }
  
  console.log(`Found ${auctionSims.length} auction SIM cards`);
  
  // Get existing auction details
  const { data: existingAuctionDetails, error: detailsError } = await supabase
    .from('auction_details')
    .select('sim_card_id');
    
  if (detailsError) {
    console.error('Error fetching existing auction details:', detailsError.message);
    return;
  }
  
  const existingSimCardIds = existingAuctionDetails.map(detail => detail.sim_card_id);
  
  // Find auction SIM cards without auction details
  const missingDetailsSims = auctionSims.filter(sim => !existingSimCardIds.includes(sim.id));
  
  console.log(`Found ${missingDetailsSims.length} auction SIM cards missing auction details`);
  
  // Create missing auction details
  for (const sim of missingDetailsSims) {
    console.log(`Creating auction details for SIM card ${sim.id}`);
    
    const auctionDetails = {
      sim_card_id: sim.id,
      current_bid: sim.price || 0,
      highest_bidder_id: null,
      end_time: new Date(Date.now() + 7 * 24 * 60 * 60 * 1000).toISOString() // 7 days from now
    };
    
    const { error: insertError } = await supabase
      .from('auction_details')
      .insert(auctionDetails);
      
    if (insertError) {
      console.error(`Error creating auction details for SIM card ${sim.id}:`, insertError.message);
    } else {
      console.log(`Successfully created auction details for SIM card ${sim.id}`);
    }
  }
  
  console.log('Finished checking and fixing auction details');
}

fixMissingAuctionDetails();