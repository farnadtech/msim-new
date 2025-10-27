import { createClient } from '@supabase/supabase-js';

// Supabase configuration
const supabaseUrl = 'https://idwiuczefxxnogiwtknb.supabase.co';
const supabaseKey = 'eyJhbGciOiJIUzI1NiIsInR5cCI6IkpXVCJ9.eyJpc3MiOiJzdXBhYmFzZSIsInJlZiI6Imlkd2l1Y3plZnh4bm9naXd0a25iIiwicm9sZSI6ImFub24iLCJpYXQiOjE3NjE1NTA1ODQsImV4cCI6MjA3NzEyNjU4NH0.W_kdBc0RLmdtfaVd8S0s3lV_OHJWY080hULxCg9MRrY';

const supabase = createClient(supabaseUrl, supabaseKey);

async function debugSequenceIssue() {
  console.log('Debugging sequence issue...');
  
  // Try inserting without specifying ID at all
  console.log('Test 1: Insert without specifying ID');
  try {
    const { data, error } = await supabase
      .from('sim_cards')
      .insert({
        number: '09129998888',
        price: 2000000,
        seller_id: '00000000-0000-0000-0000-000000000001',
        type: 'fixed',
        status: 'available',
        carrier: 'همراه اول',
        is_rond: false
      })
      .select();
      
    if (error) {
      console.error('Error inserting without ID:', error.message);
      
      // Check if it's a sequence issue by trying with a very high ID
      console.log('Test 2: Insert with very high ID');
      const { data: highIdData, error: highIdError } = await supabase
        .from('sim_cards')
        .insert({
          id: 999999,
          number: '09129997777',
          price: 2000000,
          seller_id: '00000000-0000-0000-0000-000000000001',
          type: 'fixed',
          status: 'available',
          carrier: 'همراه اول',
          is_rond: false
        })
        .select();
        
      if (highIdError) {
        console.error('Error inserting with high ID:', highIdError.message);
      } else {
        console.log('Successfully inserted with high ID:', highIdData[0].id);
        
        // Clean up
        await supabase
          .from('sim_cards')
          .delete()
          .eq('id', highIdData[0].id);
      }
    } else {
      console.log('Successfully inserted without ID, new ID:', data[0].id);
      
      // Clean up
      await supabase
        .from('sim_cards')
        .delete()
        .eq('id', data[0].id);
    }
  } catch (err) {
    console.error('Exception in Test 1:', err.message);
  }
  
  // Check what the next value of the sequence would be if we could access it
  console.log('\nTrying to understand sequence behavior...');
  
  // Insert several records to see what IDs are generated
  for (let i = 0; i < 3; i++) {
    try {
      const { data, error } = await supabase
        .from('sim_cards')
        .insert({
          number: `0912000${i}000`,
          price: 1000000 + i * 100000,
          seller_id: '00000000-0000-0000-0000-000000000001',
          type: 'fixed',
          status: 'available',
          carrier: 'همراه اول',
          is_rond: false
        })
        .select();
        
      if (error) {
        console.error(`Error inserting test record ${i}:`, error.message);
      } else {
        console.log(`Successfully inserted test record ${i} with ID:`, data[0].id);
        
        // Clean up immediately
        await supabase
          .from('sim_cards')
          .delete()
          .eq('id', data[0].id);
      }
    } catch (err) {
      console.error(`Exception inserting test record ${i}:`, err.message);
    }
  }
}

debugSequenceIssue();