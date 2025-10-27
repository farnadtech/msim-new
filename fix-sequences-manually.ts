import { createClient } from '@supabase/supabase-js';

// Supabase configuration
const supabaseUrl = 'https://idwiuczefxxnogiwtknb.supabase.co';
const supabaseKey = 'eyJhbGciOiJIUzI1NiIsInR5cCI6IkpXVCJ9.eyJpc3MiOiJzdXBhYmFzZSIsInJlZiI6Imlkd2l1Y3plZnh4bm9naXd0a25iIiwicm9sZSI6ImFub24iLCJpYXQiOjE3NjE1NTA1ODQsImV4cCI6MjA3NzEyNjU4NH0.W_kdBc0RLmdtfaVd8S0s3lV_OHJWY080hULxCg9MRrY';

const supabase = createClient(supabaseUrl, supabaseKey);

async function fixSequencesManually() {
  console.log('Manually fixing sequences...');
  
  try {
    // Get the current max ID from sim_cards table
    const { data: maxSimId } = await supabase
      .from('sim_cards')
      .select('id')
      .order('id', { ascending: false })
      .limit(1)
      .single();
      
    const maxSimCardId = maxSimId?.id || 0;
    const newSimCardSequence = maxSimCardId + 100; // Set it much higher to avoid conflicts
    
    console.log(`Setting sim_cards sequence to ${newSimCardSequence} (current max: ${maxSimCardId})`);
    
    // Insert a temporary record with the new sequence value to force the sequence to update
    const { error: insertError } = await supabase
      .from('sim_cards')
      .insert({
        id: newSimCardSequence,
        number: `0912${newSimCardSequence}999`,
        price: 1000000,
        seller_id: '00000000-0000-0000-0000-000000000001',
        type: 'fixed',
        status: 'available',
        carrier: 'همراه اول',
        is_rond: false
      });
      
    if (insertError) {
      console.error('Error inserting temporary record:', insertError.message);
    } else {
      console.log('Successfully inserted temporary record with ID:', newSimCardSequence);
      
      // Delete the temporary record
      const { error: deleteError } = await supabase
        .from('sim_cards')
        .delete()
        .eq('id', newSimCardSequence);
        
      if (deleteError) {
        console.error('Error deleting temporary record:', deleteError.message);
      } else {
        console.log('Successfully deleted temporary record');
      }
    }
  } catch (err) {
    console.error('Exception fixing sim_cards sequence:', err.message);
  }
  
  try {
    // Get the current max ID from auction_details table
    const { data: maxAuctionId } = await supabase
      .from('auction_details')
      .select('id')
      .order('id', { ascending: false })
      .limit(1)
      .single();
      
    const maxAuctionDetailId = maxAuctionId?.id || 0;
    const newAuctionDetailSequence = maxAuctionDetailId + 100; // Set it much higher to avoid conflicts
    
    console.log(`Setting auction_details sequence to ${newAuctionDetailSequence} (current max: ${maxAuctionDetailId})`);
    
    // Insert a temporary record with the new sequence value to force the sequence to update
    const { error: insertError } = await supabase
      .from('auction_details')
      .insert({
        id: newAuctionDetailSequence,
        sim_card_id: 1, // This won't be used, just need a valid reference
        current_bid: 1000000,
        highest_bidder_id: null,
        end_time: new Date(Date.now() + 7 * 24 * 60 * 60 * 1000).toISOString()
      });
      
    if (insertError) {
      console.error('Error inserting temporary auction details record:', insertError.message);
    } else {
      console.log('Successfully inserted temporary auction details record with ID:', newAuctionDetailSequence);
      
      // Delete the temporary record
      const { error: deleteError } = await supabase
        .from('auction_details')
        .delete()
        .eq('id', newAuctionDetailSequence);
        
      if (deleteError) {
        console.error('Error deleting temporary auction details record:', deleteError.message);
      } else {
        console.log('Successfully deleted temporary auction details record');
      }
    }
  } catch (err) {
    console.error('Exception fixing auction_details sequence:', err.message);
  }
  
  console.log('Finished manually fixing sequences');
}

fixSequencesManually();