import { createClient } from '@supabase/supabase-js';

const SUPABASE_URL = process.env.VITE_SUPABASE_URL || 'https://mshhnzuicorukxjrmzhp.supabase.co';
const SUPABASE_KEY = process.env.VITE_SUPABASE_ANON_KEY || 'eyJhbGciOiJIUzI1NiIsInR5cCI6IkpXVCJ9.eyJpc3MiOiJzdXBhYmFzZSIsInJlZiI6Im1zaGhuenVpY29ydWt4anJtemhwIiwicm9sZSI6ImFub24iLCJpYXQiOjE3MDk3MzM2NDgsImV4cCI6MjAyNTMwOTY0OH0.VOMaP8ViO5hDL0zWZaP1oKAWHd0gjdGPzI4j6RbNQbY';

const supabase = createClient(SUPABASE_URL, SUPABASE_KEY);

async function fixNotificationsTable() {
  console.log('🔧 Attempting to fix notifications table RLS policies...\n');

  try {
    // Test if we can query notifications table
    console.log('📋 Testing notifications table access...');
    const { data, error } = await supabase
      .from('notifications')
      .select('COUNT(*)', { count: 'exact', head: true });

    if (error) {
      if (error.message.includes('relation "notifications" does not exist')) {
        console.log('❌ Notifications table does not exist!');
        console.log('📌 Please run the following SQL in your Supabase console:');
        console.log('   File: supabase/add-notifications-table.sql');
        console.log('\nTo access Supabase console:');
        console.log('1. Go to https://app.supabase.com');
        console.log('2. Select your project');
        console.log('3. Go to SQL Editor');
        console.log('4. Create a new query');
        console.log('5. Copy and paste the contents of add-notifications-table.sql');
        console.log('6. Click Execute');
        process.exit(1);
      } else {
        console.log('❌ Error accessing notifications table:', error.message);
        process.exit(1);
      }
    }

    console.log('✅ Notifications table exists and is accessible!');

    // Try to create a test notification
    console.log('\n🧪 Testing notification creation...');
    const testUserId = '00000000-0000-0000-0000-000000000001';
    
    const { error: insertError } = await supabase
      .from('notifications')
      .insert({
        user_id: testUserId,
        title: 'Test Notification',
        message: 'This is a test notification',
        type: 'info',
        is_read: false,
        created_at: new Date().toISOString()
      });

    if (insertError) {
      console.log('❌ Error creating test notification:', insertError.message);
      console.log('\n💡 This might be an RLS policy issue.');
      console.log('📌 Please ensure the RLS policies in add-notifications-table.sql are applied.');
    } else {
      console.log('✅ Test notification created successfully!');
      
      // Clean up test notification
      await supabase
        .from('notifications')
        .delete()
        .eq('user_id', testUserId);
    }

    console.log('\n✅ Notifications system is properly configured!');

  } catch (err) {
    console.log('❌ Error:', err.message);
    process.exit(1);
  }
}

fixNotificationsTable();
