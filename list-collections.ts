import { db } from './services/firebase';
import { collection, getDocs, query, limit } from 'firebase/firestore';

async function listCollections() {
  try {
    console.log('Listing collections in Firestore...');
    
    // Try to list collections (this might not work in all environments)
    // We'll try to access each known collection directly
    
    const collectionsToCheck = ['users', 'sim_cards', 'packages', 'transactions'];
    
    for (const collectionName of collectionsToCheck) {
      try {
        const q = query(collection(db, collectionName), limit(5));
        const snapshot = await getDocs(q);
        console.log(`Collection '${collectionName}': ${snapshot.size} documents`);
        
        // Show first few documents
        let count = 0;
        snapshot.forEach((doc) => {
          if (count < 3) {
            console.log(`  ${doc.id}:`, JSON.stringify(doc.data(), null, 2));
            count++;
          }
        });
        
        if (snapshot.size > 3) {
          console.log(`  ... and ${snapshot.size - 3} more documents`);
        }
      } catch (error) {
        console.error(`Error accessing collection '${collectionName}':`, error.message);
      }
    }
  } catch (error) {
    console.error('Error listing collections:', error);
  }
}

listCollections();