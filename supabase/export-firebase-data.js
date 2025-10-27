// Script to export data from Firebase Firestore to JSON files
// This script should be run in your Firebase project environment

import { initializeApp } from 'firebase/app';
import { getFirestore, collection, getDocs } from 'firebase/firestore';
import fs from 'fs';

// Firebase configuration (using your actual config from services/firebase.ts)
const firebaseConfig = {
  apiKey: "AIzaSyDV9vXH6TfjuBnJXQvw_zRwOYVVw9KNSac",
  authDomain: "studio-6437170298-9b924.firebaseapp.com",
  projectId: "studio-6437170298-9b924",
  storageBucket: "studio-6437170298-9b924.firebasestorage.app",
  messagingSenderId: "378820785975",
  appId: "1:378820785975:web:346d45d5d64ad53a16ccb2"
};

// Initialize Firebase
const app = initializeApp(firebaseConfig);
const db = getFirestore(app);

async function exportCollection(collectionName, fileName) {
  try {
    const collectionRef = collection(db, collectionName);
    const snapshot = await getDocs(collectionRef);
    
    const data = [];
    snapshot.forEach((doc) => {
      data.push({ id: doc.id, ...doc.data() });
    });
    
    fs.writeFileSync(`./data/firebase-${fileName}.json`, JSON.stringify(data, null, 2));
    console.log(`Exported ${data.length} documents from ${collectionName} to firebase-${fileName}.json`);
  } catch (error) {
    console.error(`Error exporting ${collectionName}:`, error);
  }
}

async function exportAllData() {
  // Create data directory if it doesn't exist
  if (!fs.existsSync('./data')) {
    fs.mkdirSync('./data');
  }
  
  // Export all collections
  await exportCollection('users', 'users');
  await exportCollection('packages', 'packages');
  await exportCollection('sim_cards', 'simcards');
  await exportCollection('transactions', 'transactions');
  
  console.log('All data exported successfully!');
}

// Run the export
exportAllData();