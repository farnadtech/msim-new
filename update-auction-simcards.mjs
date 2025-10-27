import { createClient } from '@supabase/supabase-js';

// Supabase configuration
const supabaseUrl = 'https://idwiuczefxxnogiwtknb.supabase.co';
const supabaseKey = 'eyJhbGciOiJIUzI1NiIsInR5cCI6IkpXVCJ9.eyJpc3MiOiJzdXBhYmFzZSIsInJlZiI6Imlkd2l1Y3plZnh4bm9naXd0a25iIiwicm9sZSI6ImFub24iLCJpYXQiOjE3NjE1NTA1ODQsImV4cCI6MjA3NzEyNjU4NH0.W_kdBc0RLmdtfaVd8S0s3lV_OHJWY080hULxCg9MRrY';

const supabase = createClient(supabaseUrl, supabaseKey);

async function updateAuctionSimCards() {
  console.log('Fetching auction sim cards...');
  
  const { data, error } = await supabase
    .from('sim_cards')
    .select('*')
    .eq('type', 'auction');
    
  if (error) {
    console.error('Error fetching auction sim cards:', error.message);
    return;
  }
  
  console.log('Auction sim cards found:', data.length);
  
  // Add auction_details for each auction sim card
  for (const sim of data) {
    // Check if auction_details already exists for this sim card
    const { data: existingDetails, error: checkError } = await supabase
      .from('auction_details')
      .select('*')
      .eq('sim_card_id', sim.id)
      .single();
      
    if (checkError && checkError.code !== 'PGRST116') { // PGRST116 means no rows returned
      console.error(`Error checking auction details for sim card ${sim.id}:`, checkError.message);
      continue;
    }
    
    if (existingDetails) {
      console.log(`Sim card ${sim.id} already has auction_details, skipping...`);
      continue;
    }
    
    // Create auction_details
    const auctionDetails = {
      sim_card_id: sim.id,
      current_bid: sim.price || 10000,
      highest_bidder_id: null,
      end_time: new Date(Date.now() + 7 * 24 * 60 * 60 * 1000).toISOString(), // 7 days from now
    };
    
    // Insert the auction details
    const { error: insertError } = await supabase
      .from('auction_details')
      .insert(auctionDetails);
      
    if (insertError) {
      console.error(`Error inserting auction details for sim card ${sim.id}:`, insertError.message);
    } else {
      console.log(`Successfully inserted auction details for sim card ${sim.id}`);
    }
  }
}

updateAuctionSimCards();