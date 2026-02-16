-- حل مشکل RLS برای جدول sim_verification_codes

-- حذف پالیسی‌های قبلی
DROP POLICY IF EXISTS "Allow sellers to insert verification codes" ON sim_verification_codes;
DROP POLICY IF EXISTS "Allow sellers to read their verification codes" ON sim_verification_codes;
DROP POLICY IF EXISTS "Allow sellers to update their verification codes" ON sim_verification_codes;

-- اجازه insert برای فروشندگان
CREATE POLICY "Allow sellers to insert verification codes"
ON sim_verification_codes
FOR INSERT
TO authenticated
WITH CHECK (
    seller_id = auth.uid()
);

-- اجازه select برای فروشندگان
CREATE POLICY "Allow sellers to read their verification codes"
ON sim_verification_codes
FOR SELECT
TO authenticated
USING (
    seller_id = auth.uid()
);

-- اجازه update برای فروشندگان
CREATE POLICY "Allow sellers to update their verification codes"
ON sim_verification_codes
FOR UPDATE
TO authenticated
USING (
    seller_id = auth.uid()
)
WITH CHECK (
    seller_id = auth.uid()
);
