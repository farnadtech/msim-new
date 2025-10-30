import { createClient } from '@supabase/supabase-js';

// Get credentials from environment variables
const supabaseUrl = process.env.VITE_SUPABASE_URL || '';
const supabaseKey = process.env.VITE_SUPABASE_ANON_KEY || '';

console.log('Supabase URL:', supabaseUrl);
console.log('Supabase Key exists:', !!supabaseKey);

if (!supabaseUrl || !supabaseKey) {
    console.log('Missing Supabase credentials');
    process.exit(1);
}

const supabase = createClient(supabaseUrl, supabaseKey);

async function testCommissionFetch() {
    try {
        console.log('Fetching commissions...');
        
        const { data, error } = await supabase
            .from('commissions')
            .select('*')
            .limit(5);
            
        if (error) {
            console.log('Error fetching commissions:', error.message);
            return;
        }
        
        console.log('Commissions found:', data?.length || 0);
        console.log('Data:', JSON.stringify(data, null, 2));
        
    } catch (error) {
        console.error('Error:', error);
    }
}

testCommissionFetch();
