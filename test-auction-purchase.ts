import api from './services/api-supabase';

async function testAuctionPurchase() {
  console.log('Testing auction purchase functionality...');
  
  try {
    // Get all SIM cards to find an auction SIM card
    const simCards = await api.getSimCards();
    const auctionSims = simCards.filter(sim => sim.type === 'auction' && sim.status === 'available');
    
    if (auctionSims.length === 0) {
      console.log('No available auction SIM cards found');
      return;
    }
    
    const auctionSim = auctionSims[0];
    console.log(`Found auction SIM card ${auctionSim.id}:`, {
      number: auctionSim.number,
      current_bid: auctionSim.auction_details?.current_bid,
      highest_bidder_id: auctionSim.auction_details?.highest_bidder_id,
      end_time: auctionSim.auction_details?.end_time
    });
    
    // Check if auction has ended
    const isAuctionEnded = auctionSim.auction_details && new Date(auctionSim.auction_details.end_time) < new Date();
    console.log(`Auction ended: ${isAuctionEnded}`);
    
    // If auction has ended and there's a highest bidder, try to purchase
    if (isAuctionEnded && auctionSim.auction_details?.highest_bidder_id) {
      console.log(`Attempting to purchase auction SIM card ${auctionSim.id} for user ${auctionSim.auction_details.highest_bidder_id}`);
      await api.purchaseSim(auctionSim.id, auctionSim.auction_details.highest_bidder_id);
      console.log(`Successfully purchased auction SIM card ${auctionSim.id}`);
    } else {
      console.log('Auction is not ended or no highest bidder found');
    }
  } catch (error) {
    console.error('Error testing auction purchase:', error.message);
  }
}

testAuctionPurchase();