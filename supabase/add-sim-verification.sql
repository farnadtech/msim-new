-- جدول احراز هویت سیم‌کارت‌های فعال
CREATE TABLE IF NOT EXISTS sim_verification_codes (
    id BIGSERIAL PRIMARY KEY,
    sim_number TEXT NOT NULL,
    seller_id UUID NOT NULL REFERENCES auth.users(id) ON DELETE CASCADE,
    verification_code TEXT NOT NULL,
    expires_at TIMESTAMPTZ NOT NULL,
    is_verified BOOLEAN DEFAULT FALSE,
    verified_at TIMESTAMPTZ,
    created_at TIMESTAMPTZ DEFAULT NOW()
);

-- ایندکس برای جستجوی سریع
CREATE INDEX IF NOT EXISTS idx_sim_verification_sim_number ON sim_verification_codes(sim_number);
CREATE INDEX IF NOT EXISTS idx_sim_verification_seller_id ON sim_verification_codes(seller_id);
CREATE INDEX IF NOT EXISTS idx_sim_verification_expires_at ON sim_verification_codes(expires_at);

-- غیرفعال کردن RLS برای سادگی
ALTER TABLE sim_verification_codes DISABLE ROW LEVEL SECURITY;

-- حذف تمام پالیسی‌های قبلی
DROP POLICY IF EXISTS "Sellers can view their own verification codes" ON sim_verification_codes;
DROP POLICY IF EXISTS "Sellers can insert verification codes" ON sim_verification_codes;
DROP POLICY IF EXISTS "Sellers can update their own verification codes" ON sim_verification_codes;
