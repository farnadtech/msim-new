-- جدول احراز هویت کاربران (KYC - Know Your Customer)
CREATE TABLE IF NOT EXISTS kyc_verifications (
    id BIGSERIAL PRIMARY KEY,
    user_id UUID NOT NULL REFERENCES users(id) ON DELETE CASCADE UNIQUE,
    
    -- اطلاعات شخصی
    full_name TEXT NOT NULL,
    national_code TEXT NOT NULL UNIQUE,
    birth_date DATE,
    phone_number TEXT NOT NULL,
    
    -- آدرس
    address TEXT,
    city TEXT,
    postal_code TEXT,
    
    -- مدارک
    national_card_front_url TEXT, -- عکس روی کارت ملی
    national_card_back_url TEXT,  -- عکس پشت کارت ملی
    selfie_with_card_url TEXT,    -- سلفی با کارت ملی
    
    -- وضعیت تایید
    status TEXT DEFAULT 'pending' CHECK (status IN ('pending', 'approved', 'rejected')),
    
    -- اطلاعات تایید/رد
    reviewed_by UUID REFERENCES users(id), -- ادمینی که بررسی کرده
    reviewed_at TIMESTAMP,
    rejection_reason TEXT, -- دلیل رد درخواست
    admin_notes TEXT,      -- یادداشت‌های ادمین
    
    -- تاریخچه
    created_at TIMESTAMP DEFAULT NOW(),
    updated_at TIMESTAMP DEFAULT NOW(),
    submitted_at TIMESTAMP -- زمان ارسال نهایی توسط کاربر
);

-- ایندکس‌ها برای جستجوی سریع‌تر
CREATE INDEX IF NOT EXISTS idx_kyc_user_id ON kyc_verifications(user_id);
CREATE INDEX IF NOT EXISTS idx_kyc_status ON kyc_verifications(status);
CREATE INDEX IF NOT EXISTS idx_kyc_national_code ON kyc_verifications(national_code);

-- فعال‌سازی RLS
ALTER TABLE kyc_verifications ENABLE ROW LEVEL SECURITY;

-- حذف پالیسی‌های قبلی
DROP POLICY IF EXISTS "Users can view their own KYC" ON kyc_verifications;
DROP POLICY IF EXISTS "Users can insert their own KYC" ON kyc_verifications;
DROP POLICY IF EXISTS "Users can update their own pending KYC" ON kyc_verifications;
DROP POLICY IF EXISTS "Admins can view all KYC" ON kyc_verifications;
DROP POLICY IF EXISTS "Admins can update all KYC" ON kyc_verifications;

-- کاربران می‌توانند احراز هویت خود را ببینند
CREATE POLICY "Users can view their own KYC"
    ON kyc_verifications FOR SELECT
    USING (auth.uid() = user_id);

-- کاربران می‌توانند احراز هویت خود را ایجاد کنند
CREATE POLICY "Users can insert their own KYC"
    ON kyc_verifications FOR INSERT
    WITH CHECK (auth.uid() = user_id);

-- کاربران می‌توانند احراز هویت در حال بررسی خود را ویرایش کنند
CREATE POLICY "Users can update their own pending KYC"
    ON kyc_verifications FOR UPDATE
    USING (auth.uid() = user_id AND status = 'pending')
    WITH CHECK (auth.uid() = user_id AND status = 'pending');

-- ادمین‌ها می‌توانند همه احراز هویت‌ها را ببینند
CREATE POLICY "Admins can view all KYC"
    ON kyc_verifications FOR SELECT
    USING (
        auth.uid() IN (
            SELECT id FROM users WHERE role = 'admin'
        )
    );

-- ادمین‌ها می‌توانند همه احراز هویت‌ها را به‌روزرسانی کنند
CREATE POLICY "Admins can update all KYC"
    ON kyc_verifications FOR UPDATE
    USING (
        auth.uid() IN (
            SELECT id FROM users WHERE role = 'admin'
        )
    );

-- افزودن فیلد is_verified به جدول users
ALTER TABLE users ADD COLUMN IF NOT EXISTS is_verified BOOLEAN DEFAULT FALSE;
ALTER TABLE users ADD COLUMN IF NOT EXISTS kyc_submitted_at TIMESTAMP;

-- ایندکس برای جستجوی سریع‌تر
CREATE INDEX IF NOT EXISTS idx_users_is_verified ON users(is_verified);

COMMENT ON TABLE kyc_verifications IS 'جدول احراز هویت کاربران - کاربران باید قبل از استفاده از امکانات سایت احراز هویت شوند';
COMMENT ON COLUMN kyc_verifications.status IS 'وضعیت: pending (در انتظار بررسی), approved (تایید شده), rejected (رد شده)';
COMMENT ON COLUMN users.is_verified IS 'آیا کاربر احراز هویت شده است؟';
