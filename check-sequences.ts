import { createClient } from '@supabase/supabase-js';

// Supabase configuration
const supabaseUrl = 'https://idwiuczefxxnogiwtknb.supabase.co';
const supabaseKey = 'eyJhbGciOiJIUzI1NiIsInR5cCI6IkpXVCJ9.eyJpc3MiOiJzdXBhYmFzZSIsInJlZiI6Imlkd2l1Y3plZnh4bm9naXd0a25iIiwicm9sZSI6ImFub24iLCJpYXQiOjE3NjE1NTA1ODQsImV4cCI6MjA3NzEyNjU4NH0.W_kdBc0RLmdtfaVd8S0s3lV_OHJWY080hULxCg9MRrY';

const supabase = createClient(supabaseUrl, supabaseKey);

async function checkSequences() {
  console.log('Checking database sequences...');
  
  // Get the current max ID from sim_cards table
  const { data: maxIdData, error: maxIdError } = await supabase
    .from('sim_cards')
    .select('id')
    .order('id', { ascending: false })
    .limit(1)
    .single();
    
  if (maxIdError && maxIdError.code !== 'PGRST116') {
    console.error('Error getting max ID:', maxIdError.message);
  } else {
    const maxId = maxIdData?.id || 0;
    console.log('Current max ID in sim_cards table:', maxId);
    
    // Get the current sequence value
    const { data: sequenceData, error: sequenceError } = await supabase
      .rpc('nextval', { name: 'sim_cards_id_seq' });
      
    if (sequenceError) {
      console.error('Error getting sequence value:', sequenceError.message);
    } else {
      console.log('Current sequence value:', sequenceData);
    }
  }
  
  // Check auction_details
  const { data: maxAuctionIdData, error: maxAuctionIdError } = await supabase
    .from('auction_details')
    .select('id')
    .order('id', { ascending: false })
    .limit(1)
    .single();
    
  if (maxAuctionIdError && maxAuctionIdError.code !== 'PGRST116') {
    console.error('Error getting max auction ID:', maxAuctionIdError.message);
  } else {
    const maxAuctionId = maxAuctionIdData?.id || 0;
    console.log('Current max ID in auction_details table:', maxAuctionId);
  }
}

checkSequences();