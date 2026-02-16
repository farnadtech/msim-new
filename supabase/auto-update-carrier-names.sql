-- ایجاد trigger برای به‌روزرسانی خودکار نام اپراتور در sim_cards
-- وقتی نام فارسی اپراتور تغییر می‌کند، تمام سیمکارت‌های آن اپراتور به‌روز می‌شوند

-- مرحله 1: حذف constraint قدیمی
ALTER TABLE sim_cards
DROP CONSTRAINT IF EXISTS sim_cards_carrier_check;

-- مرحله 2: ایجاد function برای به‌روزرسانی
CREATE OR REPLACE FUNCTION update_sim_cards_carrier_name()
RETURNS TRIGGER AS $$
BEGIN
    -- اگر name_fa تغییر کرده باشد
    IF OLD.name_fa IS DISTINCT FROM NEW.name_fa THEN
        -- تمام sim_cards با نام قدیمی را به نام جدید تغییر بده
        UPDATE sim_cards
        SET carrier = NEW.name_fa
        WHERE carrier = OLD.name_fa;
        
        RAISE NOTICE 'Updated % sim cards from carrier "%" to "%"', 
            (SELECT COUNT(*) FROM sim_cards WHERE carrier = NEW.name_fa),
            OLD.name_fa, 
            NEW.name_fa;
    END IF;
    
    RETURN NEW;
END;
$$ LANGUAGE plpgsql;

-- مرحله 3: ایجاد trigger
DROP TRIGGER IF EXISTS trigger_update_sim_cards_carrier ON carriers;

CREATE TRIGGER trigger_update_sim_cards_carrier
AFTER UPDATE ON carriers
FOR EACH ROW
WHEN (OLD.name_fa IS DISTINCT FROM NEW.name_fa)
EXECUTE FUNCTION update_sim_cards_carrier_name();

-- مرحله 4: تست - نمایش تعداد سیمکارت‌ها به تفکیک اپراتور
SELECT 
    c.id,
    c.name,
    c.name_fa,
    c.display_order,
    COUNT(sc.id) as sim_count
FROM carriers c
LEFT JOIN sim_cards sc ON sc.carrier = c.name_fa
GROUP BY c.id, c.name, c.name_fa, c.display_order
ORDER BY c.display_order;

-- نکته: حالا می‌توانید نام فارسی اپراتور را تغییر دهید
-- و تمام سیمکارت‌های آن اپراتور به صورت خودکار به‌روز می‌شوند
