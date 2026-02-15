-- اضافه کردن ستون payment_method به جدول payment_receipts

-- بررسی اینکه آیا ستون وجود دارد یا نه
DO $$ 
BEGIN
    IF NOT EXISTS (
        SELECT 1 
        FROM information_schema.columns 
        WHERE table_name = 'payment_receipts' 
        AND column_name = 'payment_method'
    ) THEN
        -- اضافه کردن ستون payment_method
        ALTER TABLE payment_receipts 
        ADD COLUMN payment_method TEXT;
        
        -- اضافه کردن کامنت برای توضیح
        COMMENT ON COLUMN payment_receipts.payment_method IS 'روش پرداخت: card, zarinpal, zibal';
        
        RAISE NOTICE 'Column payment_method added successfully';
    ELSE
        RAISE NOTICE 'Column payment_method already exists';
    END IF;
END $$;
