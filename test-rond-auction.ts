import api from './services/api-supabase';

async function testRondAndAuction() {
  console.log('Testing rond and auction functionality...');
  
  try {
    // Test adding a rond SIM card
    console.log('Test 1: Adding a rond SIM card');
    const rondSimData = {
      number: '09123333333',
      price: 1500000,
      type: 'fixed' as const,
      carrier: 'همراه اول' as const,
      is_rond: true
    };
    
    // We need to mock the seller_id since we're not in a real auth context
    const simDataWithSeller = {
      ...rondSimData,
      seller_id: '00000000-0000-0000-0000-000000000001', // Admin user ID
      status: 'available' as const
    };
    
    const result = await api.addSimCard(simDataWithSeller);
    console.log('Successfully added rond SIM card with ID:', result);
    
    // Clean up by deleting the SIM card we just added
    await api.updateSimCard(parseInt(result), { status: 'sold' });
    console.log('Cleaned up test SIM card');
    
  } catch (error) {
    console.error('Error in Test 1:', error.message);
  }
  
  try {
    // Test adding an auction SIM card with a specific price
    console.log('\nTest 2: Adding an auction SIM card with specific price');
    const auctionSimData = {
      number: '09124444444',
      price: 2500000, // This should be used as the starting bid
      type: 'auction' as const,
      carrier: 'ایرانسل' as const,
      is_rond: false
    };
    
    // We need to mock the seller_id since we're not in a real auth context
    const simDataWithSeller = {
      ...auctionSimData,
      seller_id: '00000000-0000-0000-0000-000000000001', // Admin user ID
      status: 'available' as const
    };
    
    const result = await api.addSimCard(simDataWithSeller);
    console.log('Successfully added auction SIM card with ID:', result);
    
    // Get the auction details to verify the starting bid
    const simCards = await api.getSimCards();
    const addedSim = simCards.find(sim => sim.id === parseInt(result));
    
    if (addedSim && addedSim.type === 'auction' && addedSim.auction_details) {
      console.log('Auction details:', {
        starting_bid: addedSim.auction_details.current_bid,
        end_time: addedSim.auction_details.end_time
      });
      
      if (addedSim.auction_details.current_bid === 2500000) {
        console.log('✓ Starting bid correctly set to seller\'s price');
      } else {
        console.log('✗ Starting bid is incorrect');
      }
    }
    
    // Clean up by deleting the auction details and SIM card
    console.log('Would clean up auction SIM card and its details in a real test');
    
  } catch (error) {
    console.error('Error in Test 2:', error.message);
  }
  
  console.log('\nTest completed.');
}

testRondAndAuction();