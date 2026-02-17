-- ایجاد یک درخواست KYC تستی

-- ابتدا یک کاربر تستی پیدا کنید (غیر از ادمین)
-- این کوئری کاربران غیر ادمین را نشان می‌دهد
SELECT id, phone_number, role, is_verified 
FROM users 
WHERE role != 'admin' 
LIMIT 5;

-- حالا با استفاده از یکی از user_id های بالا، یک KYC تستی ایجاد کنید
-- USER_ID_HERE را با یکی از ID های بالا جایگزین کنید

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
    'USER_ID_HERE', -- این را با ID واقعی جایگزین کنید
    'علی احمدی',
    '1234567890',
    '1990-05-15',
    '09123456789',
    'تهران، خیابان آزادی، پلاک 123',
    'تهران',
    '1234567890',
    'https://example.com/front.jpg',
    'https://example.com/back.jpg',
    'pending',
    NOW(),
    NOW(),
    NOW()
);

-- به‌روزرسانی kyc_submitted_at برای کاربر
UPDATE users 
SET kyc_submitted_at = NOW()
WHERE id = 'USER_ID_HERE'; -- این را با ID واقعی جایگزین کنید

-- بررسی نتیجه
SELECT * FROM kyc_verifications ORDER BY created_at DESC LIMIT 1;
