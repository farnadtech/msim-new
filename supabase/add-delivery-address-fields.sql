-- اضافه کردن فیلدهای آدرس به جدول activation_requests

-- اضافه کردن ستون‌های جدید
ALTER TABLE activation_requests
ADD COLUMN IF NOT EXISTS delivery_method VARCHAR(50) DEFAULT 'activation_code',
ADD COLUMN IF NOT EXISTS delivery_address TEXT,
ADD COLUMN IF NOT EXISTS delivery_city VARCHAR(100),
ADD COLUMN IF NOT EXISTS delivery_postal_code VARCHAR(20),
ADD COLUMN IF NOT EXISTS buyer_phone VARCHAR(20);

-- کامنت برای توضیح فیلدها
COMMENT ON COLUMN activation_requests.delivery_method IS 'نحوه تحویل: activation_code یا physical_delivery';
COMMENT ON COLUMN activation_requests.delivery_address IS 'آدرس کامل برای تحویل فیزیکی';
COMMENT ON COLUMN activation_requests.delivery_city IS 'شهر';
COMMENT ON COLUMN activation_requests.delivery_postal_code IS 'کد پستی';
COMMENT ON COLUMN activation_requests.buyer_phone IS 'شماره تماس خریدار';
