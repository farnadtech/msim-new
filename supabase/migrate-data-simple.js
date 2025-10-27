// Simple script to migrate data from Firebase to Supabase

import { createClient } from '@supabase/supabase-js';
import fs from 'fs';
import path from 'path';
import { fileURLToPath } from 'url';

// Get the directory name in ES modules
const __filename = fileURLToPath(import.meta.url);
const __dirname = path.dirname(__filename);

// Supabase configuration from your provided details
const supabaseUrl = 'https://idwiuczefxxnogiwtknb.supabase.co';
const supabaseKey = 'eyJhbGciOiJIUzI1NiIsInR5cCI6IkpXVCJ9.eyJpc3MiOiJzdXBhYmFzZSIsInJlZiI6Imlkd2l1Y3plZnh4bm9naXd0a25iIiwicm9sZSI6ImFub24iLCJpYXQiOjE3NjE1NTA1ODQsImV4cCI6MjA3NzEyNjU4NH0.W_kdBc0RLmdtfaVd8S0s3lV_OHJWY080hULxCg9MRrY';
const supabase = createClient(supabaseUrl, supabaseKey);

// Load Firebase data from JSON files
const dataDir = path.join(__dirname, 'data');
const usersData = JSON.parse(fs.readFileSync(path.join(dataDir, 'firebase-users.json'), 'utf8'));
const packagesData = JSON.parse(fs.readFileSync(path.join(dataDir, 'firebase-packages.json'), 'utf8'));
const simCardsData = JSON.parse(fs.readFileSync(path.join(dataDir, 'firebase-simcards.json'), 'utf8'));
const transactionsData = JSON.parse(fs.readFileSync(path.join(dataDir, 'firebase-transactions.json'), 'utf8'));

console.log('Loaded data:');
console.log('- Users:', usersData.length);
console.log('- Packages:', packagesData.length);
console.log('- SIM Cards:', simCardsData.length);
console.log('- Transactions:', transactionsData.length);

// Map to store Firebase user IDs to Supabase user IDs
const userIdMap = new Map();

async function migrateUsers() {
  console.log('Migrating users...');
  
  for (const user of usersData) {
    try {
      const userData = {
        id: user.id,
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
      
      const { data, error } = await supabase
        .from('users')
        .insert(userData);
        
      if (error) {
        console.error('Error inserting user:', error.message);
        console.log('User data:', userData);
      } else {
        console.log(`Migrated user: ${user.name}`);
      }
    } catch (err) {
      console.error('Exception inserting user:', err.message);
    }
  }
}

async function migratePackages() {
  console.log('Migrating packages...');
  
  for (const pkg of packagesData) {
    try {
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
      
      const { data, error } = await supabase
        .from('packages')
        .insert(packageData);
        
      if (error) {
        console.error('Error inserting package:', error.message);
        console.log('Package data:', packageData);
      } else {
        console.log(`Migrated package: ${pkg.name}`);
      }
    } catch (err) {
      console.error('Exception inserting package:', err.message);
    }
  }
}

async function migrateSimCards() {
  console.log('Migrating sim cards...');
  
  for (const sim of simCardsData) {
    try {
      const simData = {
        id: sim.id,
        number: sim.number,
        price: sim.price,
        seller_id: sim.seller_id,
        type: sim.type,
        status: sim.status,
        sold_date: sim.sold_date,
        carrier: sim.carrier,
        is_rond: sim.is_rond,
        inquiry_phone_number: sim.inquiry_phone_number,
        created_at: new Date().toISOString(),
        updated_at: new Date().toISOString()
      };
      
      const { data, error } = await supabase
        .from('sim_cards')
        .insert(simData);
        
      if (error) {
        console.error('Error inserting sim card:', error.message);
        console.log('SIM card data:', simData);
      } else {
        console.log(`Migrated sim card: ${sim.number}`);
      }
    } catch (err) {
      console.error('Exception inserting sim card:', err.message);
    }
  }
}

async function migrateTransactions() {
  console.log('Migrating transactions...');
  
  for (const transaction of transactionsData) {
    try {
      const transactionData = {
        id: transaction.id,
        user_id: transaction.user_id,
        type: transaction.type,
        amount: transaction.amount,
        date: transaction.date,
        description: transaction.description,
        created_at: new Date().toISOString()
      };
      
      const { data, error } = await supabase
        .from('transactions')
        .insert(transactionData);
        
      if (error) {
        console.error('Error inserting transaction:', error.message);
        console.log('Transaction data:', transactionData);
      } else {
        console.log(`Migrated transaction: ${transaction.description}`);
      }
    } catch (err) {
      console.error('Exception inserting transaction:', err.message);
    }
  }
}

async function migrateAllData() {
  try {
    console.log('Starting data migration...');
    await migrateUsers();
    await migratePackages();
    await migrateSimCards();
    await migrateTransactions();
    console.log('Data migration completed!');
  } catch (error) {
    console.error('Error during migration:', error.message);
  }
}

// Run the migration
migrateAllData();