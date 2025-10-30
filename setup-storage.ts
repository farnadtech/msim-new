import { supabase } from './services/supabase';

async function setupStorage() {
  try {
    console.log('Setting up storage...');
    
    // First, try to create the bucket
    console.log('Creating payment-receipts bucket...');
    const { data: bucketData, error: bucketError } = await supabase.storage.createBucket('payment-receipts', {
      public: true
    });
    
    if (bucketError) {
      // If bucket already exists, that's fine
      if (bucketError.message.includes('already exists')) {
        console.log('Bucket already exists, continuing...');
      } else {
        console.error('Error creating bucket:', bucketError);
        return;
      }
    } else {
      console.log('Bucket created successfully:', bucketData);
    }
    
    console.log('Storage setup completed successfully!');
    
  } catch (error) {
    console.error('Storage setup failed:', error);
  }
}

setupStorage();