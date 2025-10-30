import api from './services/api-supabase';

async function debugSales() {
    console.log('Checking sold SIM cards...');
    
    try {
        const simCards = await api.getSimCards();
        const soldCards = simCards.filter(card => card.status === 'sold');
        
        console.log('Total SIM cards:', simCards.length);
        console.log('Sold SIM cards:', soldCards.length);
        
        if (soldCards.length > 0) {
            console.log('First few sold cards:');
            soldCards.slice(0, 3).forEach(card => {
                console.log(`- ${card.number} (${card.type}) - Sold on: ${card.sold_date}`);
            });
        }
        
        // Check transactions for sales
        const transactions = await api.getTransactions();
        const saleTransactions = transactions.filter(t => t.type === 'sale');
        
        console.log('Sale transactions:', saleTransactions.length);
        if (saleTransactions.length > 0) {
            console.log('Recent sale transactions:');
            saleTransactions.slice(0, 3).forEach(t => {
                console.log(`- ${t.description} (${t.amount}) on ${t.date}`);
            });
        }
    } catch (error) {
        console.error('Error checking sales:');
        console.error(error);
    }
}

debugSales();