-- ایجاد جدول اپراتورها (carriers)

CREATE TABLE IF NOT EXISTS carriers (
    id SERIAL PRIMARY KEY,
    name VARCHAR(100) NOT NULL UNIQUE,
    name_fa VARCHAR(100) NOT NULL,
    is_active BOOLEAN DEFAULT true,
    display_order INTEGER DEFAULT 0,
    created_at TIMESTAMP DEFAULT NOW(),
    updated_at TIMESTAMP DEFAULT NOW()
);

-- اضافه کردن اپراتورهای پیش‌فرض
INSERT INTO carriers (name, name_fa, is_active, display_order) VALUES
('irancell', 'ایرانسل', true, 1),
('mci', 'همراه اول', true, 2),
('rightel', 'رایتل', true, 3)
ON CONFLICT (name) DO NOTHING;

-- ایجاد index برای جستجوی سریع‌تر
CREATE INDEX IF NOT EXISTS idx_carriers_active ON carriers(is_active);
CREATE INDEX IF NOT EXISTS idx_carriers_order ON carriers(display_order);

-- غیرفعال کردن RLS برای جدول carriers
-- چون ادمین باید بتواند بدون محدودیت اپراتورها را مدیریت کند
ALTER TABLE carriers DISABLE ROW LEVEL SECURITY;

-- کامنت برای توضیح جدول
COMMENT ON TABLE carriers IS 'جدول اپراتورهای تلفن همراه';
COMMENT ON COLUMN carriers.name IS 'نام انگلیسی اپراتور (یکتا)';
COMMENT ON COLUMN carriers.name_fa IS 'نام فارسی اپراتور';
COMMENT ON COLUMN carriers.is_active IS 'وضعیت فعال/غیرفعال';
COMMENT ON COLUMN carriers.display_order IS 'ترتیب نمایش';
