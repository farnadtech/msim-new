import api from './services/api-supabase';

async function debugCommissions() {
    console.log('Testing commission fetching...');
    
    try {
        const commissions = await api.getCommissions();
        console.log('Commissions fetched successfully!');
        console.log('Number of commissions:', commissions.length);
        console.log('First few commissions:', commissions.slice(0, 3));
    } catch (error) {
        console.error('Error fetching commissions:');
        console.error(error);
    }
}

debugCommissions();