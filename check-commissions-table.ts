// Simple script to check if commissions table exists
import { createClient } from '@supabase/supabase-js';

// You'll need to replace these with your actual Supabase credentials
const SUPABASE_URL = process.env.VITE_SUPABASE_URL || 'your_supabase_url';
const SUPABASE_KEY = process.env.VITE_SUPABASE_ANON_KEY || 'your_supabase_key';

const supabase = createClient(SUPABASE_URL, SUPABASE_KEY);

async function checkCommissionsTable() {
    try {
        console.log('Checking if commissions table exists...');
        
        // Try to query the commissions table
        const { data, error } = await supabase
            .from('commissions')
            .select('count')
            .limit(1);
            
        if (error) {
            console.log('Error querying commissions table:', error.message);
            if (error.message.includes('relation "commissions" does not exist')) {
                console.log('⚠️  Commissions table does not exist!');
                console.log('Please run the migration script:');
                console.log('supabase/add-commissions-table.sql');
            }
            return;
        }
        
        console.log('✅ Commissions table exists and is accessible');
        console.log('Sample query result:', data);
        
    } catch (error) {
        console.error('Unexpected error:', error);
    }
}

checkCommissionsTable();