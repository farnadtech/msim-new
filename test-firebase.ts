import { db } from './services/firebase';
import { collection, getDocs } from 'firebase/firestore';

async function testFirebaseConnection() {
  try {
    console.log('Testing Firebase connection...');
    const querySnapshot = await getDocs(collection(db, 'users'));
    console.log(`Found ${querySnapshot.size} users in the database`);
    querySnapshot.forEach((doc) => {
      console.log(`${doc.id} => ${JSON.stringify(doc.data())}`);
    });
  } catch (error) {
    console.error('Error connecting to Firebase:', error);
  }
}

testFirebaseConnection();