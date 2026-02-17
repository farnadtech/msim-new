-- بررسی KYC خریدار سفارش 2428

-- 1. پیدا کردن buyer_id از سفارش 2428
SELECT 
    id,
    buyer_id,
    buyer_name
FROM activation_requests
WHERE purchase_order_id = 2428;

-- 2. بررسی KYC این خریدار (با buyer_id از کوئری بالا)
-- فرض: buyer_id = '5f4488db-9bed-4162-8925-d187f8bb423d'
SELECT 
    id,
    user_id,
    status,
    national_card_front_url,
    national_card_back_url,
    created_at,
    updated_at
FROM kyc_verification
WHERE user_id = '5f4488db-9bed-4162-8925-d187f8bb423d';

-- 3. بررسی همه KYC ها
SELECT 
    id,
    user_id,
    status,
    national_card_front_url IS NOT NULL as has_front,
    national_card_back_url IS NOT NULL as has_back,
    created_at
FROM kyc_verification
ORDER BY created_at DESC
LIMIT 10;
