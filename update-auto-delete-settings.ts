import { supabase } from './services/supabase';

/**
 * Update listing auto-delete settings to 1 day
 * This allows sold sim cards to be re-listed by sellers after 1 day
 */
async function updateAutoDeleteSettings() {
    console.log('🔧 Updating auto-delete settings...');
    
    try {
        // Update the setting to 1 day
        const { data, error } = await supabase
            .from('site_settings')
            .update({
                setting_value: '1',
                description: 'مدت زمان حذف خودکار آگهی‌های فروخته شده (1 روز بعد از فروش)',
                updated_at: new Date().toISOString()
            })
            .eq('setting_key', 'listing_auto_delete_days')
            .select();
        
        if (error) {
            console.error('❌ Error updating settings:', error);
            return;
        }
        
        console.log('✅ Settings updated successfully:', data);
        
        // Verify the update
        const { data: verifyData, error: verifyError } = await supabase
            .from('site_settings')
            .select('*')
            .eq('setting_key', 'listing_auto_delete_days')
            .single();
        
        if (verifyError) {
            console.error('❌ Error verifying settings:', verifyError);
            return;
        }
        
        console.log('📋 Current setting:', verifyData);
        console.log('');
        console.log('✅ تنظیمات با موفقیت به‌روزرسانی شد!');
        console.log('📌 آگهی‌های فروخته شده حالا بعد از 1 روز به صورت خودکار پاک می‌شوند');
        console.log('📌 فروشندگان می‌توانند شماره‌های فروخته شده را دوباره آگهی کنند');
        
    } catch (error) {
        console.error('❌ Unexpected error:', error);
    }
}

// Run the update
updateAutoDeleteSettings();
