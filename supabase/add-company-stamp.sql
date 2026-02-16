-- Add company stamp storage
-- This will store the company stamp image that appears on all invoices

-- Create a new setting for company stamp URL
INSERT INTO site_settings (setting_key, setting_value, setting_type, category, description)
VALUES ('company_stamp_url', '', 'string', 'general', 'آدرس تصویر مهر شرکت (برای نمایش در فاکتورها)')
ON CONFLICT (setting_key) DO NOTHING;

-- Enable storage for company assets if not already enabled
INSERT INTO storage.buckets (id, name, public)
VALUES ('company-assets', 'company-assets', true)
ON CONFLICT (id) DO NOTHING;

-- Set up RLS policies for company assets bucket
CREATE POLICY "Public can view company assets"
ON storage.objects FOR SELECT
USING (bucket_id = 'company-assets');

CREATE POLICY "Admins can upload company assets"
ON storage.objects FOR INSERT
WITH CHECK (
    bucket_id = 'company-assets' 
    AND auth.uid() IN (SELECT id FROM users WHERE role = 'admin')
);

CREATE POLICY "Admins can update company assets"
ON storage.objects FOR UPDATE
USING (
    bucket_id = 'company-assets' 
    AND auth.uid() IN (SELECT id FROM users WHERE role = 'admin')
);

CREATE POLICY "Admins can delete company assets"
ON storage.objects FOR DELETE
USING (
    bucket_id = 'company-assets' 
    AND auth.uid() IN (SELECT id FROM users WHERE role = 'admin')
);
