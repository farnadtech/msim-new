import { createClient } from '@supabase/supabase-js';

// This script checks recent commission records directly from database
async function checkRecentCommissions() {
    try {
        // Use the API service instead
        const api = await import('./services/api-supabase');
        
        console.log('Fetching commissions from database...');
        const commissions = await api.default.getCommissions();
        
        console.log('Total commissions in database:', commissions.length);
        
        if (commissions.length > 0) {
            console.log('Recent commissions:');
            commissions.slice(0, 5).forEach((comm: any) => {
                console.log(`- SIM: ${comm.sim_number}, Seller: ${comm.seller_name}, Amount: ${comm.commission_amount}, Date: ${comm.date}`);
            });
        } else {
            console.log('No commissions found in database');
            
            // Check if there are any sales
            console.log('\nChecking for recent sales...');
            const simCards = await api.default.getSimCards();
            const recentSold = simCards
                .filter((s: any) => s.status === 'sold')
                .sort((a: any, b: any) => new Date(b.sold_date).getTime() - new Date(a.sold_date).getTime())
                .slice(0, 5);
                
            console.log('Recent sold SIM cards:');
            recentSold.forEach((sim: any) => {
                console.log(`- ${sim.number} sold on ${sim.sold_date}`);
            });
        }
    } catch (error) {
        console.error('Error:', error);
    }
}

checkRecentCommissions();
