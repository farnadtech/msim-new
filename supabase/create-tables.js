import fs from 'fs';
import { createClient } from '@supabase/supabase-js';

// Supabase configuration from your provided details
const supabaseUrl = 'https://idwiuczefxxnogiwtknb.supabase.co';
const supabaseKey = 'eyJhbGciOiJIUzI1NiIsInR5cCI6IkpXVCJ9.eyJpc3MiOiJzdXBhYmFzZSIsInJlZiI6Imlkd2l1Y3plZnh4bm9naXd0a25iIiwicm9sZSI6ImFub24iLCJpYXQiOjE3NjE1NTA1ODQsImV4cCI6MjA3NzEyNjU4NH0.W_kdBc0RLmdtfaVd8S0s3lV_OHJWY080hULxCg9MRrY';

const supabase = createClient(supabaseUrl, supabaseKey);

async function createTables() {
  console.log('Reading schema.sql file...');
  
  // Read the schema file
  const schema = fs.readFileSync('./schema.sql', 'utf8');
  
  // Split the schema into individual statements
  const statements = schema
    .split(';')
    .map(stmt => stmt.trim())
    .filter(stmt => stmt.length > 0);
  
  console.log(`Executing ${statements.length} statements...`);
  
  // Execute each statement
  for (let i = 0; i < statements.length; i++) {
    const statement = statements[i];
    console.log(`Executing statement ${i + 1}/${statements.length}`);
    
    try {
      // For CREATE EXTENSION statements, we need to handle them differently
      if (statement.startsWith('CREATE EXTENSION')) {
        console.log('Skipping extension creation (handled by Supabase):', statement);
        continue;
      }
      
      // Skip RLS and policy statements for now
      if (statement.includes('ROW LEVEL SECURITY') || statement.includes('CREATE POLICY') || 
          statement.includes('GRANT') || statement.includes('USAGE ON SCHEMA')) {
        console.log('Skipping RLS/policy/grant statement:', statement.substring(0, 50) + '...');
        continue;
      }
      
      // Skip uuid_generate_v4 function calls
      if (statement.includes('uuid_generate_v4')) {
        console.log('Skipping uuid_generate_v4 statement:', statement.substring(0, 50) + '...');
        continue;
      }
      
      const { error } = await supabase.rpc('exec_sql', { sql: statement + ';' });
      
      if (error) {
        console.error('Error executing statement:', error.message);
        console.log('Statement:', statement);
      } else {
        console.log('Successfully executed statement');
      }
    } catch (err) {
      console.error('Exception executing statement:', err.message);
      console.log('Statement:', statement);
    }
  }
  
  console.log('Finished executing all statements');
}

// Run the function
createTables().catch(console.error);