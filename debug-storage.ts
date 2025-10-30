import { supabase } from './services/supabase';

async function debugStorage() {
  try {
    console.log('Checking available buckets...');
    
    // List all buckets
    const { data: buckets, error: bucketError } = await supabase.storage.listBuckets();
    
    if (bucketError) {
      console.error('Error listing buckets:', bucketError);
      return;
    }
    
    console.log('Available buckets:', buckets);
    
    // Check if payment-receipts bucket exists
    const paymentReceiptsBucket = buckets?.find(bucket => bucket.name === 'payment-receipts');
    
    if (!paymentReceiptsBucket) {
      console.log('payment-receipts bucket not found, attempting to create it...');
      
      // Try to create the bucket
      const { data: createData, error: createError } = await supabase.storage.createBucket('payment-receipts', {
        public: true
      });
      
      if (createError) {
        console.error('Failed to create payment-receipts bucket:', createError);
        return;
      }
      
      console.log('Successfully created payment-receipts bucket:', createData);
    } else {
      console.log('payment-receipts bucket found:', paymentReceiptsBucket);
    }
    
    // Try to upload a simple test file
    const testContent = 'This is a test file for storage verification';
    const file = new File([testContent], 'test.txt', { type: 'text/plain' });
    
    console.log('Attempting to upload test file...');
    
    const fileName = `test/${Date.now()}.txt`;
    const { data, error } = await supabase.storage
      .from('payment-receipts')
      .upload(fileName, file);
      
    if (error) {
      console.error('Upload failed:', error);
      return;
    }
    
    console.log('Upload successful:', data);
    
    // Try to get the public URL
    const { data: urlData } = supabase.storage
      .from('payment-receipts')
      .getPublicUrl(fileName);
      
    console.log('Public URL:', urlData.publicUrl);
    
  } catch (error) {
    console.error('Debug storage failed:', error);
  }
}

debugStorage();