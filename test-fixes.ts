import { createClient } from '@supabase/supabase-js';

// Supabase configuration
const supabaseUrl = 'https://idwiuczefxxnogiwtknb.supabase.co';
const supabaseKey = 'eyJhbGciOiJIUzI1NiIsInR5cCI6IkpXVCJ9.eyJpc3MiOiJzdXBhYmFzZSIsInJlZiI6Imlkd2l1Y3plZnh4bm9naXd0a25iIiwicm9sZSI6ImFub24iLCJpYXQiOjE3NjE1NTA1ODQsImV4cCI6MjA3NzEyNjU4NH0.W_kdBc0RLmdtfaVd8S0s3lV_OHJWY080hULxCg9MRrY';

const supabase = createClient(supabaseUrl, supabaseKey);

async function testFixes() {
  console.log('Testing SIM card fixes...');
  
  // Test 1: Insert a regular SIM card
  console.log('Test 1: Inserting a regular SIM card...');
  const { data: simCardData, error: simCardError } = await supabase
    .from('sim_cards')
    .insert({
      number: '09129999999',
      price: 1000000,
      seller_id: '00000000-0000-0000-0000-000000000001',
      type: 'fixed',
      status: 'available',
      carrier: 'همراه اول',
      is_rond: false
    })
    .select();
    
  if (simCardError) {
    console.error('Error inserting regular SIM card:', simCardError.message);
  } else {
    console.log('Successfully inserted regular SIM card with ID:', simCardData[0].id);
    
    // Clean up
    await supabase
      .from('sim_cards')
      .delete()
      .eq('id', simCardData[0].id);
  }
  
  // Test 2: Insert an auction SIM card
  console.log('Test 2: Inserting an auction SIM card...');
  const { data: auctionSimData, error: auctionSimError } = await supabase
    .from('sim_cards')
    .insert({
      number: '09128888888',
      price: 2000000,
      seller_id: '00000000-0000-0000-0000-000000000001',
      type: 'auction',
      status: 'available',
      carrier: 'ایرانسل',
      is_rond: true
    })
    .select();
    
  if (auctionSimError) {
    console.error('Error inserting auction SIM card:', auctionSimError.message);
  } else {
    console.log('Successfully inserted auction SIM card with ID:', auctionSimData[0].id);
    
    // Insert auction details
    const { error: auctionDetailsError } = await supabase
      .from('auction_details')
      .insert({
        sim_card_id: auctionSimData[0].id,
        current_bid: 2000000,
        highest_bidder_id: null,
        end_time: new Date(Date.now() + 7 * 24 * 60 * 60 * 1000).toISOString()
      });
      
    if (auctionDetailsError) {
      console.error('Error inserting auction details:', auctionDetailsError.message);
    } else {
      console.log('Successfully inserted auction details');
    }
    
    // Clean up
    await supabase
      .from('auction_details')
      .delete()
      .eq('sim_card_id', auctionSimData[0].id);
      
    await supabase
      .from('sim_cards')
      .delete()
      .eq('id', auctionSimData[0].id);
  }
  
  console.log('Tests completed.');
}

testFixes();