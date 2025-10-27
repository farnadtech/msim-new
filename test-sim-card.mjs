import { createClient } from '@supabase/supabase-js';

// Supabase configuration
const supabaseUrl = 'https://idwiuczefxxnogiwtknb.supabase.co';
const supabaseKey = 'eyJhbGciOiJIUzI1NiIsInR5cCI6IkpXVCJ9.eyJpc3MiOiJzdXBhYmFzZSIsInJlZiI6Imlkd2l1Y3plZnh4bm9naXd0a25iIiwicm9sZSI6ImFub24iLCJpYXQiOjE3NjE1NTA1ODQsImV4cCI6MjA3NzEyNjU4NH0.W_kdBc0RLmdtfaVd8S0s3lV_OHJWY080hULxCg9MRrY';

const supabase = createClient(supabaseUrl, supabaseKey);

async function testSimCard() {
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
  
  // Fetch auction details for each sim card
  for (const sim of data) {
    console.log(`Sim card ${sim.id}:`, JSON.stringify(sim, null, 2));
    
    // Fetch auction details
    const { data: auctionDetails, error: detailsError } = await supabase
      .from('auction_details')
      .select('*')
      .eq('sim_card_id', sim.id)
      .single();
      
    if (detailsError) {
      console.log(`No auction details found for sim card ${sim.id}`);
    } else {
      console.log(`Auction details for sim card ${sim.id}:`, JSON.stringify(auctionDetails, null, 2));
    }
  }
}

testSimCard();