import api from './services/api-supabase';

async function testAddSimCard() {
  console.log('Testing addSimCard function...');
  
  try {
    // Test adding a regular SIM card
    console.log('Test 1: Adding a regular SIM card');
    const regularSimData = {
      number: '09121111111',
      price: 1500000,
      type: 'fixed' as const,
      carrier: 'همراه اول' as const,
      is_rond: false
    };
    
    // We need to mock the seller_id since we're not in a real auth context
    const simDataWithSeller = {
      ...regularSimData,
      seller_id: '00000000-0000-0000-0000-000000000001', // Admin user ID
      status: 'available' as const
    };
    
    const result = await api.addSimCard(simDataWithSeller);
    console.log('Successfully added regular SIM card with ID:', result);
    
    // Clean up by deleting the SIM card we just added
    await api.updateSimCard(parseInt(result), { status: 'sold' });
    console.log('Cleaned up test SIM card');
    
  } catch (error) {
    console.error('Error in Test 1:', error.message);
  }
  
  try {
    // Test adding an auction SIM card
    console.log('\nTest 2: Adding an auction SIM card');
    const auctionSimData = {
      number: '09122222222',
      price: 2500000,
      type: 'auction' as const,
      carrier: 'ایرانسل' as const,
      is_rond: true
    };
    
    // We need to mock the seller_id since we're not in a real auth context
    const simDataWithSeller = {
      ...auctionSimData,
      seller_id: '00000000-0000-0000-0000-000000000001', // Admin user ID
      status: 'available' as const
    };
    
    const result = await api.addSimCard(simDataWithSeller);
    console.log('Successfully added auction SIM card with ID:', result);
    
    // Clean up by deleting the auction details and SIM card
    // Note: In a real scenario, we'd need to handle this more carefully
    console.log('Would clean up auction SIM card and its details in a real test');
    
  } catch (error) {
    console.error('Error in Test 2:', error.message);
  }
  
  console.log('\nTest completed.');
}

testAddSimCard();