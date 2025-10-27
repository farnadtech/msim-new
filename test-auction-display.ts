import api from './services/api-supabase';

async function testAuctionDisplay() {
  console.log('Testing auction display functionality...');
  
  try {
    // Get all SIM cards to check if auction details are properly merged
    const simCards = await api.getSimCards();
    console.log(`Found ${simCards.length} SIM cards`);
    
    // Filter auction SIM cards
    const auctionSims = simCards.filter(sim => sim.type === 'auction');
    console.log(`Found ${auctionSims.length} auction SIM cards`);
    
    // Check if auction details are properly included
    for (const sim of auctionSims) {
      console.log(`SIM ${sim.id}:`, {
        number: sim.number,
        type: sim.type,
        price: sim.price,
        auction_details: sim.auction_details ? {
          current_bid: sim.auction_details.current_bid,
          end_time: sim.auction_details.end_time,
          highest_bidder_id: sim.auction_details.highest_bidder_id
        } : null
      });
    }
    
    console.log('Auction display test completed successfully');
  } catch (error) {
    console.error('Error testing auction display:', error.message);
  }
}

testAuctionDisplay();