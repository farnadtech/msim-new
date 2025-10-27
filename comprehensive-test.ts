import { createClient } from '@supabase/supabase-js';

// Supabase configuration
const supabaseUrl = 'https://idwiuczefxxnogiwtknb.supabase.co';
const supabaseKey = 'eyJhbGciOiJIUzI1NiIsInR5cCI6IkpXVCJ9.eyJpc3MiOiJzdXBhYmFzZSIsInJlZiI6Imlkd2l1Y3plZnh4bm9naXd0a25iIiwicm9sZSI6ImFub24iLCJpYXQiOjE3NjE1NTA1ODQsImV4cCI6MjA3NzEyNjU4NH0.W_kdBc0RLmdtfaVd8S0s3lV_OHJWY080hULxCg9MRrY';

const supabase = createClient(supabaseUrl, supabaseKey);

async function comprehensiveTest() {
  console.log('Running comprehensive test of SIM card functionality...');
  
  // Test 1: Fetch all SIM cards to verify the fix for missing auction_details column
  console.log('Test 1: Fetching all SIM cards...');
  try {
    const { data: simCards, error } = await supabase
      .from('sim_cards')
      .select('*');
      
    if (error) {
      console.error('Error fetching SIM cards:', error.message);
      return;
    }
    
    console.log(`Successfully fetched ${simCards.length} SIM cards`);
    
    // Check if any auction SIM cards are missing auction details
    const auctionSims = simCards.filter(sim => sim.type === 'auction');
    console.log(`Found ${auctionSims.length} auction SIM cards`);
    
    if (auctionSims.length > 0) {
      const { data: auctionDetails, error: detailsError } = await supabase
        .from('auction_details')
        .select('*')
        .in('sim_card_id', auctionSims.map(sim => sim.id));
        
      if (detailsError) {
        console.error('Error fetching auction details:', detailsError.message);
      } else {
        console.log(`Found ${auctionDetails.length} auction details records`);
        
        // Check if all auction SIMs have details
        const simsWithDetails = auctionDetails.map(detail => detail.sim_card_id);
        const missingDetails = auctionSims.filter(sim => !simsWithDetails.includes(sim.id));
        
        if (missingDetails.length > 0) {
          console.log(`WARNING: ${missingDetails.length} auction SIM cards are missing auction details`);
        } else {
          console.log('All auction SIM cards have auction details');
        }
      }
    }
  } catch (err) {
    console.error('Exception in Test 1:', err.message);
  }
  
  // Test 2: Try to insert a new regular SIM card
  console.log('\nTest 2: Inserting a new regular SIM card...');
  try {
    const { data, error } = await supabase
      .from('sim_cards')
      .insert({
        number: '09125555555',
        price: 1500000,
        seller_id: '00000000-0000-0000-0000-000000000001',
        type: 'fixed',
        status: 'available',
        carrier: 'همراه اول',
        is_rond: false
      })
      .select();
      
    if (error) {
      console.error('Error inserting regular SIM card:', error.message);
    } else {
      console.log('Successfully inserted regular SIM card with ID:', data[0].id);
      
      // Clean up
      const { error: deleteError } = await supabase
        .from('sim_cards')
        .delete()
        .eq('id', data[0].id);
        
      if (deleteError) {
        console.error('Error cleaning up regular SIM card:', deleteError.message);
      } else {
        console.log('Successfully cleaned up regular SIM card');
      }
    }
  } catch (err) {
    console.error('Exception in Test 2:', err.message);
  }
  
  // Test 3: Try to insert a new auction SIM card
  console.log('\nTest 3: Inserting a new auction SIM card...');
  try {
    const { data: simData, error: simError } = await supabase
      .from('sim_cards')
      .insert({
        number: '09126666666',
        price: 2500000,
        seller_id: '00000000-0000-0000-0000-000000000001',
        type: 'auction',
        status: 'available',
        carrier: 'ایرانسل',
        is_rond: true
      })
      .select();
      
    if (simError) {
      console.error('Error inserting auction SIM card:', simError.message);
    } else {
      console.log('Successfully inserted auction SIM card with ID:', simData[0].id);
      
      // Insert auction details
      const { error: detailsError } = await supabase
        .from('auction_details')
        .insert({
          sim_card_id: simData[0].id,
          current_bid: 2500000,
          highest_bidder_id: null,
          end_time: new Date(Date.now() + 7 * 24 * 60 * 60 * 1000).toISOString()
        });
        
      if (detailsError) {
        console.error('Error inserting auction details:', detailsError.message);
      } else {
        console.log('Successfully inserted auction details');
      }
      
      // Clean up
      const { error: detailsDeleteError } = await supabase
        .from('auction_details')
        .delete()
        .eq('sim_card_id', simData[0].id);
        
      if (detailsDeleteError) {
        console.error('Error cleaning up auction details:', detailsDeleteError.message);
      } else {
        console.log('Successfully cleaned up auction details');
      }
      
      const { error: simDeleteError } = await supabase
        .from('sim_cards')
        .delete()
        .eq('id', simData[0].id);
        
      if (simDeleteError) {
        console.error('Error cleaning up auction SIM card:', simDeleteError.message);
      } else {
        console.log('Successfully cleaned up auction SIM card');
      }
    }
  } catch (err) {
    console.error('Exception in Test 3:', err.message);
  }
  
  console.log('\nComprehensive test completed.');
}

comprehensiveTest();