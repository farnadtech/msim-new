-- مهاجرت فیلد carrier از TEXT به Foreign Key به جدول carriers
-- این فایل باید در Supabase SQL Editor اجرا شود

-- مرحله 1: اضافه کردن ستون جدید carrier_id
ALTER TABLE sim_cards 
ADD COLUMN IF NOT EXISTS carrier_id INTEGER;

-- مرحله 2: پر کردن carrier_id بر اساس مقادیر فعلی carrier
UPDATE sim_cards 
SET carrier_id = (
    SELECT id FROM carriers WHERE name_fa = sim_cards.carrier
)
WHERE carrier_id IS NULL;

-- مرحله 3: اضافه کردن Foreign Key constraint
ALTER TABLE sim_cards
ADD CONSTRAINT fk_sim_cards_carrier
FOREIGN KEY (carrier_id) REFERENCES carriers(id);

-- مرحله 4: حذف constraint قدیمی carrier
ALTER TABLE sim_cards
DROP CONSTRAINT IF EXISTS sim_cards_carrier_check;

-- مرحله 5: تغییر نام ستون قدیمی به carrier_old (برای backup)
ALTER TABLE sim_cards
RENAME COLUMN carrier TO carrier_old;

-- مرحله 6: تغییر نام carrier_id به carrier
ALTER TABLE sim_cards
RENAME COLUMN carrier_id TO carrier;

-- مرحله 7: اضافه کردن NOT NULL constraint
ALTER TABLE sim_cards
ALTER COLUMN carrier SET NOT NULL;

-- مرحله 8: ایجاد index برای جستجوی سریع‌تر
CREATE INDEX IF NOT EXISTS idx_sim_cards_carrier ON sim_cards(carrier);

-- نمایش نتیجه
SELECT 
    sc.id,
    sc.number,
    sc.carrier as carrier_id,
    c.name_fa as carrier_name,
    sc.carrier_old as old_carrier_value
FROM sim_cards sc
LEFT JOIN carriers c ON sc.carrier = c.id
LIMIT 10;
