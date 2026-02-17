-- ========================================
-- ایجاد درخواست KYC تستی
-- ========================================

-- مرحله 1: پیدا کردن یک کاربر غیر ادمین
DO $$
DECLARE
    test_user_id UUID;
BEGIN
    -- پیدا کردن اولین کاربر غیر ادمین
    SELECT id INTO test_user_id
    FROM users
    WHERE role != 'admin'
    LIMIT 1;

    -- اگر کاربری پیدا نشد، یک کاربر تستی بساز
    IF test_user_id IS NULL THEN
        INSERT INTO users (id, phone_number, role, is_verified, wallet_balance)
        VALUES (
            gen_random_uuid(),
            '09123456789',
            'buyer',
            false,
            0
        )
        RETURNING id INTO test_user_id;
        
        RAISE NOTICE 'کاربر تستی جدید ایجاد شد: %', test_user_id;
    ELSE
        RAISE NOTICE 'کاربر موجود استفاده می‌شود: %', test_user_id;
    END IF;

    -- حذف KYC قبلی این کاربر (اگر وجود دارد)
    DELETE FROM kyc_verifications WHERE user_id = test_user_id;

    -- ایجاد درخواست KYC تستی
    INSERT INTO kyc_verifications (
        user_id,
        full_name,
        national_code,
        birth_date,
        phone_number,
        address,
        city,
        postal_code,
        national_card_front_url,
        national_card_back_url,
        status,
        submitted_at,
        created_at,
        updated_at
    ) VALUES (
        test_user_id,
        'علی احمدی تستی',
        '1234567890',
        '1990-05-15',
        '09123456789',
        'تهران، خیابان آزادی، پلاک 123',
        'تهران',
        '1234567890',
        'https://via.placeholder.com/300x200?text=Front+ID',
        'https://via.placeholder.com/300x200?text=Back+ID',
        'pending',
        NOW(),
        NOW(),
        NOW()
    );

    -- به‌روزرسانی kyc_submitted_at
    UPDATE users 
    SET kyc_submitted_at = NOW()
    WHERE id = test_user_id;

    RAISE NOTICE 'درخواست KYC تستی ایجاد شد';
END $$;

-- بررسی نتیجه
SELECT 
    'KYC Records' as info,
    COUNT(*) as total,
    COUNT(CASE WHEN status = 'pending' THEN 1 END) as pending,
    COUNT(CASE WHEN status = 'approved' THEN 1 END) as approved,
    COUNT(CASE WHEN status = 'rejected' THEN 1 END) as rejected
FROM kyc_verifications;

-- نمایش آخرین درخواست
SELECT 
    id,
    user_id,
    full_name,
    national_code,
    status,
    created_at
FROM kyc_verifications
ORDER BY created_at DESC
LIMIT 1;
