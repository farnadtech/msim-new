import { supabase } from './services/supabase';

async function testDB() {
  try {
    console.log('Testing database connection...');
    
    // Try a simple query
    const { data, error } = await supabase
      .from('users')
      .select('id, name')
      .limit(1);
      
    if (error) {
      console.error('Database query failed:', error);
      return;
    }
    
    console.log('Database connection successful');
    console.log('Sample user data:', data);
    
  } catch (error) {
    console.error('Database test failed:', error);
  }
}

testDB();