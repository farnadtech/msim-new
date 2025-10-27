import { createClient } from '@supabase/supabase-js';

// Supabase configuration
const supabaseUrl = 'https://idwiuczefxxnogiwtknb.supabase.co';
const supabaseKey = 'eyJhbGciOiJIUzI1NiIsInR5cCI6IkpXVCJ9.eyJpc3MiOiJzdXBhYmFzZSIsInJlZiI6Imlkd2l1Y3plZnh4bm9naXd0a25iIiwicm9sZSI6ImFub24iLCJpYXQiOjE3NjE1NTA1ODQsImV4cCI6MjA3NzEyNjU4NH0.W_kdBc0RLmdtfaVd8S0s3lV_OHJWY080hULxCg9MRrY';

const supabase = createClient(supabaseUrl, supabaseKey);

async function checkCurrentSequences() {
  console.log('Checking current sequence values...');
  
  try {
    // Get the current max ID from sim_cards table
    const { data: maxSimId, error: maxSimError } = await supabase
      .from('sim_cards')
      .select('id')
      .order('id', { ascending: false })
      .limit(1)
      .single();
      
    if (maxSimError && maxSimError.code !== 'PGRST116') {
      console.error('Error getting max sim_cards ID:', maxSimError.message);
    } else {
      const maxId = maxSimId?.id || 0;
      console.log('Current max ID in sim_cards table:', maxId);
    }
  } catch (err) {
    console.error('Exception checking max sim_cards ID:', err.message);
  }
  
  try {
    // Get the current max ID from auction_details table
    const { data: maxAuctionId, error: maxAuctionError } = await supabase
      .from('auction_details')
      .select('id')
      .order('id', { ascending: false })
      .limit(1)
      .single();
      
    if (maxAuctionError && maxAuctionError.code !== 'PGRST116') {
      console.error('Error getting max auction_details ID:', maxAuctionError.message);
    } else {
      const maxId = maxAuctionId?.id || 0;
      console.log('Current max ID in auction_details table:', maxId);
    }
  } catch (err) {
    console.error('Exception checking max auction_details ID:', err.message);
  }
  
  // Try a different approach - insert with explicit ID to see what happens
  console.log('\nTrying to insert with explicit ID...');
  
  try {
    // Get current max ID and try to insert with max+1
    const { data: maxSimId } = await supabase
      .from('sim_cards')
      .select('id')
      .order('id', { ascending: false })
      .limit(1)
      .single();
      
    const nextId = (maxSimId?.id || 0) + 1;
    console.log('Trying to insert with ID:', nextId);
    
    const { data, error } = await supabase
      .from('sim_cards')
      .insert({
        id: nextId,
        number: `0912${nextId}000`,
        price: 1000000,
        seller_id: '00000000-0000-0000-0000-000000000001',
        type: 'fixed',
        status: 'available',
        carrier: 'همراه اول',
        is_rond: false
      })
      .select();
      
    if (error) {
      console.error('Error inserting with explicit ID:', error.message);
      
      // Try without explicit ID
      console.log('Trying without explicit ID...');
      const { data: retryData, error: retryError } = await supabase
        .from('sim_cards')
        .insert({
          number: `0912${nextId}001`,
          price: 1000000,
          seller_id: '00000000-0000-0000-0000-000000000001',
          type: 'fixed',
          status: 'available',
          carrier: 'همراه اول',
          is_rond: false
        })
        .select();
        
      if (retryError) {
        console.error('Error inserting without explicit ID:', retryError.message);
      } else {
        console.log('Successfully inserted without explicit ID, new ID:', retryData[0].id);
        
        // Clean up
        await supabase
          .from('sim_cards')
          .delete()
          .eq('id', retryData[0].id);
      }
    } else {
      console.log('Successfully inserted with explicit ID:', data[0].id);
      
      // Clean up
      await supabase
        .from('sim_cards')
        .delete()
        .eq('id', data[0].id);
    }
  } catch (err) {
    console.error('Exception during explicit ID test:', err.message);
  }
}

checkCurrentSequences();