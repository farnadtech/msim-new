-- تریگر خودکار برای ثبت تراکنش‌ها وقتی سفارش تکمیل میشه

-- تابع برای ثبت تراکنش‌های خودکار
CREATE OR REPLACE FUNCTION auto_create_transactions_on_order_complete()
RETURNS TRIGGER AS $$
DECLARE
    sim_info RECORD;
    line_type_text TEXT;
BEGIN
    -- فقط وقتی وضعیت به completed تغییر کنه
    IF NEW.status = 'completed' AND (OLD.status IS NULL OR OLD.status != 'completed') THEN
        
        -- دریافت اطلاعات سیم‌کارت
        SELECT number, is_active INTO sim_info
        FROM sim_cards
        WHERE id = NEW.sim_card_id;
        
        -- تشخیص نوع خط
        line_type_text := CASE 
            WHEN NEW.line_type = 'inactive' THEN 'صفر'
            ELSE 'فعال'
        END;
        
        -- بررسی اینکه تراکنش فروشنده وجود نداره
        IF NOT EXISTS (
            SELECT 1 FROM transactions
            WHERE user_id = NEW.seller_id
              AND type = 'sale'
              AND description LIKE '%سفارش #' || NEW.id || '%'
        ) THEN
            -- ثبت تراکنش فروشنده
            INSERT INTO transactions (user_id, type, amount, description, date)
            VALUES (
                NEW.seller_id,
                'sale',
                NEW.seller_received_amount,
                'فروش سیمکارت ' || line_type_text || ' ' || COALESCE(sim_info.number, 'نامشخص') || ' (سفارش #' || NEW.id || ')',
                NOW()
            );
            
            RAISE NOTICE 'تراکنش فروشنده برای سفارش % ثبت شد', NEW.id;
        END IF;
        
        -- بررسی اینکه تراکنش خریدار وجود نداره
        IF NOT EXISTS (
            SELECT 1 FROM transactions
            WHERE user_id = NEW.buyer_id
              AND type = 'purchase'
              AND description LIKE '%سفارش #' || NEW.id || '%'
        ) THEN
            -- ثبت تراکنش خریدار
            INSERT INTO transactions (user_id, type, amount, description, date)
            VALUES (
                NEW.buyer_id,
                'purchase',
                -NEW.price,
                'خرید سیمکارت ' || line_type_text || ' ' || COALESCE(sim_info.number, 'نامشخص') || ' (سفارش #' || NEW.id || ')',
                NOW()
            );
            
            RAISE NOTICE 'تراکنش خریدار برای سفارش % ثبت شد', NEW.id;
        END IF;
        
    END IF;
    
    RETURN NEW;
END;
$$ LANGUAGE plpgsql;

-- حذف تریگر قبلی اگه وجود داشته باشه
DROP TRIGGER IF EXISTS trigger_auto_create_transactions ON purchase_orders;

-- ایجاد تریگر
CREATE TRIGGER trigger_auto_create_transactions
    AFTER UPDATE ON purchase_orders
    FOR EACH ROW
    EXECUTE FUNCTION auto_create_transactions_on_order_complete();

-- تست تریگر با یه سفارش موجود
COMMENT ON FUNCTION auto_create_transactions_on_order_complete() IS 'تریگر خودکار برای ثبت تراکنش‌ها وقتی سفارش به completed تغییر وضعیت میده';
