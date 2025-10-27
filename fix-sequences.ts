import { createClient } from '@supabase/supabase-js';

// Supabase configuration
const supabaseUrl = 'https://idwiuczefxxnogiwtknb.supabase.co';
const supabaseKey = 'eyJhbGciOiJIUzI1NiIsInR5cCI6IkpXVCJ9.eyJpc3MiOiJzdXBhYmFzZSIsInJlZiI6Imlkd2l1Y3plZnh4bm9naXd0a25iIiwicm9sZSI6ImFub24iLCJpYXQiOjE3NjE1NTA1ODQsImV4cCI6MjA3NzEyNjU4NH0.W_kdBc0RLmdtfaVd8S0s3lV_OHJWY080hULxCg9MRrY';

const supabase = createClient(supabaseUrl, supabaseKey);

async function fixSequences() {
  console.log('Fixing database sequences...');
  
  // Get the current max ID from sim_cards table
  const { data: maxIdData, error: maxIdError } = await supabase
    .from('sim_cards')
    .select('id')
    .order('id', { ascending: false })
    .limit(1)
    .single();
    
  if (maxIdError && maxIdError.code !== 'PGRST116') {
    console.error('Error getting max ID:', maxIdError.message);
    return;
  }
  
  const maxId = maxIdData?.id || 0;
  console.log('Current max ID in sim_cards table:', maxId);
  
  // Set the sequence value to maxId + 1
  const nextId = maxId + 1;
  console.log('Setting sequence to:', nextId);
  
  // Update the sequence
  const { error: sequenceError } = await supabase
    .rpc('setval', { 
      name: 'sim_cards_id_seq', 
      value: nextId 
    });
    
  if (sequenceError) {
    console.error('Error setting sequence value:', sequenceError.message);
    // Try alternative approach
    const { error: altError } = await supabase
      .rpc('setval', { 
        name: '"sim_cards_id_seq"', 
        value: nextId 
      });
      
    if (altError) {
      console.error('Alternative approach also failed:', altError.message);
    } else {
      console.log('Successfully set sequence value using alternative approach');
    }
  } else {
    console.log('Successfully set sequence value');
  }
  
  // Also fix auction_details sequence
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
    
    const nextAuctionId = maxAuctionId + 1;
    console.log('Setting auction_details sequence to:', nextAuctionId);
    
    const { error: auctionSequenceError } = await supabase
      .rpc('setval', { 
        name: 'auction_details_id_seq', 
        value: nextAuctionId 
      });
      
    if (auctionSequenceError) {
      console.error('Error setting auction_details sequence value:', auctionSequenceError.message);
    } else {
      console.log('Successfully set auction_details sequence value');
    }
  }
}

fixSequences();