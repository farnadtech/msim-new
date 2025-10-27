import { createClient } from '@supabase/supabase-js';

// Supabase configuration
const supabaseUrl = 'https://idwiuczefxxnogiwtknb.supabase.co';
const supabaseKey = 'eyJhbGciOiJIUzI1NiIsInR5cCI6IkpXVCJ9.eyJpc3MiOiJzdXBhYmFzZSIsInJlZiI6Imlkd2l1Y3plZnh4bm9naXd0a25iIiwicm9sZSI6ImFub24iLCJpYXQiOjE3NjE1NTA1ODQsImV4cCI6MjA3NzEyNjU4NH0.W_kdBc0RLmdtfaVd8S0s3lV_OHJWY080hULxCg9MRrY';

const supabase = createClient(supabaseUrl, supabaseKey);

async function fixSequencesWithSQL() {
  console.log('Fixing database sequences with SQL...');
  
  try {
    // Fix sim_cards sequence
    const { data, error } = await supabase.rpc('execute_sql', {
      sql: "SELECT setval('sim_cards_id_seq', (SELECT MAX(id) FROM sim_cards) + 1);"
    });
    
    if (error) {
      console.error('Error fixing sim_cards sequence:', error.message);
    } else {
      console.log('Successfully fixed sim_cards sequence');
    }
  } catch (err) {
    console.error('Exception while fixing sim_cards sequence:', err.message);
  }
  
  try {
    // Fix auction_details sequence
    const { data, error } = await supabase.rpc('execute_sql', {
      sql: "SELECT setval('auction_details_id_seq', (SELECT MAX(id) FROM auction_details) + 1);"
    });
    
    if (error) {
      console.error('Error fixing auction_details sequence:', error.message);
    } else {
      console.log('Successfully fixed auction_details sequence');
    }
  } catch (err) {
    console.error('Exception while fixing auction_details sequence:', err.message);
  }
}

fixSequencesWithSQL();