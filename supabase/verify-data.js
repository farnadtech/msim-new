// Script to verify data in Supabase

import { createClient } from '@supabase/supabase-js';

// Supabase configuration from your provided details
const supabaseUrl = 'https://idwiuczefxxnogiwtknb.supabase.co';
const supabaseKey = 'eyJhbGciOiJIUzI1NiIsInR5cCI6IkpXVCJ9.eyJpc3MiOiJzdXBhYmFzZSIsInJlZiI6Imlkd2l1Y3plZnh4bm9naXd0a25iIiwicm9sZSI6ImFub24iLCJpYXQiOjE3NjE1NTA1ODQsImV4cCI6MjA3NzEyNjU4NH0.W_kdBc0RLmdtfaVd8S0s3lV_OHJWY080hULxCg9MRrY';
const supabase = createClient(supabaseUrl, supabaseKey);

async function verifyData() {
  console.log('Verifying data in Supabase...');
  
  // Check users
  const { data: users, error: usersError } = await supabase
    .from('users')
    .select('*');
    
  if (usersError) {
    console.error('Error fetching users:', usersError.message);
  } else {
    console.log('Users count:', users.length);
    console.log('First user:', users[0]);
  }
  
  // Check packages
  const { data: packages, error: packagesError } = await supabase
    .from('packages')
    .select('*');
    
  if (packagesError) {
    console.error('Error fetching packages:', packagesError.message);
  } else {
    console.log('Packages count:', packages.length);
    console.log('First package:', packages[0]);
  }
  
  // Check sim cards
  const { data: simCards, error: simCardsError } = await supabase
    .from('sim_cards')
    .select('*');
    
  if (simCardsError) {
    console.error('Error fetching sim cards:', simCardsError.message);
  } else {
    console.log('SIM cards count:', simCards.length);
    console.log('First sim card:', simCards[0]);
  }
  
  // Check transactions
  const { data: transactions, error: transactionsError } = await supabase
    .from('transactions')
    .select('*');
    
  if (transactionsError) {
    console.error('Error fetching transactions:', transactionsError.message);
  } else {
    console.log('Transactions count:', transactions.length);
    if (transactions.length > 0) {
      console.log('First transaction:', transactions[0]);
    }
  }
}

// Run the verification
verifyData();