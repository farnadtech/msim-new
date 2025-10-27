// Script to convert mock data to JSON format for migration

import fs from 'fs';
import { users, simCards, packages, transactions } from '../data/mockData.js';

// Create data directory if it doesn't exist
if (!fs.existsSync('./data')) {
  fs.mkdirSync('./data');
}

// Convert users data
const usersJson = users.map(user => ({
  id: user.id,
  name: user.name,
  role: user.role,
  email: user.email,
  wallet_balance: user.wallet_balance,
  blocked_balance: user.blocked_balance,
  phoneNumber: user.phoneNumber,
  package_id: user.package_id
}));

// Convert sim cards data
const simCardsJson = simCards.map(sim => ({
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
  auction_details: sim.auction_details
}));

// Convert packages data
const packagesJson = packages.map(pkg => ({
  id: pkg.id,
  name: pkg.name,
  price: pkg.price,
  duration_days: pkg.duration_days,
  listing_limit: pkg.listing_limit,
  description: pkg.description
}));

// Convert transactions data
const transactionsJson = transactions.map(transaction => ({
  id: transaction.id,
  user_id: transaction.user_id,
  type: transaction.type,
  amount: transaction.amount,
  date: transaction.date,
  description: transaction.description
}));

// Write data to JSON files
fs.writeFileSync('./data/firebase-users.json', JSON.stringify(usersJson, null, 2));
fs.writeFileSync('./data/firebase-simcards.json', JSON.stringify(simCardsJson, null, 2));
fs.writeFileSync('./data/firebase-packages.json', JSON.stringify(packagesJson, null, 2));
fs.writeFileSync('./data/firebase-transactions.json', JSON.stringify(transactionsJson, null, 2));

console.log('Data converted and saved to JSON files:');
console.log('- users:', usersJson.length, 'records');
console.log('- sim cards:', simCardsJson.length, 'records');
console.log('- packages:', packagesJson.length, 'records');
console.log('- transactions:', transactionsJson.length, 'records');