import { collection, addDoc, setDoc, doc } from 'firebase/firestore';
import { db } from './services/firebase';
import { simCards, packages, transactions, users } from './data/mockData';
import { User, SimCard, Package, Transaction } from './types';

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

export async function seedDatabase() {
  console.log('Starting database seeding...');

  // Seed users
  console.log('Seeding users...');
  for (const user of users) {
    try {
      const userData = removeUndefinedProps(user);
      const docRef = await setDoc(doc(db, 'users', user.id), userData);
      console.log(`Added user ${user.name} with ID: ${user.id}`);
    } catch (e) {
      console.error('Error adding document: ', e);
    }
  }

  // Seed simcards
  console.log('Seeding simcards...');
  for (const simCard of simCards) {
    try {
      const simCardData = removeUndefinedProps(simCard);
      const docRef = await addDoc(collection(db, 'sim_cards'), simCardData);
      console.log(`Added simcard ${simCard.number} with ID: ${docRef.id}`);
    } catch (e) {
      console.error('Error adding document: ', e);
    }
  }

  // Seed packages
  console.log('Seeding packages...');
  for (const pkg of packages) {
    try {
      const packageData = removeUndefinedProps(pkg);
      const docRef = await addDoc(collection(db, 'packages'), packageData);
      console.log(`Added package ${pkg.name} with ID: ${docRef.id}`);
    } catch (e) {
      console.error('Error adding document: ', e);
    }
  }

  // Seed transactions
  console.log('Seeding transactions...');
  for (const transaction of transactions) {
    try {
      const transactionData = removeUndefinedProps(transaction);
      const docRef = await addDoc(collection(db, 'transactions'), transactionData);
      console.log(`Added transaction ${transaction.description} with ID: ${docRef.id}`);
    } catch (e) {
      console.error('Error adding document: ', e);
    }
  }

  console.log('Database seeding complete.');
}

seedDatabase();