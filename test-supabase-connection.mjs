import { createClient } from '@supabase/supabase-js';

// Supabase configuration
const supabaseUrl = 'https://idwiuczefxxnogiwtknb.supabase.co';
const supabaseKey = 'eyJhbGciOiJIUzI1NiIsInR5cCI6IkpXVCJ9.eyJpc3MiOiJzdXBhYmFzZSIsInJlZiI6Imlkd2l1Y3plZnh4bm9naXd0a25iIiwicm9sZSI6ImFub24iLCJpYXQiOjE3NjE1NTA1ODQsImV4cCI6MjA3NzEyNjU4NH0.W_kdBc0RLmdtfaVd8S0s3lV_OHJWY080hULxCg9MRrY';

const supabase = createClient(supabaseUrl, supabaseKey);

async function testConnection() {
  console.log('Testing Supabase connection...');
  
  // Test users table
  console.log('Fetching users...');
  const { data: users, error: usersError } = await supabase
    .from('users')
    .select('*')
    .limit(5);
    
  if (usersError) {
    console.error('Error fetching users:', usersError.message);
  } else {
    console.log('Users found:', users.length);
    if (users.length > 0) {
      console.log('First user:', users[0]);
    }
  }
  
  // Test sim_cards table
  console.log('Fetching sim cards...');
  const { data: simCards, error: simCardsError } = await supabase
    .from('sim_cards')
    .select('*')
    .limit(5);
    
  if (simCardsError) {
    console.error('Error fetching sim cards:', simCardsError.message);
  } else {
    console.log('SIM cards found:', simCards.length);
    if (simCards.length > 0) {
      console.log('First SIM card:', simCards[0]);
    }
  }
  
  // Test packages table
  console.log('Fetching packages...');
  const { data: packages, error: packagesError } = await supabase
    .from('packages')
    .select('*')
    .limit(5);
    
  if (packagesError) {
    console.error('Error fetching packages:', packagesError.message);
  } else {
    console.log('Packages found:', packages.length);
    if (packages.length > 0) {
      console.log('First package:', packages[0]);
    }
  }
}

testConnection();