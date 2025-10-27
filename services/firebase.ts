
import { initializeApp } from "firebase/app";
import { getAuth } from "firebase/auth";
import { getFirestore } from "firebase/firestore";

const firebaseConfig = {
  apiKey: "AIzaSyDV9vXH6TfjuBnJXQvw_zRwOYVVw9KNSac",
  authDomain: "studio-6437170298-9b924.firebaseapp.com",
  projectId: "studio-6437170298-9b924",
  storageBucket: "studio-6437170298-9b924.firebasestorage.app",
  messagingSenderId: "378820785975",
  appId: "1:378820785975:web:346d45d5d64ad53a16ccb2"
};

const app = initializeApp(firebaseConfig);
const auth = getAuth(app);
const db = getFirestore(app);

const isFirebaseConfigured = firebaseConfig.apiKey && firebaseConfig.apiKey.length > 0;

export { app, auth, db, isFirebaseConfigured, firebaseConfig };
