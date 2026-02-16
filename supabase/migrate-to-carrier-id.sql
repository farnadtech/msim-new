-- مهاجرت کامل به استفاده از carrier_id به جای carrier text
-- این فایل باید در Supabase SQL Editor اجرا شود

-- مرحله 1: اضافه کردن ستون carrier_id
ALTER TABLE sim_cards 
ADD COLUMN IF NOT EXISTS carrier_id INTEGER;

-- مرحله 2: پر کردن carrier_id بر اساس مقادیر فعلی carrier
-- این کار را برای تمام رکوردها انجام می‌دهیم
UPDATE sim_cards 
SET carrier_id = (
    SELECT id FROM carriers WHERE name_fa = sim_cards.carrier
)
WHERE carrier_id IS NULL;

-- مرحله 3: بررسی اینکه آیا همه رکوردها carrier_id دارند
SELECT 
    COUNT(*) as total_records,
    COUNT(carrier_id) as records_with_carrier_id,
    COUNT(*) - COUNT(carrier_id) as records_without_carrier_id
FROM sim_cards;

-- اگر رکوردی بدون carrier_id وجود داشت، آن‌ها را نمایش بده
SELECT id, number, carrier, carrier_id
FROM sim_cards
WHERE carrier_id IS NULL;

-- مرحله 4: اضافه کردن Foreign Key constraint
ALTER TABLE sim_cards
ADD CONSTRAINT fk_sim_cards_carrier
FOREIGN KEY (carrier_id) REFERENCES carriers(id)
ON DELETE RESTRICT
ON UPDATE CASCADE;

-- مرحله 5: حذف constraint قدیمی carrier (اگر وجود دارد)
ALTER TABLE sim_cards
DROP CONSTRAINT IF EXISTS sim_cards_carrier_check;

-- مرحله 6: تغییر نام ستون قدیمی به carrier_old (برای backup)
ALTER TABLE sim_cards
RENAME COLUMN carrier TO carrier_old;

-- مرحله 7: تغییر نام carrier_id به carrier
ALTER TABLE sim_cards
RENAME COLUMN carrier_id TO carrier;

-- مرحله 8: اضافه کردن NOT NULL constraint
ALTER TABLE sim_cards
ALTER COLUMN carrier SET NOT NULL;

-- مرحله 9: ایجاد index برای جستجوی سریع‌تر
CREATE INDEX IF NOT EXISTS idx_sim_cards_carrier ON sim_cards(carrier);

-- مرحله 10: ایجاد VIEW برای سهولت کار
CREATE OR REPLACE VIEW sim_cards_with_carrier AS
SELECT 
    sc.*,
    c.name as carrier_name,
    c.name_fa as carrier_name_fa,
    c.display_order as carrier_display_order
FROM sim_cards sc
LEFT JOIN carriers c ON sc.carrier = c.id;

-- مرحله 11: نمایش نتیجه
SELECT 
    sc.id,
    sc.number,
    sc.carrier as carrier_id,
    c.name as carrier_name,
    c.name_fa as carrier_name_fa,
    sc.carrier_old as old_carrier_value
FROM sim_cards sc
LEFT JOIN carriers c ON sc.carrier = c.id
LIMIT 10;

-- مرحله 12: بعد از اطمینان از صحت داده‌ها، می‌توانید ستون قدیمی را حذف کنید
-- ALTER TABLE sim_cards DROP COLUMN IF EXISTS carrier_old;
