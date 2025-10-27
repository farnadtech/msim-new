import { db } from './services/firebase';
import { collection, getDocs } from 'firebase/firestore';

async function testSimData() {
  try {
    console.log('Fetching SIM card data from Firebase...');
    const querySnapshot = await getDocs(collection(db, 'sim_cards'));
    console.log(`Found ${querySnapshot.size} SIM cards in the database`);
    
    querySnapshot.forEach((doc) => {
      const data = doc.data();
      console.log(`Document ID: ${doc.id}`);
      console.log('Data:', JSON.stringify(data, null, 2));
      console.log('---');
    });
  } catch (error) {
    console.error('Error fetching SIM card data:', error);
  }
}

testSimData();