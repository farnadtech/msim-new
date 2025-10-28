import api from './services/api-supabase';

async function testUpdateAuction() {
  console.log('Testing auction update functionality...');
  
  try {
    // Get all SIM cards to find an auction SIM card
    const simCards = await api.getSimCards();
    const auctionSims = simCards.filter(sim => sim.type === 'auction');
    
    if (auctionSims.length === 0) {
      console.log('No auction SIM cards found');
      return;
    }
    
    const auctionSim = auctionSims[0];
    console.log(`Found auction SIM card ${auctionSim.id}:`, {
      number: auctionSim.number,
      current_bid: auctionSim.auction_details?.current_bid,
      end_time: auctionSim.auction_details?.end_time
    });
    
    // Try to update the auction details
    const newBid = (auctionSim.auction_details?.current_bid || 0) + 1000;
    await api.updateSimCard(auctionSim.id, {
      auction_details: {
        ...auctionSim.auction_details,
        current_bid: newBid
      }
    });
    
    console.log(`Successfully updated auction SIM card ${auctionSim.id} with new bid: ${newBid}`);
  } catch (error) {
    console.error('Error testing auction update:', error.message);
  }
}

testUpdateAuction();