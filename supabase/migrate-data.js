// Script to migrate data from Firebase to Supabase
// This script assumes you have exported your Firebase data to JSON files

import { createClient } from '@supabase/supabase-js';
import fs from 'fs';

// Supabase configuration from your provided details
const supabaseUrl = 'https://idwiuczefxxnogiwtknb.supabase.co';
const supabaseKey = 'eyJhbGciOiJIUzI1NiIsInR5cCI6IkpXVCJ9.eyJpc3MiOiJzdXBhYmFzZSIsInJlZiI6Imlkd2l1Y3plZnh4bm9naXd0a25iIiwicm9sZSI6ImFub24iLCJpYXQiOjE3NjE1NTA1ODQsImV4cCI6MjA3NzEyNjU4NH0.W_kdBc0RLmdtfaVd8S0s3lV_OHJWY080hULxCg9MRrY';
const supabase = createClient(supabaseUrl, supabaseKey);

// Load Firebase data from JSON files
const usersData = JSON.parse(fs.readFileSync('./supabase/data/firebase-users.json', 'utf8'));
const packagesData = JSON.parse(fs.readFileSync('./supabase/data/firebase-packages.json', 'utf8'));
const simCardsData = JSON.parse(fs.readFileSync('./supabase/data/firebase-simcards.json', 'utf8'));
const transactionsData = JSON.parse(fs.readFileSync('./supabase/data/firebase-transactions.json', 'utf8'));

// Map to store Firebase user IDs to Supabase user IDs
const userIdMap = new Map();

async function migrateUsers() {
  console.log('Migrating users...');
  
  for (const user of usersData) {
    // Generate a new UUID for the user in Supabase
    const { data, error } = await supabase.rpc('uuid_generate_v4');
    if (error) {
      console.error('Error generating UUID:', error);
      continue;
    }
    
    const newUserId = data;
    userIdMap.set(user.id, newUserId);
    
    const userData = {
      id: newUserId,
      name: user.name,
      role: user.role,
      email: user.email,
      wallet_balance: user.wallet_balance || 0,
      blocked_balance: user.blocked_balance || 0,
      phone_number: user.phoneNumber,
      package_id: user.package_id,
      created_at: new Date().toISOString(),
      updated_at: new Date().toISOString()
    };
    
    const { error: insertError } = await supabase
      .from('users')
      .insert(userData);
      
    if (insertError) {
      console.error('Error inserting user:', insertError);
    } else {
      console.log(`Migrated user: ${user.name}`);
    }
  }
}

async function migratePackages() {
  console.log('Migrating packages...');
  
  for (const pkg of packagesData) {
    const packageData = {
      id: pkg.id,
      name: pkg.name,
      price: pkg.price,
      duration_days: pkg.duration_days,
      listing_limit: pkg.listing_limit,
      description: pkg.description,
      created_at: new Date().toISOString(),
      updated_at: new Date().toISOString()
    };
    
    const { error } = await supabase
      .from('packages')
      .insert(packageData);
      
    if (error) {
      console.error('Error inserting package:', error);
    } else {
      console.log(`Migrated package: ${pkg.name}`);
    }
  }
}

async function migrateSimCards() {
  console.log('Migrating sim cards...');
  
  for (const sim of simCardsData) {
    // Convert seller_id from Firebase to Supabase
    const sellerId = userIdMap.get(sim.seller_id) || sim.seller_id;
    
    const simData = {
      id: sim.id,
      number: sim.number,
      price: sim.price,
      seller_id: sellerId,
      type: sim.type,
      status: sim.status,
      sold_date: sim.sold_date,
      carrier: sim.carrier,
      is_rond: sim.is_rond,
      inquiry_phone_number: sim.inquiry_phone_number,
      created_at: new Date().toISOString(),
      updated_at: new Date().toISOString()
    };
    
    const { error } = await supabase
      .from('sim_cards')
      .insert(simData);
      
    if (error) {
      console.error('Error inserting sim card:', error);
    } else {
      console.log(`Migrated sim card: ${sim.number}`);
      
      // If this sim card has auction details, migrate them too
      if (sim.type === 'auction' && sim.auction_details) {
        await migrateAuctionDetails(sim.id, sim.auction_details);
      }
    }
  }
}

async function migrateAuctionDetails(simCardId, auctionDetails) {
  // Convert highest_bidder_id from Firebase to Supabase
  const highestBidderId = userIdMap.get(auctionDetails.highest_bidder_id) || auctionDetails.highest_bidder_id;
  
  const auctionData = {
    sim_card_id: simCardId,
    end_time: auctionDetails.end_time,
    current_bid: auctionDetails.current_bid,
    highest_bidder_id: highestBidderId,
    created_at: new Date().toISOString(),
    updated_at: new Date().toISOString()
  };
  
  const { error } = await supabase
    .from('auction_details')
    .insert(auctionData);
    
  if (error) {
    console.error('Error inserting auction details:', error);
  } else {
    console.log(`Migrated auction details for sim card: ${simCardId}`);
  }
  
  // Migrate bids if they exist
  if (auctionDetails.bids && auctionDetails.bids.length > 0) {
    for (const bid of auctionDetails.bids) {
      await migrateBid(simCardId, bid);
    }
  }
}

async function migrateBid(simCardId, bid) {
  // Convert user_id from Firebase to Supabase
  const userId = userIdMap.get(bid.user_id) || bid.user_id;
  
  const bidData = {
    sim_card_id: simCardId,
    user_id: userId,
    amount: bid.amount,
    date: bid.date,
    created_at: new Date().toISOString()
  };
  
  const { error } = await supabase
    .from('bids')
    .insert(bidData);
    
  if (error) {
    console.error('Error inserting bid:', error);
  } else {
    console.log(`Migrated bid for sim card: ${simCardId}`);
  }
}

async function migrateTransactions() {
  console.log('Migrating transactions...');
  
  for (const transaction of transactionsData) {
    // Convert user_id from Firebase to Supabase
    const userId = userIdMap.get(transaction.user_id) || transaction.user_id;
    
    const transactionData = {
      id: transaction.id,
      user_id: userId,
      type: transaction.type,
      amount: transaction.amount,
      date: transaction.date,
      description: transaction.description,
      created_at: new Date().toISOString()
    };
    
    const { error } = await supabase
      .from('transactions')
      .insert(transactionData);
      
    if (error) {
      console.error('Error inserting transaction:', error);
    } else {
      console.log(`Migrated transaction: ${transaction.description}`);
    }
  }
}

async function migrateAllData() {
  try {
    await migrateUsers();
    await migratePackages();
    await migrateSimCards();
    await migrateTransactions();
    console.log('Data migration completed!');
  } catch (error) {
    console.error('Error during migration:', error);
  }
}

// Run the migration
migrateAllData();