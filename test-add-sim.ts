import { db } from './services/firebase';
import { collection, addDoc } from 'firebase/firestore';

// Function to remove undefined properties from an object
const removeUndefinedProps = (obj: any) => {
  const newObj: any = {};
  for (const key in obj) {
    if (obj[key] !== undefined) {
      newObj[key] = obj[key];
    }
  }
  return newObj;
};

async function testAddSim() {
  try {
    console.log('Testing addSimCard function...');
    
    // Simulate the data that would be passed to addSimCard
    const testData = {
      number: '09120000000',
      price: 1000000,
      seller_id: 'test-user-id-123',
      type: 'fixed' as const,
      status: 'available' as const,
      carrier: 'همراه اول' as const,
      is_rond: false
    };
    
    console.log('Original data:', testData);
    
    // Apply the same cleaning that happens in addSimCard
    const cleanedData = removeUndefinedProps(testData);
    console.log('Cleaned data:', cleanedData);
    
    // Try to add to Firebase
    const simCardsCol = collection(db, 'sim_cards');
    const docRef = await addDoc(simCardsCol, cleanedData);
    console.log(`Added SIM card with ID: ${docRef.id}`);
    
    // Check what was actually saved
    console.log('Data successfully saved to Firebase');
  } catch (error) {
    console.error('Error in testAddSim:', error);
  }
}

testAddSim();