import api from './services/api-supabase';

async function testAuctionDetails() {
  console.log('Testing auction details handling...');
  
  try {
    // Get all SIM cards to check if auction details are properly merged
    const simCards = await api.getSimCards();
    console.log(`Found ${simCards.length} SIM cards`);
    
    // Count auction SIM cards
    const auctionSims = simCards.filter(sim => sim.type === 'auction');
    console.log(`Found ${auctionSims.length} auction SIM cards`);
    
    // Check if auction details are properly included
    for (const sim of auctionSims) {
      if (sim.auction_details) {
        console.log(`SIM ${sim.id} has auction details:`, {
          current_bid: sim.auction_details.current_bid,
          end_time: sim.auction_details.end_time,
          highest_bidder_id: sim.auction_details.highest_bidder_id
        });
      } else {
        console.log(`WARNING: SIM ${sim.id} is missing auction details`);
      }
    }
    
    console.log('Auction details test completed successfully');
  } catch (error) {
    console.error('Error testing auction details:', error.message);
  }
}

testAuctionDetails();