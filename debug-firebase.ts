import { db, isFirebaseConfigured } from './services/firebase';
import { collection, getDocs, query, limit } from 'firebase/firestore';

console.log('Firebase Configuration Status:', isFirebaseConfigured);

async function debugFirebaseConnection() {
  try {
    console.log('Testing Firebase connection...');
    
    // Test basic connection
    const testQuery = query(collection(db, 'users'), limit(1));
    const querySnapshot = await getDocs(testQuery);
    console.log(`Connection successful. Found ${querySnapshot.size} documents in test query`);
    
    // Try to get all users
    const usersQuery = query(collection(db, 'users'));
    const usersSnapshot = await getDocs(usersQuery);
    console.log(`Found ${usersSnapshot.size} users in the database`);
    
    // Try to get all sim cards
    const simsQuery = query(collection(db, 'sim_cards'));
    const simsSnapshot = await getDocs(simsQuery);
    console.log(`Found ${simsSnapshot.size} sim cards in the database`);
    
  } catch (error) {
    console.error('Error details:', error);
    console.error('Error connecting to Firebase:', error.message);
  }
}

debugFirebaseConnection();