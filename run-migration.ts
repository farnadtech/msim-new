import { createClient } from '@supabase/supabase-js';

const supabaseUrl = process.env.VITE_SUPABASE_URL || '';
const supabaseKey = process.env.VITE_SUPABASE_ANON_KEY || '';

if (!supabaseUrl || !supabaseKey) {
    console.log('╔════════════════════════════════════════════════════════════════════════════════╗');
    console.log('║                        ROUND LEVEL MIGRATION REQUIRED                           ║');
    console.log('╚════════════════════════════════════════════════════════════════════════════════╝');
    console.log('');
    console.log('To add the rond_level column to your database, please run the following SQL in your');
    console.log('Supabase SQL Editor:');
    console.log('');
    console.log('---');
    console.log('ALTER TABLE sim_cards ADD COLUMN rond_level INTEGER CHECK (rond_level IN (1, 2, 3, 4, 5));');
    console.log('CREATE INDEX idx_sim_cards_rond_level ON sim_cards(rond_level);');
    console.log('---');
    console.log('');
    console.log('Steps:');
    console.log('1. Go to https://app.supabase.com');
    console.log('2. Select your project');
    console.log('3. Go to SQL Editor');
    console.log('4. Click "New Query"');
    console.log('5. Paste the SQL above and run it');
    console.log('');
    process.exit(1);
}

const supabase = createClient(supabaseUrl, supabaseKey);

async function runMigration() {
    try {
        console.log('Checking if rond_level column exists...');
        
        // Try to query the column
        const { data, error: checkError } = await supabase
            .from('sim_cards')
            .select('rond_level')
            .limit(1);
        
        if (checkError && checkError.message.includes('column "rond_level" does not exist')) {
            console.log('❌ rond_level column not found!');
            console.log('');
            console.log('Please run the following SQL in your Supabase SQL Editor:');
            console.log('');
            console.log('ALTER TABLE sim_cards ADD COLUMN rond_level INTEGER CHECK (rond_level IN (1, 2, 3, 4, 5));');
            console.log('CREATE INDEX idx_sim_cards_rond_level ON sim_cards(rond_level);');
            process.exit(1);
        } else if (!checkError || checkError.message.includes('successfully')) {
            console.log('✅ rond_level column already exists!');
        } else {
            console.error('❌ Error checking for column:', checkError?.message);
            process.exit(1);
        }
        
    } catch (error) {
        console.error('❌ Migration error:', error);
        process.exit(1);
    }
}

runMigration();
