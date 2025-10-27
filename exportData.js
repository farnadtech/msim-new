"use strict";
Object.defineProperty(exports, "__esModule", { value: true });
const firestore_1 = require("firebase/firestore");
const firebase_1 = require("./services/firebase");
async function exportData() {
    try {
        console.log('Starting data export...');
        // Export users
        console.log('Exporting users...');
        const usersCol = (0, firestore_1.collection)(firebase_1.db, 'users');
        const usersSnapshot = await (0, firestore_1.getDocs)(usersCol);
        const usersData = usersSnapshot.docs.map(doc => (Object.assign({ id: doc.id }, doc.data())));
        console.log(`Exported ${usersData.length} users`);
        // Export sim cards
        console.log('Exporting sim cards...');
        const simCardsCol = (0, firestore_1.collection)(firebase_1.db, 'sim_cards');
        const simCardsSnapshot = await (0, firestore_1.getDocs)(simCardsCol);
        const simCardsData = simCardsSnapshot.docs.map(doc => (Object.assign({ id: doc.id }, doc.data())));
        console.log(`Exported ${simCardsData.length} sim cards`);
        // Export packages
        console.log('Exporting packages...');
        const packagesCol = (0, firestore_1.collection)(firebase_1.db, 'packages');
        const packagesSnapshot = await (0, firestore_1.getDocs)(packagesCol);
        const packagesData = packagesSnapshot.docs.map(doc => (Object.assign({ id: doc.id }, doc.data())));
        console.log(`Exported ${packagesData.length} packages`);
        // Export transactions
        console.log('Exporting transactions...');
        const transactionsCol = (0, firestore_1.collection)(firebase_1.db, 'transactions');
        const transactionsSnapshot = await (0, firestore_1.getDocs)(transactionsCol);
        const transactionsData = transactionsSnapshot.docs.map(doc => (Object.assign({ id: doc.id }, doc.data())));
        console.log(`Exported ${transactionsData.length} transactions`);
        // Export payment receipts (if they exist)
        try {
            console.log('Exporting payment receipts...');
            const receiptsCol = (0, firestore_1.collection)(firebase_1.db, 'payment_receipts');
            const receiptsSnapshot = await (0, firestore_1.getDocs)(receiptsCol);
            const receiptsData = receiptsSnapshot.docs.map(doc => (Object.assign({ id: doc.id }, doc.data())));
            console.log(`Exported ${receiptsData.length} payment receipts`);
        }
        catch (error) {
            console.log('No payment receipts collection found');
        }
        // Create export object
        const exportData = {
            users: usersData,
            simCards: simCardsData,
            packages: packagesData,
            transactions: transactionsData,
            exportDate: new Date().toISOString()
        };
        // Save to file
        const fs = require('fs');
        fs.writeFileSync('exported_data.json', JSON.stringify(exportData, null, 2));
        console.log('Data exported successfully to exported_data.json');
    }
    catch (error) {
        console.error('Error exporting data:', error);
    }
}
exportData();
