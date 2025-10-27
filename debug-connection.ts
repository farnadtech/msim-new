import { db, isFirebaseConfigured } from './services/firebase';
import { collection, getDocs, query, limit } from 'firebase/firestore';

console.log('=== Firebase Connection Debug Info ===');
console.log('Firebase Configured:', isFirebaseConfigured);
console.log('Window Location:', window.location.href);

// Test Firebase connection
async function testConnection() {
  try {
    console.log('Testing Firebase connection...');
    const testQuery = query(collection(db, 'users'), limit(1));
    const querySnapshot = await getDocs(testQuery);
    console.log('Firebase connection successful!');
    console.log('Users collection has', querySnapshot.size, 'documents');
  } catch (error) {
    console.error('Firebase connection failed:', error);
  }
}

testConnection();

// Add a simple DOM element to verify the script is running
const debugDiv = document.createElement('div');
debugDiv.innerHTML = `
  <div style="position: fixed; top: 0; left: 0; width: 100%; background: #f00; color: white; padding: 10px; z-index: 9999;">
    <h3>Debug Info</h3>
    <p>Firebase Configured: ${isFirebaseConfigured}</p>
    <p>Check browser console for more details</p>
  </div>
`;
document.body.appendChild(debugDiv);