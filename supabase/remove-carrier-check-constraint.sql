-- حذف CHECK constraint قدیمی از جدول sim_cards
-- این constraint فقط اجازه می‌داد سه اپراتور ثابت ثبت شوند

-- حذف constraint
ALTER TABLE sim_cards
DROP CONSTRAINT IF EXISTS sim_cards_carrier_check;

-- حالا می‌توانید هر اپراتوری را ثبت کنید
-- نمایش ساختار جدول
SELECT 
    conname AS constraint_name,
    contype AS constraint_type
FROM pg_constraint
WHERE conrelid = 'sim_cards'::regclass
AND conname LIKE '%carrier%';
