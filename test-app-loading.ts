// Test to check if the app is loading correctly
console.log('=== Application Loading Test ===');

// Check if required elements exist
console.log('Checking for root element...');
const rootElement = document.getElementById('root');
console.log('Root element found:', !!rootElement);

// Check if Firebase is configured
import { isFirebaseConfigured, firebaseConfig } from './services/firebase';
console.log('Firebase configured:', isFirebaseConfigured);
console.log('Firebase config:', firebaseConfig);

// Try to load the app
import('./App').then((module) => {
  console.log('App module loaded successfully');
  console.log('App component:', typeof module.default);
}).catch((error) => {
  console.error('Error loading App module:', error);
});

// Add a visible element to the page
const testElement = document.createElement('div');
testElement.id = 'test-element';
testElement.style.position = 'fixed';
testElement.style.top = '10px';
testElement.style.right = '10px';
testElement.style.padding = '10px';
testElement.style.background = '#00f';
testElement.style.color = 'white';
testElement.style.zIndex = '9999';
testElement.innerHTML = '<strong>Test Running - Check Console</strong>';
document.body.appendChild(testElement);

console.log('=== Test Complete ===');