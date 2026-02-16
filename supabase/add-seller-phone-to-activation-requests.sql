-- اضافه کردن شماره تماس فروشنده به جدول activation_requests

ALTER TABLE activation_requests
ADD COLUMN IF NOT EXISTS seller_phone VARCHAR(20);

COMMENT ON COLUMN activation_requests.seller_phone IS 'شماره تماس فروشنده';
